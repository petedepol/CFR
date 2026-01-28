// JigPage.jsx - V3 Styled JIG Form
// Quick jig measurements per rider + bike type with history

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Wifi, WifiOff, Pencil, Trash2, AlertTriangle, X } from "lucide-react";
import { Drawer } from "vaul";
import { motion } from "motion/react";

import { useAuth } from "../../auth/AuthProvider.jsx";
import { useToast } from "../../../components/ToastProvider.jsx";
import { ensureSession, fetchLatestQuick, fetchQuickHistory, insertQuick, updateMeasurement, deleteMeasurement } from "../../measurements/api/measurementsApi";
import {
  getCachedJigLatest,
  getCachedJigHistory,
  getCachedJigMeta,
} from "../../../lib/offlineCache.js";
import { CachedDataBanner } from "../../../components/CachedDataBanner.jsx";

import { SpecSection } from "../components/SpecSection.jsx";
import { SpecField } from "../components/SpecField.jsx";

// Riders list (shared with other v3 pages)
const RIDERS = [
  { id: "ana", name: "Ana", image: "/riders/ana.jpeg" },
  { id: "charlie", name: "Charlie", image: "/riders/charlie.jpeg" },
  { id: "cole", name: "Cole", image: "/riders/cole.jpeg" },
  { id: "luca", name: "Luca", image: "/riders/luca.jpeg" },
  { id: "jolanda", name: "Jolanda", image: "/riders/jolanda.jpeg" },
];

const BIKE_TYPES = [
  { id: "race", label: "Race", apiType: "quick_race" },
  { id: "training", label: "Train", apiType: "quick_training" },
  { id: "ebike", label: "E-Bike", apiType: "quick_ebike" },
  { id: "road", label: "Road", apiType: "quick_road" },
  { id: "cx", label: "CX", apiType: "quick_cx" },
];

const WARN_THRESHOLD_MM = 4;

// ----- Utility functions -----
function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmtNum(v) {
  if (v === null || v === undefined) return "—";
  return String(v);
}

