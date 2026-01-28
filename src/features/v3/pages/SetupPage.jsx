// SetupPage.jsx - V3 Styled MTB Setup Form
// Race bike tire/suspension settings per rider with history

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Wifi, WifiOff, Pencil, Trash2, Flag, ChevronDown, ChevronRight, X, Zap } from "lucide-react";
import { Drawer } from "vaul";
import { motion } from "motion/react";

import { useAuth } from "../../auth/AuthProvider.jsx";
import { useToast } from "../../../components/ToastProvider.jsx";
import { ensureSession } from "../../measurements/api/measurementsApi";
import {
  fetchLatestMtbSettings,
  fetchMtbSettingsHistory,
  insertMtbSettings,
  setMtbSettingsRaceMark,
  updateMtbSettingsEntry,
  deleteMtbSettingsEntry,
} from "../../settings/api/settingsApi";
import {
  getCachedSettingsLatest,
  getCachedSettingsHistory,
  getCachedSettingsMeta,
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

const DEFAULT_SETUP = {
  front_tyre: "",
  rear_tyre: "",
  front_pressure: "",
  rear_pressure: "",
  fork_pressure: "",
  shock_pressure: "",
  fork_rebound: "",
  shock_rebound: "",
  // expanded
  front_insert: "",
  rear_insert: "",
  fork_spacers: "",
  shock_spacers: "",
  fork_compression: "",
  shock_compression: "",
  chainring: "",
  cassette: "",
  wheelset: "",
  notes: "",
};

const DEFAULT_KEYS = [
  "front_tyre",
  "rear_tyre",
  "front_pressure",
  "rear_pressure",
  "fork_pressure",
  "shock_pressure",
  "fork_rebound",
  "shock_rebound",
];

const EXPANDED_KEYS = [
  "front_insert",
  "rear_insert",
  "fork_spacers",
  "shock_spacers",
  "fork_compression",
  "shock_compression",
  "chainring",
  "cassette",
  "wheelset",
];

// Tab/Next order (fast iPhone entry)
const FAST_ORDER = [
  "front_tyre",
  "rear_tyre",
  "front_pressure",
  "rear_pressure",
  "fork_pressure",
  "shock_pressure",
  "fork_rebound",
  "shock_rebound",
  "notes",
];

const LS_EVENT_CONTEXT = "cfr_settings_event_context_last";

// ----- Utility functions -----
function labelize(key) {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatTimestamp(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return `${days[d.getDay()]} ${d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })}`;
}

function formatDateShort(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
}

function normalizeSetup(incoming) {
  return { ...DEFAULT_SETUP, ...(incoming && typeof incoming === "object" ? incoming : {}) };
}

function safeFullSpec(obj) {
  return obj && typeof obj === "object" ? obj : {};
}

function readEventContextFallback() {
  try {
    return localStorage.getItem(LS_EVENT_CONTEXT) || "";
  } catch {
    return "";
  }
}

function writeEventContext(val) {
  try {
    localStorage.setItem(LS_EVENT_CONTEXT, val ?? "");
  } catch {
    // ignore
  }
}

// ----- Draft persistence -----
const DRAFT_PREFIX = "cfr_v3_setup_draft__";

function draftKey(rider) {
  return `${DRAFT_PREFIX}${encodeURIComponent(rider || "")}`;
}

function readDraft(rider) {
  if (!rider) return null;
  try {
    const raw = localStorage.getItem(draftKey(rider));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      eventContext: String(parsed.eventContext ?? ""),
      setup: normalizeSetup(parsed.setup),
      at: Number(parsed.at || 0),
    };
  } catch {
    return null;
  }
}

function writeDraft(rider, eventContext, setup) {
  if (!rider) return;
  try {
    localStorage.setItem(
      draftKey(rider),
      JSON.stringify({
        eventContext: String(eventContext ?? ""),
        setup: normalizeSetup(setup),
        at: Date.now(),
      })
    );
  } catch {
    // ignore
  }
}

function clearDraft(rider) {
  if (!rider) return;
  try {
    localStorage.removeItem(draftKey(rider));
  } catch {
    // ignore
  }
}

// ----- History filtering helpers -----
function startOfWeekLocal(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun ... 6 Sat
  const diff = (day + 6) % 7; // days since Monday
  x.setDate(x.getDate() - diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgoLocal(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function fmtPsi(v) {
  const s = String(v ?? "").trim();
  return s ? `${s} psi` : "—";
}

function fmtClicks(v) {
  const s = String(v ?? "").trim();
  return s ? `${s} clicks` : "—";
}

// ----- Main Component -----
export default function SetupPage() {
  const navigate = useNavigate();
  const [params, setSearchParams] = useSearchParams();
  const { displayName, isAdmin } = useAuth();
  const toast = useToast();

  const rider = params.get("rider") || "";
  const mechanic = displayName || "";

  // Rider picker state
  const [riderPickerOpen, setRiderPickerOpen] = useState(false);

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  // Form state
  const [eventContext, setEventContext] = useState(readEventContextFallback());
  const [setup, setSetup] = useState(DEFAULT_SETUP);
  const [showExpanded, setShowExpanded] = useState(false);

  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);

  // History state
  const [historyRaw, setHistoryRaw] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [range, setRange] = useState("week"); // week | 30d | all
  const [raceOnly, setRaceOnly] = useState(false);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState(() => new Set());

  // Admin edit state
  const [editingId, setEditingId] = useState(null);
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Offline cache state
  const [showingCached, setShowingCached] = useState(false);

  // Refs for fast iPhone entry
  const inputRefs = useRef({});
  const lastSaveRef = useRef({ at: 0, sig: "" });

  const canSave = useMemo(() => mechanic && rider, [mechanic, rider]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // Persist event context
  useEffect(() => {
    writeEventContext(eventContext);
  }, [eventContext]);

  // Hydrate form from a history row
  function hydrateFromRow(row) {
    const blob = safeFullSpec(row?.full_spec);
    const nextCtx = String(blob?.event_context ?? "");
    const nextSetup = normalizeSetup(blob?.setup);

    setEventContext(nextCtx || readEventContextFallback());
    setSetup(nextSetup);
  }

  // Load data on mount
  async function load({ silent = false, keepEdits = false, forceRefresh = false } = {}) {
    if (!rider) return;
    if (!silent) setLoading(true);

    try {
      await ensureSession();
      const latest = await fetchLatestMtbSettings(rider);
      const latestAt = latest?.timestamp ? new Date(latest.timestamp).getTime() : 0;

      setShowingCached(false); // Fresh data from server

      if (keepEdits && dirtyRef.current) return;

      const draft = readDraft(rider);
      const draftAt = draft?.at || 0;

      if (draft && draftAt > latestAt) {
        setEventContext(draft.eventContext || readEventContextFallback());
        setSetup(normalizeSetup(draft.setup));
        setDirty(true);
      } else if (latest) {
        hydrateFromRow(latest);
        setDirty(false);
        clearDraft(rider);
      } else {
        setEventContext(readEventContextFallback());
        setSetup(DEFAULT_SETUP);
        setDirty(false);
        clearDraft(rider);
      }
    } catch (e) {
      // OFFLINE FALLBACK: Use cached data
      const isOffline = e?.code === "OFFLINE" || (typeof navigator !== "undefined" && navigator.onLine === false);
      if (isOffline) {
        const cachedLatest = getCachedSettingsLatest(rider);

        if (cachedLatest && !dirtyRef.current) {
          hydrateFromRow(cachedLatest);
          setDirty(false);
          setShowingCached(true);
          // Don't show error toast - we have cached data
        } else if (!dirtyRef.current) {
          // No cache, show error
          toast.error("Offline and no cached data available");
        }
      } else {
        toast.error(e.message || "Failed to load settings");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadHistory({ silent = false } = {}) {
    if (!rider) return;
    if (!silent) setHistoryLoading(true);

    try {
      await ensureSession();
      const rows = await fetchMtbSettingsHistory(rider, 250);
      setHistoryRaw(Array.isArray(rows) ? rows : []);
    } catch (e) {
      // OFFLINE FALLBACK: Use cached history
      const isOffline = e?.code === "OFFLINE" || (typeof navigator !== "undefined" && navigator.onLine === false);
      if (isOffline) {
        const cachedHistory = getCachedSettingsHistory(rider);
        if (cachedHistory && cachedHistory.length > 0) {
          setHistoryRaw(cachedHistory);
        }
      }
      // History is non-critical, don't show error
    } finally {
      if (!silent) setHistoryLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadHistory();

    const onVis = () => {
      if (document.visibilityState === "visible") {
        load({ silent: true, keepEdits: true });
        loadHistory({ silent: true });
      }
    };
    const onOnline = () => {
      load({ silent: true, keepEdits: true });
      loadHistory({ silent: true });
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rider]);

  // Auto-save draft
  useEffect(() => {
    if (!rider || !dirty) return;
    const t = setTimeout(() => writeDraft(rider, eventContext, setup), 250);
    return () => clearTimeout(t);
  }, [rider, eventContext, setup, dirty]);

  function setField(key, value) {
    setDirty(true);
    setSetup((prev) => ({ ...prev, [key]: value }));
  }

  function setRefFor(key) {
    return (el) => {
      inputRefs.current[key] = el;
    };
  }

  function focusKey(key) {
    const el = inputRefs.current[key];
    if (el && typeof el.focus === "function") el.focus();
  }

  function focusNextFrom(key) {
    const idx = FAST_ORDER.indexOf(key);
    if (idx < 0) return;
    const nextKey = FAST_ORDER[idx + 1];
    if (nextKey) focusKey(nextKey);
    else {
      const el = inputRefs.current[key];
      if (el && typeof el.blur === "function") el.blur();
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setDirty(false);
    load({ silent: true, keepEdits: false });
  }

  // Filtered history
  const history = useMemo(() => {
    const now = new Date();
    const cutoff = range === "week" ? startOfWeekLocal(now) : range === "30d" ? daysAgoLocal(30) : null;

    let rows = historyRaw || [];
    if (cutoff) {
      rows = rows.filter((r) => {
        const t = r?.timestamp ? new Date(r.timestamp) : null;
        return t && t >= cutoff;
      });
    }
    if (raceOnly) rows = rows.filter((r) => !!safeFullSpec(r?.full_spec)?.is_race);
    return rows;
  }, [historyRaw, range, raceOnly]);

  function toggleHistoryExpand(id) {
    setExpandedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function toggleRace(row, nextValue) {
    if (offline) {
      toast.error("Race marking requires being online");
      return;
    }
    if (!row?.id) {
      toast.error("This entry has no id (can't update)");
      return;
    }

    // Optimistic update
    setHistoryRaw((prev) =>
      (prev || []).map((r) => {
        if (r.id !== row.id) return r;
        const fs = safeFullSpec(r.full_spec);
        return { ...r, full_spec: { ...fs, is_race: !!nextValue, race_marked_at: new Date().toISOString() } };
      })
    );

    try {
      await setMtbSettingsRaceMark({ id: row.id, isRace: nextValue });
      toast.success(nextValue ? "Marked as Race" : "Unmarked Race");
    } catch (e) {
      toast.error(`Failed: ${e?.message || "unknown error"}`);
      await loadHistory({ silent: true });
    }
  }

  function startEditFromRow(row) {
    if (!isAdmin || !row?.id) return;
    const fs = safeFullSpec(row?.full_spec);
    setEventContext(String(fs?.event_context ?? ""));
    setSetup(normalizeSetup(fs?.setup));
    setDirty(true);
    setEditingId(row.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function adminDeleteRow(row) {
    if (!isAdmin || !row?.id) return;
    if (offline) {
      toast.error("Admin deletes require being online");
      return;
    }
    const ok = window.confirm("Delete this settings entry? This cannot be undone.");
    if (!ok) return;
    try {
      setSavingAdmin(true);
      await deleteMtbSettingsEntry(row.id);
      if (editingId === row.id) cancelEdit();
      await loadHistory({ silent: true });
      toast.success("Deleted");
    } catch (e) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setSavingAdmin(false);
    }
  }

  async function handleSave() {
    if (!canSave) {
      toast.error("Missing rider or mechanic");
      return;
    }

    const dedupeSig = JSON.stringify({
      rider,
      mechanic,
      eventContext,
      setup,
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
        await updateMtbSettingsEntry({ id: editingId, eventContext, setup });
        lastSaveRef.current = { sig: dedupeSig, at: Date.now() };
        setDirty(false);
        clearDraft(rider);
        setEditingId(null);
        toast.success("Updated");
        await load({ silent: true, keepEdits: true });
        await loadHistory({ silent: true });
        return;
      }

      const res = await insertMtbSettings({
        rider,
        mechanic,
        eventContext,
        setup,
        dedupeSig,
      });
      lastSaveRef.current = { sig: dedupeSig, at: Date.now() };
      setDirty(false);
      clearDraft(rider);

      if (res?.queued) {
        toast.success("Saved offline — will sync later");
      } else {
        toast.success("Saved");
        await load({ silent: true, keepEdits: true });
        await loadHistory({ silent: true });
      }
    } catch (e) {
      toast.error(`Save failed: ${e?.message || "unknown error"}`);
    } finally {
      setSavingAdmin(false);
    }
  }

  // Handle switching rider
  function switchRider(newRiderName) {
    if (newRiderName === rider) {
      setRiderPickerOpen(false);
      return;
    }
    setSearchParams({ rider: newRiderName });
    setRiderPickerOpen(false);
  }

  // Compare current and previous setup to find changes
  function getChanges(currentSetup = {}, previousSetup = {}) {
    const defaultChanged = DEFAULT_KEYS.filter(
      (k) => String(currentSetup?.[k] ?? "") !== String(previousSetup?.[k] ?? "")
    );
    const expandedChanged = EXPANDED_KEYS.filter(
      (k) => String(currentSetup?.[k] ?? "") !== String(previousSetup?.[k] ?? "")
    );
    const notesChanged = String(currentSetup?.notes ?? "") !== String(previousSetup?.notes ?? "");
    return { defaultChanged, expandedChanged, notesChanged };
  }

  // Build collapsed summary for history row
  function buildCollapsedSummary(cur, isLatest = false, changes = null) {
    const changedKeys = new Set((isLatest && changes?.defaultChanged) || []);
    const mk = (label, keys, value) => {
      const changed = isLatest && keys.some((k) => changedKeys.has(k));
      return { label, value: value || "—", changed };
    };

    return [
      mk("Front tyre", ["front_tyre"], cur.front_tyre),
      mk("Rear tyre", ["rear_tyre"], cur.rear_tyre),
      mk("Front pressure", ["front_pressure"], fmtPsi(cur.front_pressure)),
      mk("Rear pressure", ["rear_pressure"], fmtPsi(cur.rear_pressure)),
      mk("Fork", ["fork_pressure", "fork_rebound"], `${fmtPsi(cur.fork_pressure)} / ${fmtClicks(cur.fork_rebound)}`),
      mk("Shock", ["shock_pressure", "shock_rebound"], `${fmtPsi(cur.shock_pressure)} / ${fmtClicks(cur.shock_rebound)}`),
    ];
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
              <span className="text-xs font-semibold tracking-[0.15em] text-foreground/50 uppercase">MTB Setup</span>
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

          {/* Rider Row - Glass Surface */}
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

            {/* Race Bike Badge */}
            <div className="px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">RACE BIKE</span>
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
            fetchedAt={getCachedSettingsMeta(rider)?.fetchedAt}
            onRefresh={() => {
              setShowingCached(false);
              load({ forceRefresh: true });
              loadHistory();
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

        {/* Setup Form */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-black/[0.02] dark:bg-white/[0.02] rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Event Context */}
            <div
              className="rounded-2xl p-3"
              style={{
                backgroundColor: "rgba(255,255,255,0.45)",
                border: "1px solid rgba(0,0,0,0.06)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
              }}
            >
              <SpecField
                label="Event / Context"
                value={eventContext}
                onChange={(v) => { setEventContext(v); setDirty(true); }}
                placeholder="e.g. Nove Mesto WC2 / Wet"
                fullWidth
              />
            </div>

            {/* Tyres Section */}
            <SpecSection title="TYRES" defaultOpen={true}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  label="Front Tyre"
                  value={setup.front_tyre}
                  onChange={(v) => setField("front_tyre", v)}
                  placeholder="e.g. Maxxis Assegai"
                  inputRef={setRefFor("front_tyre")}
                  onEnterNext={() => focusNextFrom("front_tyre")}
                />
                <FormField
                  label="Rear Tyre"
                  value={setup.rear_tyre}
                  onChange={(v) => setField("rear_tyre", v)}
                  placeholder="e.g. Maxxis Dissector"
                  inputRef={setRefFor("rear_tyre")}
                  onEnterNext={() => focusNextFrom("rear_tyre")}
                />
                <FormField
                  label="Front Pressure"
                  value={setup.front_pressure}
                  onChange={(v) => setField("front_pressure", v)}
                  placeholder="e.g. 18"
                  unit="psi"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  inputRef={setRefFor("front_pressure")}
                  onEnterNext={() => focusNextFrom("front_pressure")}
                />
                <FormField
                  label="Rear Pressure"
                  value={setup.rear_pressure}
                  onChange={(v) => setField("rear_pressure", v)}
                  placeholder="e.g. 20"
                  unit="psi"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  inputRef={setRefFor("rear_pressure")}
                  onEnterNext={() => focusNextFrom("rear_pressure")}
                />
              </div>
            </SpecSection>

            {/* Suspension Section */}
            <SpecSection title="SUSPENSION" defaultOpen={true}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  label="Fork Pressure"
                  value={setup.fork_pressure}
                  onChange={(v) => setField("fork_pressure", v)}
                  placeholder="e.g. 75"
                  unit="psi"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  inputRef={setRefFor("fork_pressure")}
                  onEnterNext={() => focusNextFrom("fork_pressure")}
                />
                <FormField
                  label="Shock Pressure"
                  value={setup.shock_pressure}
                  onChange={(v) => setField("shock_pressure", v)}
                  placeholder="e.g. 180"
                  unit="psi"
                  inputMode="decimal"
                  pattern="[0-9]*[.,]?[0-9]*"
                  inputRef={setRefFor("shock_pressure")}
                  onEnterNext={() => focusNextFrom("shock_pressure")}
                />
                <FormField
                  label="Fork Rebound"
                  value={setup.fork_rebound}
                  onChange={(v) => setField("fork_rebound", v)}
                  placeholder="e.g. 10"
                  unit="clicks"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  inputRef={setRefFor("fork_rebound")}
                  onEnterNext={() => focusNextFrom("fork_rebound")}
                />
                <FormField
                  label="Shock Rebound"
                  value={setup.shock_rebound}
                  onChange={(v) => setField("shock_rebound", v)}
                  placeholder="e.g. 8"
                  unit="clicks"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  inputRef={setRefFor("shock_rebound")}
                  onEnterNext={() => focusNextFrom("shock_rebound")}
                />
              </div>

              {/* Neo Settings Button */}
              <button
                onClick={() => navigate(`/v3/neo?rider=${encodeURIComponent(rider)}`)}
                className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full transition-all active:scale-[0.97]"
                style={{
                  background: "#f97316",
                  color: "#000",
                }}
              >
                <Zap size={18} />
                <span className="font-semibold">Neo Settings</span>
              </button>
            </SpecSection>

            {/* Notes Section */}
            <SpecSection title="NOTES" defaultOpen={true}>
              <div
                className="rounded-2xl p-3"
                style={{
                  backgroundColor: "rgba(255,255,255,0.45)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                }}
              >
                <SpecField
                  label="Notes"
                  value={setup.notes}
                  onChange={(v) => setField("notes", v)}
                  placeholder="Any observations / changes..."
                  textarea
                  rows={3}
                  fullWidth
                  inputRef={setRefFor("notes")}
                />
              </div>
            </SpecSection>

            {/* Advanced Section (collapsed by default) */}
            <SpecSection title="ADVANCED" defaultOpen={false}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  label="Front Insert"
                  value={setup.front_insert}
                  onChange={(v) => setField("front_insert", v)}
                  placeholder="e.g. CushCore Pro"
                />
                <FormField
                  label="Rear Insert"
                  value={setup.rear_insert}
                  onChange={(v) => setField("rear_insert", v)}
                  placeholder="e.g. CushCore XC"
                />
                <FormField
                  label="Fork Spacers"
                  value={setup.fork_spacers}
                  onChange={(v) => setField("fork_spacers", v)}
                  placeholder="e.g. 2 x 5mm"
                />
                <FormField
                  label="Shock Spacers"
                  value={setup.shock_spacers}
                  onChange={(v) => setField("shock_spacers", v)}
                  placeholder="e.g. 1 x 5mm"
                />
                <FormField
                  label="Fork Compression"
                  value={setup.fork_compression}
                  onChange={(v) => setField("fork_compression", v)}
                  placeholder="e.g. LSC 8, HSC 2"
                />
                <FormField
                  label="Shock Compression"
                  value={setup.shock_compression}
                  onChange={(v) => setField("shock_compression", v)}
                  placeholder="e.g. LSC 6, HSC 1"
                />
                <FormField
                  label="Chainring"
                  value={setup.chainring}
                  onChange={(v) => setField("chainring", v)}
                  placeholder="e.g. 34T"
                />
                <FormField
                  label="Cassette"
                  value={setup.cassette}
                  onChange={(v) => setField("cassette", v)}
                  placeholder="e.g. 10-52"
                />
                <div className="md:col-span-2">
                  <FormField
                    label="Wheelset"
                    value={setup.wheelset}
                    onChange={(v) => setField("wheelset", v)}
                    placeholder="e.g. Reserve 30"
                    fullWidth
                  />
                </div>
              </div>
            </SpecSection>
          </motion.div>
        )}

        {/* History Section */}
        <div className="mt-8">
          <h2 className="text-xs font-semibold tracking-[0.15em] uppercase mb-4 font-sans dark:text-white/40" style={{ color: "#71717a" }}>
            Setup History ({history.length}{history.length !== historyRaw.length ? ` / ${historyRaw.length}` : ""})
          </h2>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            <FilterChip active={range === "week"} onClick={() => setRange("week")}>This week</FilterChip>
            <FilterChip active={range === "30d"} onClick={() => setRange("30d")}>30 days</FilterChip>
            <FilterChip active={range === "all"} onClick={() => setRange("all")}>All</FilterChip>
            <FilterChip active={raceOnly} onClick={() => setRaceOnly((v) => !v)}>
              <Flag size={14} /> Race only
            </FilterChip>
          </div>

          {historyLoading ? (
            <div className="h-32 bg-black/[0.02] dark:bg-white/[0.02] rounded-[26px] animate-pulse" />
          ) : history.length ? (
            <div className="space-y-3">
              {history.map((row, idx) => {
                const isLatest = idx === 0;
                const id = row.id || `${row.timestamp}-${idx}`;
                const isExpanded = expandedHistoryIds.has(id);
                const fs = safeFullSpec(row?.full_spec);
                const isRace = !!fs?.is_race;
                const cur = normalizeSetup(fs?.setup || {});
                const prev = normalizeSetup(safeFullSpec(history?.[idx + 1]?.full_spec)?.setup || {});
                const changes = isLatest ? getChanges(cur, prev) : null;

                const hasExpandedOnlyChanges =
                  isLatest &&
                  changes &&
                  changes.expandedChanged.length > 0 &&
                  changes.defaultChanged.length === 0 &&
                  !changes.notesChanged;

                const hasAnyChanges = isLatest && (changes?.defaultChanged.length || hasExpandedOnlyChanges || changes?.notesChanged);

                const summaryItems = buildCollapsedSummary(cur, isLatest, changes);

                // Border: race (yellow) > latest with changes (orange) > default
                const borderStyle = isRace
                  ? "rgba(250, 204, 21, 0.35)"
                  : hasAnyChanges
                  ? "rgba(251, 146, 60, 0.35)"
                  : "rgba(0, 0, 0, 0.1)";

                return (
                  <div
                    key={id}
                    className="rounded-[26px] overflow-hidden bg-white/[0.62] dark:bg-white/[0.06] backdrop-blur-[14px] shadow-[0_10px_30px_rgba(0,0,0,0.08)] transition"
                    style={{ border: `1px solid ${borderStyle}` }}
                  >
                    {/* Header row - clickable to expand */}
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => toggleHistoryExpand(id)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {isExpanded ? (
                            <ChevronDown size={18} className="text-orange-500 mt-0.5 shrink-0" />
                          ) : (
                            <ChevronRight size={18} className="dark:text-white/50 mt-0.5 shrink-0" style={{ color: "#71717a" }} />
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold dark:text-white truncate" style={{ color: "#18181b" }}>{row.mechanic || "—"}</span>
                              <span className="text-xs dark:text-white/50" style={{ color: "#71717a" }}>{formatTimestamp(row.timestamp)}</span>

                              {!!fs?.event_context && (
                                <span className="text-xs text-orange-600/80 dark:text-orange-300/80 px-2 py-0.5 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                                  {fs.event_context}
                                </span>
                              )}

                              {isRace && (
                                <span className="text-xs font-bold text-yellow-600 dark:text-yellow-200 px-2 py-0.5 bg-yellow-400/10 rounded-2xl border border-yellow-400/20 inline-flex items-center gap-1">
                                  <Flag size={12} /> Race
                                </span>
                              )}

                              {hasExpandedOnlyChanges && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-2xl" style={{ backgroundColor: "rgba(249, 115, 22, 0.1)", color: "#ea580c", border: "1px solid rgba(249, 115, 22, 0.2)" }}>
                                  Other changed
                                </span>
                              )}

                              {isLatest && changes?.notesChanged && (
                                <span className="text-xs font-bold px-2 py-0.5 rounded-2xl" style={{ backgroundColor: "rgba(249, 115, 22, 0.1)", color: "#ea580c", border: "1px solid rgba(249, 115, 22, 0.2)" }}>
                                  Notes changed
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleRace(row, !isRace)}
                            disabled={offline || !row?.id}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition inline-flex items-center gap-1.5 active:scale-[0.97]"
                            style={
                              offline || !row?.id
                                ? { backgroundColor: "rgba(0,0,0,0.02)", color: "#a1a1aa", borderColor: "rgba(0,0,0,0.05)", cursor: "not-allowed" }
                                : isRace
                                ? { backgroundColor: "rgba(250, 204, 21, 0.15)", color: "#ca8a04", borderColor: "rgba(250, 204, 21, 0.25)" }
                                : { backgroundColor: "rgba(255,255,255,0.6)", color: "#525252", borderColor: "rgba(0,0,0,0.1)" }
                            }
                            title={offline ? "Offline" : isRace ? "Unmark race" : "Mark as race"}
                          >
                            <Flag size={14} />
                            {isRace ? "Race" : "Mark"}
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => startEditFromRow(row)}
                                disabled={offline || !row?.id}
                                className="rounded-lg p-1.5 border transition active:scale-[0.97]"
                                style={
                                  offline || !row?.id
                                    ? { backgroundColor: "rgba(0,0,0,0.02)", color: "#a1a1aa", borderColor: "rgba(0,0,0,0.05)", cursor: "not-allowed" }
                                    : { backgroundColor: "rgba(249, 115, 22, 0.1)", color: "#f97316", borderColor: "rgba(249, 115, 22, 0.2)" }
                                }
                                title="Edit (admin)"
                              >
                                <Pencil size={14} />
                              </button>

                              <button
                                onClick={() => adminDeleteRow(row)}
                                disabled={offline || !row?.id || savingAdmin}
                                className="rounded-lg p-1.5 border transition active:scale-[0.97]"
                                style={
                                  offline || !row?.id || savingAdmin
                                    ? { backgroundColor: "rgba(0,0,0,0.02)", color: "#a1a1aa", borderColor: "rgba(0,0,0,0.05)", cursor: "not-allowed" }
                                    : { backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.2)" }
                                }
                                title="Delete (admin)"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Summary grid */}
                    <div className="px-4 pb-4 grid grid-cols-2 gap-2 text-sm">
                      {summaryItems.map((it) => (
                        <div
                          key={it.label}
                          className="p-2.5 rounded-xl"
                          style={{
                            backgroundColor: it.changed ? "rgba(251, 146, 60, 0.12)" : "rgba(255,255,255,0.45)",
                            border: it.changed ? "1px solid rgba(251, 146, 60, 0.25)" : "1px solid rgba(0,0,0,0.06)",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                          }}
                        >
                          <div className="text-[11px] dark:text-white/50" style={{ color: it.changed ? "#ea580c" : "#71717a" }}>{it.label}</div>
                          <div className="font-semibold dark:text-white truncate tabular-nums" style={{ color: "#18181b" }}>{it.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }}>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {EXPANDED_KEYS.map((k) => {
                            const v = cur?.[k];
                            if (!v) return null;
                            const expandedChanged = isLatest && changes?.expandedChanged.includes(k);
                            return (
                              <div
                                key={k}
                                className={`p-2.5 rounded-xl ${k === "wheelset" ? "col-span-2" : ""}`}
                                style={{
                                  backgroundColor: expandedChanged ? "rgba(251, 146, 60, 0.12)" : "rgba(255,255,255,0.45)",
                                  border: expandedChanged ? "1px solid rgba(251, 146, 60, 0.25)" : "1px solid rgba(0,0,0,0.06)",
                                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                                }}
                              >
                                <div className="text-[11px] dark:text-white/50" style={{ color: expandedChanged ? "#ea580c" : "#71717a" }}>{labelize(k)}</div>
                                <div className="font-semibold dark:text-white break-words" style={{ color: "#18181b" }}>{v}</div>
                              </div>
                            );
                          })}
                        </div>

                        {!!cur?.notes && (
                          <div
                            className="mt-3 p-2.5 rounded-xl"
                            style={{
                              backgroundColor: isLatest && changes?.notesChanged ? "rgba(251, 146, 60, 0.12)" : "rgba(255,255,255,0.45)",
                              border: isLatest && changes?.notesChanged ? "1px solid rgba(251, 146, 60, 0.25)" : "1px solid rgba(0,0,0,0.06)",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                            }}
                          >
                            <div className="text-[11px] dark:text-white/50" style={{ color: isLatest && changes?.notesChanged ? "#ea580c" : "#71717a" }}>Notes</div>
                            <div className="dark:text-white/70 italic break-words" style={{ color: "#3f3f46" }}>"{cur.notes}"</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm dark:text-white/30 py-6 text-center" style={{ color: "#a1a1aa" }}>
              No history for this filter. Try switching to <span className="font-bold text-foreground dark:text-white">All</span>.
            </div>
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
                    <span
                      className={`font-semibold ${rider === r.name ? "text-orange-600 dark:text-orange-400" : "dark:text-white"}`}
                      style={rider === r.name ? {} : { color: "#18181b" }}
                    >
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

// ----- Subcomponents -----

function FormField({ label, value, onChange, placeholder, unit, inputMode, pattern, inputRef, onEnterNext, fullWidth, textarea, rows }) {
  return (
    <div
      className={`rounded-2xl p-3 ${fullWidth ? "col-span-full" : ""}`}
      style={{
        backgroundColor: "rgba(255,255,255,0.45)",
        border: "1px solid rgba(0,0,0,0.06)",
        boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium dark:text-white/50" style={{ color: "#71717a" }}>{label}</span>
        {unit && (
          <span className="text-[10px] font-semibold dark:text-white/40 px-1.5 py-0.5 rounded bg-black/[0.02] dark:bg-white/[0.03]" style={{ color: "#a1a1aa" }}>
            {unit}
          </span>
        )}
      </div>
      {textarea ? (
        <textarea
          ref={inputRef}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows || 3}
          className="w-full bg-transparent dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/30 outline-none resize-none"
          style={{ color: "#18181b" }}
        />
      ) : (
        <input
          ref={inputRef}
          type="text"
          inputMode={inputMode}
          pattern={pattern}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/30 outline-none"
          style={{ color: "#18181b" }}
          autoComplete="off"
          enterKeyHint={onEnterNext ? "next" : undefined}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnterNext) {
              e.preventDefault();
              onEnterNext();
            }
          }}
        />
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }) {
  const baseStyle = "px-3 py-2 rounded-2xl text-xs font-semibold border transition inline-flex items-center gap-1.5 active:scale-[0.97]";

  if (active) {
    return (
      <button
        onClick={onClick}
        className={baseStyle}
        style={{
          backgroundColor: "rgba(249, 115, 22, 0.15)",
          color: "#ea580c",
          borderColor: "rgba(249, 115, 22, 0.3)",
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${baseStyle} hover:bg-white/80 dark:hover:bg-white/10`}
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.6)",
        color: "#525252",
        borderColor: "rgba(0, 0, 0, 0.1)",
      }}
    >
      {children}
    </button>
  );
}