function fmtSigned(n) {
  if (n === null || n === undefined) return "—";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n}`;
}

function diff(v, b) {
  if (v === null || b === null) return null;
  return +((v - b).toFixed(1));
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

function formatDateShort(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

// Rolling baseline: average of up to 3 older entries
function rollingBaselineForIndex(rowsNewestFirst, index) {
  const older = [];
  for (let i = index + 1; i < rowsNewestFirst.length && older.length < 3; i++) {
    const r = rowsNewestFirst[i];
    const sb = toNum(r.saddle_setback);
    const h4 = toNum(r.height_4cm);
    const h15 = toNum(r.height_15cm);
    if (sb === null && h4 === null && h15 === null) continue;
    older.push({ sb, h4, h15 });
  }
  if (older.length === 0) return null;

  const avg = (key) => {
    const vals = older.map((x) => x[key]).filter((n) => n !== null);
    if (!vals.length) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return +((sum / vals.length).toFixed(1));
  };

  return { sb: avg("sb"), h4: avg("h4"), h15: avg("h15") };
}

// ----- Draft persistence -----
const DRAFT_PREFIX = "cfr_v3_jig_draft__";
function draftKey(rider, bikeType) {
  return `${DRAFT_PREFIX}${encodeURIComponent(rider || "")}__${bikeType || "race"}`;
}
function readDraft(rider, bikeType) {
  if (!rider) return null;
  try {
    const raw = localStorage.getItem(draftKey(rider, bikeType));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.form) return null;
    return { at: Number(parsed.at || 0), form: parsed.form };
  } catch {
    return null;
  }
}
function writeDraft(rider, bikeType, form) {
  if (!rider) return;
  try {
    localStorage.setItem(draftKey(rider, bikeType), JSON.stringify({ at: Date.now(), form }));
  } catch {}
}
function clearDraft(rider, bikeType) {
  if (!rider) return;
  try {
    localStorage.removeItem(draftKey(rider, bikeType));
  } catch {}
}

// ----- Main Component -----
export default function JigPage() {
  const navigate = useNavigate();
  const [params, setSearchParams] = useSearchParams();
  const { displayName, isAdmin } = useAuth();
  const toast = useToast();

  const rider = params.get("rider") || "";
  const bikeType = (() => {
    const bt = String(params.get("bike") || "race").toLowerCase();
    return ["race", "training", "ebike", "road", "cx"].includes(bt) ? bt : "race";
  })();
  const mechanic = displayName || "";

  // Get API bike type
  const apiBikeType = BIKE_TYPES.find((bt) => bt.id === bikeType)?.apiType || "quick_race";

  // Rider picker state
  const [riderPickerOpen, setRiderPickerOpen] = useState(false);

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  const [form, setForm] = useState({
    saddleSetback: "",
    height4cm: "",
    height15cm: "",
    location: "",
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);

  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Offline cache state
  const [showingCached, setShowingCached] = useState(false);

  // Warning modal for significant changes
  const [warnOpen, setWarnOpen] = useState(false);
  const [warnInfo, setWarnInfo] = useState(null);
  const pendingPayloadRef = useRef(null);

  const lastLoadedRef = useRef(null);
  const lastSaveRef = useRef({ at: 0, sig: "" });
  const canSave = useMemo(() => mechanic && rider, [mechanic, rider]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // Load data on mount
  async function load(currentApiBikeType, { silent = false, keepEdits = false, forceRefresh = false } = {}) {
    if (!rider) return;
    if (!silent) setLoading(true);

    try {
      await ensureSession();
      const latest = await fetchLatestQuick(rider, currentApiBikeType);
      const latestAt = latest?.timestamp ? new Date(latest.timestamp).getTime() : 0;

      lastLoadedRef.current = latest || null;
      setShowingCached(false); // Fresh data from server

      if (keepEdits && dirtyRef.current) return;

      const draft = readDraft(rider, bikeType);
      const draftAt = draft?.at || 0;

      if (draft?.form && draftAt > latestAt) {
        setForm(draft.form);
        setDirty(true);
      } else if (latest) {
        setForm({
          saddleSetback: latest.saddle_setback ?? "",
          height4cm: latest.height_4cm ?? "",
          height15cm: latest.height_15cm ?? "",
          location: latest.location ?? "",
          notes: latest.notes ?? "",
        });
        setDirty(false);
        clearDraft(rider, bikeType);
      } else {
        setForm({ saddleSetback: "", height4cm: "", height15cm: "", location: "", notes: "" });
        setDirty(false);
        clearDraft(rider, bikeType);
      }
    } catch (e) {
      // OFFLINE FALLBACK: Use cached data
      const isOffline = e?.code === "OFFLINE" || (typeof navigator !== "undefined" && navigator.onLine === false);
      if (isOffline) {
        const cachedLatest = getCachedJigLatest(rider, bikeType);

        if (cachedLatest && !dirtyRef.current) {
          lastLoadedRef.current = cachedLatest;
          setForm({
            saddleSetback: cachedLatest.saddle_setback ?? "",
            height4cm: cachedLatest.height_4cm ?? "",
            height15cm: cachedLatest.height_15cm ?? "",
            location: cachedLatest.location ?? "",
            notes: cachedLatest.notes ?? "",
          });
          setDirty(false);
          setShowingCached(true);
          // Don't show error toast - we have cached data
        } else if (!dirtyRef.current) {
          // No cache, show error
          toast.error("Offline and no cached data available");
        }
      } else {
        toast.error(e.message || "Failed to load JIG data");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadHistory(currentApiBikeType, { silent = false } = {}) {
    if (!rider) return;
    if (!silent) setHistoryLoading(true);

    try {
      await ensureSession();
      const rows = await fetchQuickHistory(rider, currentApiBikeType, 20);
      setHistoryRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      // OFFLINE FALLBACK: Use cached history
      const isOffline = e?.code === "OFFLINE" || (typeof navigator !== "undefined" && navigator.onLine === false);
      if (isOffline) {
        const cachedHistory = getCachedJigHistory(rider, bikeType);
        if (cachedHistory && cachedHistory.length > 0) {
          setHistoryRows(cachedHistory);
        }
      }
      // History is non-critical, don't show error
    } finally {
      if (!silent) setHistoryLoading(false);
    }
  }

  useEffect(() => {
    load(apiBikeType);
    loadHistory(apiBikeType);

    const onVis = () => {
      if (document.visibilityState === "visible") {
        load(apiBikeType, { silent: true, keepEdits: true });
        loadHistory(apiBikeType, { silent: true });
      }
    };
    const onOnline = () => {
      load(apiBikeType, { silent: true, keepEdits: true });
      loadHistory(apiBikeType, { silent: true });
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rider, bikeType, apiBikeType]);

  // Auto-save draft
  useEffect(() => {
    if (!rider || !dirty) return;
    const t = setTimeout(() => writeDraft(rider, bikeType, form), 250);
    return () => clearTimeout(t);
  }, [rider, bikeType, form, dirty]);

  function setField(key, value) {
    setDirty(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function cancelEdit() {
    setEditingId(null);
    setDirty(false);
    load(apiBikeType, { silent: true, keepEdits: false });
  }

  async function adminDeleteRow(row) {
    if (!isAdmin || !row?.id) return;
    if (offline) {
      toast.error("Admin deletes require being online");
      return;
    }
    const ok = window.confirm("Delete this entry? This cannot be undone.");
    if (!ok) return;
    try {
      setSavingAdmin(true);
      await deleteMeasurement(row.id);
      if (editingId === row.id) cancelEdit();
      await loadHistory(apiBikeType, { silent: true });
      toast.success("Deleted");
    } catch (e) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setSavingAdmin(false);
    }
  }

  function startEditFromRow(row) {
    if (!isAdmin || !row?.id) return;
    setForm({
      saddleSetback: row.saddle_setback ?? "",
      height4cm: row.height_4cm ?? "",
      height15cm: row.height_15cm ?? "",
      location: row.location ?? "",
      notes: row.notes ?? "",
    });
    setDirty(true);
    setEditingId(row.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function computeDeviationWarning(payload) {
    const prev = lastLoadedRef.current;
    if (!prev) return null;

    const prevSB = toNum(prev.saddle_setback);
    const prev4 = toNum(prev.height_4cm);
    const prev15 = toNum(prev.height_15cm);

    const nextSB = toNum(payload.saddleSetback);
    const next4 = toNum(payload.height4cm);
    const next15 = toNum(payload.height15cm);

    const mkDiff = (label, key, prevVal, nextVal) => {
      if (prevVal === null || nextVal === null) return null;
      const d = +((nextVal - prevVal).toFixed(1));
      return { label, key, prev: prevVal, next: nextVal, diff: d };
    };

    const diffs = [
      mkDiff("Saddle Setback", "SB", prevSB, nextSB),
      mkDiff("Height @ 4cm", "4cm", prev4, next4),
      mkDiff("Height @ 15cm", "15cm", prev15, next15),
    ].filter(Boolean);

    const flagged = diffs.filter((d) => Math.abs(d.diff) >= WARN_THRESHOLD_MM);
    if (!flagged.length) return null;

    flagged.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

    return {
      prevWhen: prev.timestamp ? new Date(prev.timestamp) : null,
      flagged,
      threshold: WARN_THRESHOLD_MM,
    };
  }

  async function doSave(payload) {
    if (!canSave) {
      toast.error("Missing rider or mechanic");
      return;
    }

    const dedupeSig = JSON.stringify({
      rider: payload.rider,
      mechanic: payload.mechanic,
      bikeType: payload.bikeType,
      saddleSetback: payload.saddleSetback,
      height4cm: payload.height4cm,
      height15cm: payload.height15cm,
      notes: payload.notes,
      location: payload.location,
      editingId: editingId || "",
    });
    const now = Date.now();

    if (lastSaveRef.current.sig === dedupeSig && now - lastSaveRef.current.at < 1500) {
      toast.success("Already saved");
      return;
    }

    try {
      if (editingId && isAdmin) {
        setSavingAdmin(true);
        await updateMeasurement(editingId, {
          saddle_setback: payload.saddleSetback === "" ? null : Number(payload.saddleSetback),
          height_4cm: payload.height4cm === "" ? null : Number(payload.height4cm),
          height_15cm: payload.height15cm === "" ? null : Number(payload.height15cm),
          location: String(payload.location || ""),
          notes: String(payload.notes || ""),
          mechanic,
          timestamp: new Date().toISOString(),
        });
        lastSaveRef.current = { sig: dedupeSig, at: Date.now() };
        setDirty(false);
        clearDraft(rider, bikeType);
        setEditingId(null);
        toast.success("Updated");
        await load(apiBikeType, { silent: true, keepEdits: true });
        await loadHistory(apiBikeType, { silent: true });
        return;
      }

      const res = await insertQuick({
        rider: payload.rider,
        mechanic: payload.mechanic,
        bikeType: payload.bikeType,
        saddleSetback: payload.saddleSetback,
        height4cm: payload.height4cm,
        height15cm: payload.height15cm,
        notes: payload.notes,
        location: payload.location,
        dedupeSig,
      });
      lastSaveRef.current = { sig: dedupeSig, at: Date.now() };
      setDirty(false);
      clearDraft(rider, bikeType);

      if (res?.queued) {
        toast.success("Saved offline — will sync later");
      } else {
        toast.success("Saved");
        await load(apiBikeType, { silent: true, keepEdits: true });
        await loadHistory(apiBikeType, { silent: true });
      }
    } catch (e) {
      toast.error(`Save failed: ${e?.message || "unknown error"}`);
    } finally {
      setSavingAdmin(false);
    }
  }

  async function handleSave() {
    const payload = { rider, mechanic, bikeType: apiBikeType, ...form };

    // Check for significant deviations (skip if editing)
    if (!editingId) {
      const info = computeDeviationWarning(payload);
      if (info) {
        pendingPayloadRef.current = payload;
        setWarnInfo(info);
        setWarnOpen(true);
        return;
      }
    }

    await doSave(payload);
  }

  async function confirmSaveAnyway() {
    const payload = pendingPayloadRef.current;
    setWarnOpen(false);
    setWarnInfo(null);
    pendingPayloadRef.current = null;
    if (payload) await doSave(payload);
  }

  function cancelWarn() {
    setWarnOpen(false);
    setWarnInfo(null);
    pendingPayloadRef.current = null;
  }

  const bikeTypeLabel = BIKE_TYPES.find((bt) => bt.id === bikeType)?.label || bikeType;

  // Handle switching rider
  function switchRider(newRiderName) {
    if (newRiderName === rider) {
      setRiderPickerOpen(false);
      return;
    }
    setSearchParams({ rider: newRiderName, bike: bikeType });
    setRiderPickerOpen(false);
  }

  // Handle switching bike type
  function switchBikeType(newBikeType) {
    if (newBikeType === bikeType) return;
    setSearchParams({ rider, bike: newBikeType });
  }

  return (
    <div
      className="min-h-screen text-foreground font-sans selection:bg-orange-500/30"
      style={{ background: "var(--background-gradient, var(--background))" }}
    >
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="mb-6">
          {/* Top row: Back button + Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/v3")}
                className="p-2 rounded-full bg-foreground/5 text-foreground/60 active:scale-95 transition"
              >
                <ArrowLeft size={20} />
              </button>
              <span className="text-xs font-semibold tracking-[0.15em] text-foreground/50 uppercase">JIG Update</span>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2">
              {offline ? (
                <WifiOff size={16} className="text-foreground/40" />
              ) : (
                <Wifi size={16} className="text-green-500" />
              )}
              {dirty && <div className="w-2 h-2 rounded-full bg-orange-500" />}
            </div>
          </div>

          {/* Rider + Bike Type Row - Glass Surface */}
          <div className="flex items-center justify-between rounded-[26px] p-3.5 bg-white/[0.62] dark:bg-white/[0.08] border border-black/10 dark:border-white/[0.10] backdrop-blur-[14px] shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
            {/* Rider Selector */}
            {(() => {
              const currentRider = RIDERS.find((r) => r.name === rider);
              return (
                <button
                  onClick={() => setRiderPickerOpen(true)}
                  className="flex items-center gap-3 active:scale-[0.98] transition"
                >
                  {/* Avatar with gradient ring */}
                  <div className="w-[54px] h-[54px] rounded-full p-0.5 bg-gradient-to-br from-orange-400/70 to-blue-400/50 shadow-[0_10px_26px_rgba(0,0,0,0.12)]">
                    <div className="w-full h-full rounded-full overflow-hidden">
                      {currentRider?.image ? (
                        <img src={currentRider.image} alt={rider} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center">
                          <span className="text-sm font-bold text-white">{rider?.[0] || "?"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Rider name */}
                  <span className="font-bold tracking-[0.10em] text-foreground/90">{rider?.toUpperCase()}</span>
                </button>
              );
            })()}

            {/* Bike Type Segmented Control - Glass Pill */}
            <div className="grid grid-flow-col gap-1 p-1 rounded-2xl bg-white/50 dark:bg-white/[0.06] border border-black/10 dark:border-white/[0.10]">
              {BIKE_TYPES.map((bt) => (
                <button
                  key={bt.id}
                  onClick={() => switchBikeType(bt.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    bikeType === bt.id
                      ? "bg-orange-500 text-white shadow-[0_8px_16px_rgba(255,106,0,0.25)]"
                      : "text-foreground/55 hover:text-foreground/70"
                  }`}
                >
                  {bt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status indicators */}
        {offline && (
          <div className="mb-4 px-4 py-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2">
            <WifiOff size={16} /> Offline — saves will queue
          </div>
        )}

        {showingCached && (
          <CachedDataBanner
            className="mb-4"
            fetchedAt={getCachedJigMeta(rider, bikeType)?.fetchedAt}
            onRefresh={() => {
              setShowingCached(false);
              load(apiBikeType, { forceRefresh: true });
              loadHistory(apiBikeType);
            }}
          />
        )}

        {editingId && (
          <div className="mb-4 px-4 py-3 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-blue-600 dark:text-blue-400 text-sm flex items-center justify-between">
            <span>Editing history entry</span>
            <button onClick={cancelEdit} className="text-xs font-semibold underline">
              Cancel
            </button>
          </div>
        )}

        {/* JIG Form */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-black/[0.02] dark:bg-white/[0.02] rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <SpecSection title="MEASUREMENTS" defaultOpen={true}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div
                  className="rounded-2xl p-3"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.45)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                  }}
                >
                  <SpecField
                    label="Saddle Setback (mm)"
                    value={form.saddleSetback}
                    onChange={(v) => setField("saddleSetback", v)}
                    placeholder="e.g. 45"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                  />
                </div>

                <div
                  className="rounded-2xl p-3"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.45)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                  }}
                >
                  <SpecField
                    label="Height at 4cm (mm)"
                    value={form.height4cm}
                    onChange={(v) => setField("height4cm", v)}
                    placeholder="e.g. 745"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                  />
                </div>

                <div
                  className="rounded-2xl p-3"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.45)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                  }}
                >
                  <SpecField
                    label="Height at 15cm (mm)"
                    value={form.height15cm}
                    onChange={(v) => setField("height15cm", v)}
                    placeholder="e.g. 750"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                  />
                </div>

                <div
                  className="rounded-2xl p-3"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.45)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                  }}
                >
                  <SpecField
                    label="Location"
                    value={form.location}
                    onChange={(v) => setField("location", v)}
                    placeholder="e.g. Team truck / Hotel"
                  />
                </div>

                <div
                  className="rounded-2xl p-3 md:col-span-2"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.45)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                  }}
                >
                  <SpecField
                    label="Notes"
                    value={form.notes}
                    onChange={(v) => setField("notes", v)}
                    placeholder="Any observations / changes..."
                    textarea
                    rows={3}
                    fullWidth
                  />
                </div>
              </div>
            </SpecSection>
          </motion.div>
        )}

        {/* History Section - Table Layout */}
        <div className="mt-8">
          <h2 className="text-xs font-semibold tracking-[0.15em] uppercase mb-4 font-sans dark:text-white/40" style={{ color: "#71717a" }}>
            Jig History
          </h2>

          {historyLoading ? (
            <div className="h-32 bg-black/[0.02] dark:bg-white/[0.02] rounded-[26px] animate-pulse" />
          ) : historyRows.length ? (
            <div
              className="rounded-[26px] border border-black/10 dark:border-white/[0.10] bg-white/[0.62] dark:bg-white/[0.06] backdrop-blur-[14px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] overflow-hidden"
            >
              <div className="overflow-x-auto font-sans">
                <table className="w-full min-w-[640px]" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.15)", backgroundColor: "rgba(0,0,0,0.02)" }}>
                      <th className="text-left px-4 py-3 text-xs font-semibold dark:text-white/50" style={{ color: "#71717a", borderRight: "1px solid rgba(0,0,0,0.1)" }}>Date</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold dark:text-white/50" style={{ color: "#71717a", borderRight: "1px solid rgba(0,0,0,0.1)" }}>SB</th>
                      <th className="text-center px-2 py-3 text-xs font-semibold dark:text-white/50" style={{ color: "#71717a", borderRight: "1px solid rgba(0,0,0,0.1)" }}>Δ</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold dark:text-white/50" style={{ color: "#71717a", borderRight: "1px solid rgba(0,0,0,0.1)" }}>4cm</th>
                      <th className="text-center px-2 py-3 text-xs font-semibold dark:text-white/50" style={{ color: "#71717a", borderRight: "1px solid rgba(0,0,0,0.1)" }}>Δ</th>
                      <th className="text-center px-3 py-3 text-xs font-semibold dark:text-white/50" style={{ color: "#71717a", borderRight: "1px solid rgba(0,0,0,0.1)" }}>15cm</th>
                      <th className="text-center px-2 py-3 text-xs font-semibold dark:text-white/50" style={{ color: "#71717a", borderRight: "1px solid rgba(0,0,0,0.1)" }}>Δ</th>
                      <th className="text-left px-3 py-3 text-xs font-semibold dark:text-white/50" style={{ color: "#71717a" }}>Notes</th>
                      {isAdmin && <th className="px-2 py-3" style={{ borderLeft: "1px solid rgba(0,0,0,0.1)" }}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((row, idx) => {
                      const rowKey = row.id || row.timestamp;

                      // Calculate deltas
                      const base = rollingBaselineForIndex(historyRows, idx);
                      const sb = toNum(row.saddle_setback);
                      const h4 = toNum(row.height_4cm);
                      const h15 = toNum(row.height_15cm);
                      const dSB = base ? diff(sb, base.sb) : null;
                      const d4 = base ? diff(h4, base.h4) : null;
                      const d15 = base ? diff(h15, base.h15) : null;

                      return (
                        <tr key={rowKey} style={{ borderBottom: idx < historyRows.length - 1 ? "1px solid rgba(0,0,0,0.1)" : "none" }}>
                          {/* Date column */}
                          <td className="px-4 py-3 align-top" style={{ borderRight: "1px solid rgba(0,0,0,0.1)" }}>
                            <div className="font-bold text-sm dark:text-white" style={{ color: "#18181b" }}>{formatDateShort(row.timestamp)}</div>
                            <div className="text-xs dark:text-white/50" style={{ color: "#71717a" }}>{formatTime(row.timestamp)}</div>
                            {row.location && <div className="text-xs dark:text-white/40" style={{ color: "#71717a" }}>{row.location}</div>}
                            {row.mechanic && <div className="text-xs dark:text-white/40" style={{ color: "#71717a" }}>By {row.mechanic}</div>}
                          </td>

                          {/* SB + Delta */}
                          <td className="px-3 py-3 text-center align-middle" style={{ borderRight: "1px solid rgba(0,0,0,0.1)" }}>
                            <span className="font-bold dark:text-white tabular-nums" style={{ color: "#18181b" }}>{fmtNum(sb)}</span>
                          </td>
                          <td className="px-2 py-3 text-center align-middle" style={{ borderRight: "1px solid rgba(0,0,0,0.1)" }}>
                            <DeltaCell delta={dSB} />
                          </td>

                          {/* 4cm + Delta */}
                          <td className="px-3 py-3 text-center align-middle" style={{ borderRight: "1px solid rgba(0,0,0,0.1)" }}>
                            <span className="font-bold dark:text-white tabular-nums" style={{ color: "#18181b" }}>{fmtNum(h4)}</span>
                          </td>
                          <td className="px-2 py-3 text-center align-middle" style={{ borderRight: "1px solid rgba(0,0,0,0.1)" }}>
                            <DeltaCell delta={d4} />
                          </td>

                          {/* 15cm + Delta */}
                          <td className="px-3 py-3 text-center align-middle" style={{ borderRight: "1px solid rgba(0,0,0,0.1)" }}>
                            <span className="font-bold dark:text-white tabular-nums" style={{ color: "#18181b" }}>{fmtNum(h15)}</span>
                          </td>
                          <td className="px-2 py-3 text-center align-middle" style={{ borderRight: "1px solid rgba(0,0,0,0.1)" }}>
                            <DeltaCell delta={d15} />
                          </td>

                          {/* Notes */}
                          <td className="px-3 py-3 align-middle max-w-[180px]">
                            {row.notes ? (
                              <span className="text-sm dark:text-white/70 italic line-clamp-2" style={{ color: "#3f3f46" }}>"{row.notes}"</span>
                            ) : (
                              <span className="dark:text-white/20" style={{ color: "#a1a1aa" }}>—</span>
                            )}
                          </td>

                          {/* Admin actions */}
                          {isAdmin && (
                            <td className="px-2 py-3 align-middle" style={{ borderLeft: "1px solid rgba(0,0,0,0.1)" }}>
                              {row.id && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => startEditFromRow(row)}
                                    className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-2 hover:bg-orange-500/20 transition"
                                  >
                                    <Pencil size={14} className="text-orange-500" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={savingAdmin}
                                    onClick={() => adminDeleteRow(row)}
                                    className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 hover:bg-red-500/20 transition"
                                  >
                                    <Trash2 size={14} className="text-red-500" />
                                  </button>
                                </div>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-sm dark:text-white/30 py-6 text-center" style={{ color: "#a1a1aa" }}>No history yet</div>
          )}
        </div>
      </div>

      {/* Floating Save Button */}
      <button
        disabled={!canSave}
        onClick={handleSave}
        className={`fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${
          !canSave
            ? "bg-foreground/10 text-foreground/30 cursor-not-allowed"
            : "bg-orange-500 text-white active:scale-95 shadow-orange-500/30"
        }`}
      >
        <Save size={22} />
      </button>

      {/* Deviation Warning Modal */}
      {warnOpen && warnInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cancelWarn} />
          <div className="relative bg-background dark:bg-zinc-900 rounded-3xl border border-black/10 dark:border-white/10 shadow-2xl max-w-md w-full p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-2">
                  <AlertTriangle className="text-red-500" size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground dark:text-white">Significant change detected</h3>
                  <p className="text-xs text-foreground/50 dark:text-white/50 mt-1">
                    Compared to the last saved jig update
                    {warnInfo.prevWhen ? ` (${warnInfo.prevWhen.toLocaleString()})` : ""}.
                    Threshold: <span className="font-bold">{warnInfo.threshold}mm</span>
                  </p>
                </div>
              </div>
              <button onClick={cancelWarn} className="p-2 rounded-full bg-foreground/5 dark:bg-white/10">
                <X size={18} className="text-foreground/50 dark:text-white/50" />
              </button>
            </div>

            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 mb-4">
              <div className="space-y-2 text-sm">
                {warnInfo.flagged.slice(0, 3).map((d) => (
                  <div key={d.key} className="flex items-center justify-between gap-3">
                    <span className="text-foreground/70 dark:text-white/70">{d.label}</span>
                    <div className="text-right">
                      <span className="font-bold text-foreground dark:text-white tabular-nums">{fmtNum(d.next)}mm</span>
                      <span className="text-foreground/40 dark:text-white/40"> (was {fmtNum(d.prev)}mm)</span>
                      <span className="ml-2 font-bold text-red-500 tabular-nums">{fmtSigned(d.diff)}mm</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-red-600/70 dark:text-red-400/70 italic">
                If this is intentional, continue. If not, cancel and re-check the jig.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={cancelWarn}
                className="flex-1 px-4 py-3 rounded-2xl bg-foreground/5 dark:bg-white/10 text-foreground dark:text-white font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveAnyway}
                className="flex-1 px-4 py-3 rounded-2xl bg-orange-500 text-white font-semibold flex items-center justify-center gap-2"
              >
                <Save size={18} /> Save anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rider Picker Drawer */}
      <Drawer.Root open={riderPickerOpen} onOpenChange={setRiderPickerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/10 z-40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 outline-none">
            <div className="bg-background dark:bg-zinc-900 rounded-t-3xl border-t border-black/[0.06] dark:border-white/10">
              {/* Drag handle */}
              <div className="flex justify-center pt-4 pb-2">
                <div className="w-10 h-1 rounded-full bg-foreground/20 dark:bg-white/20" />
              </div>

              {/* Title */}
              <div className="px-6 pb-4">
                <h3 className="text-xl font-bold text-foreground dark:text-white">Select Rider</h3>
              </div>

              {/* Rider list with avatars */}
              <div className="px-4 pb-8 grid grid-cols-2 gap-3">
                {RIDERS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => switchRider(r.name)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition active:scale-[0.98] ${
                      rider === r.name
                        ? "bg-orange-500/10 border-orange-500/20"
                        : "bg-black/[0.02] dark:bg-white/[0.03] border-black/[0.03] dark:border-white/[0.05]"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      {r.image ? (
                        <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">{r.name[0]}</span>
                        </div>
                      )}
                    </div>
                    <span className={`font-semibold ${rider === r.name ? "text-orange-600 dark:text-orange-400" : "text-foreground dark:text-white"}`}>
                      {r.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}

// Delta cell component for history table
function DeltaCell({ delta }) {
  if (delta === null || delta === undefined) {
    return <span className="dark:text-white/20 tabular-nums" style={{ color: "#a1a1aa" }}>—</span>;
  }

  // Green for positive, red for negative, gray for zero
  const colorStyle = delta > 0 ? "#22c55e" : delta < 0 ? "#ef4444" : "#a1a1aa";

  return (
    <span className="tabular-nums font-medium" style={{ color: colorStyle }}>
      {fmtSigned(delta)}
    </span>
  );
}
