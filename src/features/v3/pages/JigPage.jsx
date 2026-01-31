// JigPage.jsx - V3 Styled JIG Form
// Quick jig measurements per rider + bike type with history
// Supports dark theme via useOutletContext

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, useOutletContext } from "react-router-dom";
import { ArrowLeft, Save, Wifi, WifiOff, Pencil, Trash2, AlertTriangle, X, Columns } from "lucide-react";
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
import { Avatar } from "../components/Avatar.jsx";
import { EmptyStatePreset, SkeletonList } from "../../../components/ui/index.js";
import { JigCompareModal } from "../components/JigCompareModal.jsx";

// Riders list (shared with other v3 pages)
const RIDERS = [
  { id: "ana", name: "Ana", image: "/riders/ana.png" },
  { id: "charlie", name: "Charlie", image: "/riders/charlie.png" },
  { id: "cole", name: "Cole", image: "/riders/cole.png" },
  { id: "luca", name: "Luca", image: "/riders/luca.png" },
  { id: "jolanda", name: "Jolanda", image: "/riders/jolanda.png" },
];

const BIKE_TYPES = [
  { id: "race", label: "Race", apiType: "quick_race", image: "/bikes/race.png" },
  { id: "training", label: "Train", apiType: "quick_training", image: "/bikes/training.png" },
  { id: "ebike", label: "E-Bike", apiType: "quick_ebike", image: "/bikes/ebike.png" },
  { id: "road", label: "Road", apiType: "quick_road", image: "/bikes/road.png" },
  { id: "cx", label: "CX", apiType: "quick_cx", image: "/bikes/cx.png" },
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
  } catch { /* ignore localStorage errors */ }
}
function clearDraft(rider, bikeType) {
  if (!rider) return;
  try {
    localStorage.removeItem(draftKey(rider, bikeType));
  } catch { /* ignore localStorage errors */ }
}

// ----- Main Component -----
export default function JigPage() {
  const navigate = useNavigate();
  const [params, setSearchParams] = useSearchParams();
  const { displayName, isAdmin } = useAuth();
  const toast = useToast();

  // Get theme from V3Layout context
  const context = useOutletContext();
  const isDark = context?.isDark ?? false;
  const theme = isDark ? "dark" : "light";

  const rider = params.get("rider") || "";
  const bikeType = (() => {
    const bt = String(params.get("bike") || "race").toLowerCase();
    return ["race", "training", "ebike", "road", "cx"].includes(bt) ? bt : "race";
  })();
  const mechanic = displayName || "";

  // Get API bike type
  const apiBikeType = BIKE_TYPES.find((bt) => bt.id === bikeType)?.apiType || "quick_race";

  // Picker states
  const [riderPickerOpen, setRiderPickerOpen] = useState(false);
  const [bikePickerOpen, setBikePickerOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

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
  const [saving, setSaving] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Reset key to collapse sections after save
  const [sectionResetKey, setSectionResetKey] = useState(0);

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
  async function load(currentApiBikeType, { silent = false, keepEdits = false } = {}) {
    if (!rider) return;
    if (!silent) setLoading(true);

    try {
      await ensureSession();
      const latest = await fetchLatestQuick(rider, currentApiBikeType);
      const latestAt = latest?.timestamp ? new Date(latest.timestamp).getTime() : 0;

      lastLoadedRef.current = latest || null;
      setShowingCached(false);

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
        } else if (!dirtyRef.current) {
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
      const isOffline = e?.code === "OFFLINE" || (typeof navigator !== "undefined" && navigator.onLine === false);
      if (isOffline) {
        const cachedHistory = getCachedJigHistory(rider, bikeType);
        if (cachedHistory && cachedHistory.length > 0) {
          setHistoryRows(cachedHistory);
        }
      }
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

    setSaving(true);
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);

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
        setSectionResetKey((k) => k + 1);
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
        setSectionResetKey((k) => k + 1);
      } else {
        toast.success("Saved");
        setSectionResetKey((k) => k + 1);
        await load(apiBikeType, { silent: true, keepEdits: true });
        await loadHistory(apiBikeType, { silent: true });
      }
    } catch (e) {
      toast.error(`Save failed: ${e?.message || "unknown error"}`);
    } finally {
      setSaving(false);
      setSavingAdmin(false);
    }
  }

  async function handleSave() {
    const payload = { rider, mechanic, bikeType: apiBikeType, ...form };

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

  function switchRider(newRiderName) {
    if (newRiderName === rider) {
      setRiderPickerOpen(false);
      return;
    }
    setSearchParams({ rider: newRiderName, bike: bikeType });
    setRiderPickerOpen(false);
  }

  function switchBikeType(newBikeType) {
    if (newBikeType === bikeType) return;
    setSearchParams({ rider, bike: newBikeType });
  }

  // Theme-specific colors
  const colors = isDark
    ? {
        pageBg: "#121212",
        headerBg: "bg-[#1e1e1e]",
        headerBorder: "border-[#2a2a2a]",
        headerText: "text-white",
        headerSubtext: "text-[#888888]",
        backBtn: "bg-[#252525] text-white",
        wifiOnline: "text-[#ff6b2c]",
        wifiOffline: "text-[#666666]",
        cardBg: "bg-[#1e1e1e]",
        cardBorder: "border-[#2a2a2a]",
        cardShadow: "shadow-[0_10px_28px_rgba(0,0,0,0.40)]",
        riderName: "text-white",
        pillBg: "bg-[#252525]",
        pillBorder: "border-[#333333]",
        pillActive: "bg-[#ff6b2c] text-white shadow-[0_6px_14px_rgba(255,107,44,0.30)]",
        pillInactive: "text-[#888888]",
        inputWrapBg: "bg-[#1a1a1a]",
        inputWrapBorder: "border-[#2a2a2a]",
        sectionHeader: "text-[#ff6b2c]",
        tableHeaderBg: "bg-[#252525]",
        tableHeaderText: "text-[#888888]",
        tableRowOdd: "bg-[#1e1e1e]",
        tableRowEven: "bg-[#1a1a1a]",
        tableBorder: "border-[#2a2a2a]",
        tableText: "text-white",
        tableSecondary: "text-[#888888]",
        notesText: "text-[#888888] italic",
        emptyText: "text-[#666666]",
        alertBg: "bg-[rgba(245,158,11,0.15)]",
        alertBorder: "border-[rgba(245,158,11,0.30)]",
        alertText: "text-amber-400",
        editBannerBg: "bg-[rgba(59,130,246,0.15)]",
        editBannerBorder: "border-[rgba(59,130,246,0.30)]",
        editBannerText: "text-blue-400",
        modalBg: "#1e1e1e",
        modalBorder: "#2a2a2a",
        modalHandle: "bg-[#444444]",
        modalHeader: "text-[#ff6b2c]",
      }
    : {
        pageBg: "#e8e4dc",
        headerBg: "bg-transparent",
        headerBorder: "border-transparent",
        headerText: "text-[#1e3331]",
        headerSubtext: "text-[#5A7A70]",
        backBtn: "bg-[rgba(30,51,49,0.08)] text-[#5A7A70]",
        wifiOnline: "text-green-600",
        wifiOffline: "text-[#8A9A94]",
        cardBg: "bg-[rgba(232,228,220,0.75)]",
        cardBorder: "border-[rgba(0,0,0,0.08)]",
        cardShadow: "shadow-[0_10px_28px_rgba(0,0,0,0.10)]",
        riderName: "text-[#1e3331]",
        pillBg: "bg-[rgba(255,255,255,0.50)]",
        pillBorder: "border-[rgba(0,0,0,0.08)]",
        pillActive: "bg-[linear-gradient(180deg,#f0714a_0%,#e94e1b_100%)] text-white shadow-[0_6px_14px_rgba(233,78,27,0.30)]",
        pillInactive: "text-[#5A7A70]",
        inputWrapBg: "bg-[rgba(255,255,255,0.45)]",
        inputWrapBorder: "border-[rgba(0,0,0,0.06)]",
        sectionHeader: "text-[#5A7A70]",
        tableHeaderBg: "bg-[rgba(30,51,49,0.04)]",
        tableHeaderText: "text-[#5A7A70]",
        tableRowOdd: "",
        tableRowEven: "",
        tableBorder: "border-[rgba(0,0,0,0.08)]",
        tableText: "text-[#1e3331]",
        tableSecondary: "text-[#8A9A94]",
        notesText: "text-[#5A7A70] italic",
        emptyText: "text-[#8A9A94]",
        alertBg: "bg-[rgba(245,158,11,0.08)]",
        alertBorder: "border-[rgba(245,158,11,0.15)]",
        alertText: "text-amber-700",
        editBannerBg: "bg-[rgba(59,130,246,0.08)]",
        editBannerBorder: "border-[rgba(59,130,246,0.15)]",
        editBannerText: "text-blue-700",
        modalBg: "rgba(232,228,220,0.98)",
        modalBorder: "rgba(0,0,0,0.08)",
        modalHandle: "bg-[rgba(30,51,49,0.15)]",
        modalHeader: "text-[#5A7A70] opacity-70",
      };

  const pageStyle = isDark
    ? { backgroundColor: colors.pageBg }
    : {
        backgroundColor: colors.pageBg,
        backgroundImage: "radial-gradient(520px 360px at 50% 0, rgba(30,51,49,0.30), rgba(30,51,49,0.12) 35%, transparent 70%)",
        backgroundAttachment: "fixed",
      };

  return (
    <div className="min-h-dvh font-sans" style={pageStyle}>
      <div className="max-w-lg mx-auto px-4 pt-6 pb-24">
        {/* Header */}
        <div className="mb-6">
          {/* Top row: Back button + Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/v3")}
                className={`p-2.5 rounded-full active:scale-95 transition ${colors.backBtn}`}
              >
                <ArrowLeft size={24} strokeWidth={2.5} />
              </button>
              <span className={`text-xs font-semibold tracking-[0.15em] uppercase ${colors.headerSubtext}`}>
                JIG Update
              </span>
            </div>

            {/* Status indicator + Compare button */}
            <div className="flex items-center gap-3">
              {/* Compare button */}
              <button
                onClick={() => setCompareModalOpen(true)}
                className={`p-2 rounded-full active:scale-95 transition ${colors.backBtn}`}
                title="Compare JIG"
              >
                <Columns size={18} strokeWidth={2} />
              </button>
              <div className="flex items-center gap-2">
                {offline ? (
                  <WifiOff size={16} className={colors.wifiOffline} />
                ) : (
                  <Wifi size={16} className={colors.wifiOnline} />
                )}
                {dirty && <div className="w-2 h-2 rounded-full bg-[#ff6b2c]" />}
              </div>
            </div>
          </div>

          {/* Rider + Bike Type Row */}
          <div
            className={`flex items-center justify-between rounded-[26px] p-3.5 backdrop-blur-sm border ring-1 ${isDark ? "ring-[rgba(255,107,44,0.15)]" : "ring-[rgba(255,255,255,0.05)]"} ${colors.cardBg} ${colors.cardBorder} ${colors.cardShadow}`}
            style={{
              boxShadow: isDark
                ? "0 10px 28px rgba(0, 0, 0, 0.40), 0 0 0 1px rgba(255, 107, 44, 0.08)"
                : "0 10px 28px rgba(0, 0, 0, 0.10)",
            }}
          >
            {/* Rider Selector */}
            {(() => {
              const currentRider = RIDERS.find((r) => r.name === rider);
              return (
                <button
                  onClick={() => setRiderPickerOpen(true)}
                  className="flex items-center gap-3 active:scale-[0.98] transition"
                >
                  {/* Avatar */}
                  <div className={`relative p-[2px] rounded-2xl backdrop-blur-sm border ${isDark ? "bg-[#252525] border-b-2 border-b-[#ff6b2c]" : "bg-[rgba(30,51,49,0.12)] border-[rgba(0,0,0,0.08)]"} ring-1 ${isDark ? "ring-[rgba(255,255,255,0.05)]" : "ring-[rgba(30,51,49,0.20)]"} shadow-[0_8px_20px_rgba(0,0,0,0.12)]`}>
                    <div className={`w-[50px] h-[50px] rounded-xl overflow-hidden border ${isDark ? "bg-[#1e1e1e] border-[rgba(255,255,255,0.08)]" : "bg-[#1e3331] border-[rgba(255,255,255,0.1)]"}`}>
                      {currentRider?.image ? (
                        <img src={currentRider.image} alt={rider} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${isDark ? "bg-[linear-gradient(180deg,#ff8a50_0%,#ff6b2c_100%)]" : "bg-[linear-gradient(180deg,#f0714a_0%,#e94e1b_100%)]"}`}>
                          <span className="text-sm font-bold text-white">{rider?.[0] || "?"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Rider name */}
                  <span className={`font-bold tracking-[0.10em] ${colors.riderName}`}>{rider?.toUpperCase()}</span>
                </button>
              );
            })()}

            {/* Bike Selector */}
            {(() => {
              const currentBike = BIKE_TYPES.find((b) => b.id === bikeType);
              return (
                <button
                  onClick={() => setBikePickerOpen(true)}
                  className="flex items-center gap-3 active:scale-[0.98] transition"
                >
                  {/* Bike name */}
                  <span className={`font-bold tracking-[0.10em] ${isDark ? "text-white" : "text-[#1e3331]"}`}>{currentBike?.label?.toUpperCase()}</span>
                  {/* Bike thumbnail with glass tile */}
                  <div className={`relative p-[2px] rounded-2xl backdrop-blur-sm border ring-1 ${
                    isDark
                      ? "bg-[#252525] border-b-2 border-b-[#ff6b2c] ring-[rgba(255,255,255,0.05)] shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
                      : "bg-[rgba(30,51,49,0.12)] border-[rgba(0,0,0,0.08)] ring-[rgba(30,51,49,0.20)] shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
                  }`}>
                    <div className={`w-[50px] h-[50px] rounded-xl overflow-hidden flex items-center justify-center border ${
                      isDark
                        ? "bg-[#1e1e1e] border-[rgba(255,255,255,0.05)]"
                        : "bg-[rgba(255,255,255,0.70)] border-[rgba(0,0,0,0.06)]"
                    }`}>
                      {currentBike?.image ? (
                        <img src={currentBike.image} alt={currentBike.label} className="w-[42px] h-[42px] object-contain" />
                      ) : (
                        <div className="w-full h-full bg-[linear-gradient(180deg,#f0714a_0%,#e94e1b_100%)] flex items-center justify-center">
                          <span className="text-sm font-bold text-white">{currentBike?.label?.[0] || "?"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })()}
          </div>
        </div>

        {/* Status indicators */}
        {offline && (
          <div className={`mb-4 px-4 py-3 rounded-2xl border text-sm flex items-center gap-2 ${colors.alertBg} ${colors.alertBorder} ${colors.alertText}`}>
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
          <div className={`mb-4 px-4 py-3 rounded-2xl border text-sm flex items-center justify-between ${colors.editBannerBg} ${colors.editBannerBorder} ${colors.editBannerText}`}>
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
              <div key={i} className={`h-16 rounded-3xl animate-pulse ${isDark ? "bg-[#1e1e1e]" : "bg-[rgba(30,51,49,0.04)]"}`} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <SpecSection key={`measurements-${sectionResetKey}`} title="MEASUREMENTS" defaultOpen={false} theme={theme}>
              <div className="grid grid-cols-2 gap-2">
                <div className={`rounded-xl p-2 border shadow-[0_2px_6px_rgba(0,0,0,0.03)] ${colors.inputWrapBg} ${colors.inputWrapBorder}`}>
                  <SpecField
                    label="Saddle Setback (mm)"
                    value={form.saddleSetback}
                    onChange={(v) => setField("saddleSetback", v)}
                    placeholder="e.g. 45"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    theme={theme}
                  />
                </div>

                <div className={`rounded-xl p-2 border shadow-[0_2px_6px_rgba(0,0,0,0.03)] ${colors.inputWrapBg} ${colors.inputWrapBorder}`}>
                  <SpecField
                    label="Height at 4cm (mm)"
                    value={form.height4cm}
                    onChange={(v) => setField("height4cm", v)}
                    placeholder="e.g. 745"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    theme={theme}
                  />
                </div>

                <div className={`rounded-xl p-2 border shadow-[0_2px_6px_rgba(0,0,0,0.03)] ${colors.inputWrapBg} ${colors.inputWrapBorder}`}>
                  <SpecField
                    label="Height at 15cm (mm)"
                    value={form.height15cm}
                    onChange={(v) => setField("height15cm", v)}
                    placeholder="e.g. 750"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    theme={theme}
                  />
                </div>

                <div className={`rounded-xl p-2 border shadow-[0_2px_6px_rgba(0,0,0,0.03)] ${colors.inputWrapBg} ${colors.inputWrapBorder}`}>
                  <SpecField
                    label="Location"
                    value={form.location}
                    onChange={(v) => setField("location", v)}
                    placeholder="e.g. Team truck / Hotel"
                    theme={theme}
                  />
                </div>

                <div className={`rounded-xl p-2 col-span-2 border shadow-[0_2px_6px_rgba(0,0,0,0.03)] ${colors.inputWrapBg} ${colors.inputWrapBorder}`}>
                  <SpecField
                    label="Notes"
                    value={form.notes}
                    onChange={(v) => setField("notes", v)}
                    placeholder="Any observations / changes..."
                    textarea
                    rows={3}
                    fullWidth
                    theme={theme}
                  />
                </div>
              </div>
            </SpecSection>
          </motion.div>
        )}

        {/* History Section */}
        <div className="mt-8">
          <h2 className={`text-xs font-semibold tracking-[0.15em] uppercase mb-4 ${colors.sectionHeader}`}>
            Jig History
          </h2>

          {historyLoading ? (
            <div className={`p-4 rounded-[26px] ${isDark ? "bg-[#1e1e1e]" : "bg-[rgba(30,51,49,0.04)]"}`}>
              <SkeletonList rows={3} />
            </div>
          ) : historyRows.length ? (
            <div className={`rounded-[26px] border backdrop-blur-sm ring-1 ${isDark ? "ring-[rgba(255,255,255,0.05)]" : "ring-[rgba(30,51,49,0.10)]"} ${colors.cardBg} ${colors.cardBorder} ${colors.cardShadow} overflow-hidden`}>
              <div
                className={`overflow-x-auto font-sans ${isDark ? "scrollbar-dark" : "scrollbar-light"}`}
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: isDark ? "#555 #252525" : "#bbb #e8e4dc",
                }}
              >
                <table className="w-full min-w-[640px]" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr className={`border-b ${colors.tableBorder} ${colors.tableHeaderBg}`}>
                      <th className={`text-left px-4 py-3 text-xs font-semibold border-r ${colors.tableBorder} ${colors.tableHeaderText}`}>Date</th>
                      <th className={`text-center px-3 py-3 text-xs font-semibold border-r ${colors.tableBorder} ${colors.tableHeaderText}`}>SB</th>
                      <th className={`text-center px-2 py-3 text-xs font-semibold border-r ${colors.tableBorder} ${colors.tableHeaderText}`}>Δ</th>
                      <th className={`text-center px-3 py-3 text-xs font-semibold border-r ${colors.tableBorder} ${colors.tableHeaderText}`}>4cm</th>
                      <th className={`text-center px-2 py-3 text-xs font-semibold border-r ${colors.tableBorder} ${colors.tableHeaderText}`}>Δ</th>
                      <th className={`text-center px-3 py-3 text-xs font-semibold border-r ${colors.tableBorder} ${colors.tableHeaderText}`}>15cm</th>
                      <th className={`text-center px-2 py-3 text-xs font-semibold border-r ${colors.tableBorder} ${colors.tableHeaderText}`}>Δ</th>
                      <th className={`text-left px-3 py-3 text-xs font-semibold ${colors.tableHeaderText}`}>Notes</th>
                      {isAdmin && <th className={`px-2 py-3 border-l ${colors.tableBorder}`}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((row, idx) => {
                      const rowKey = row.id || row.timestamp;
                      const base = rollingBaselineForIndex(historyRows, idx);
                      const sb = toNum(row.saddle_setback);
                      const h4 = toNum(row.height_4cm);
                      const h15 = toNum(row.height_15cm);
                      const dSB = base ? diff(sb, base.sb) : null;
                      const d4 = base ? diff(h4, base.h4) : null;
                      const d15 = base ? diff(h15, base.h15) : null;

                      const rowBg = isDark ? (idx % 2 === 0 ? colors.tableRowOdd : colors.tableRowEven) : "";

                      return (
                        <tr key={rowKey} className={`border-b ${colors.tableBorder} ${rowBg}`}>
                          <td className={`px-4 py-3 align-top border-r ${colors.tableBorder}`}>
                            <div className={`font-bold text-base ${colors.tableText}`}>{formatDateShort(row.timestamp)}</div>
                            <div className={`text-[11px] mt-0.5 ${colors.tableSecondary}`}>{formatTime(row.timestamp)}</div>
                            {row.location && <div className={`text-[11px] ${colors.tableSecondary}`}>{row.location}</div>}
                            {row.mechanic && <div className={`text-[11px] ${colors.tableSecondary}`}>By {row.mechanic}</div>}
                          </td>

                          <td className={`px-3 py-3 text-center align-middle border-r ${colors.tableBorder}`}>
                            <span className={`font-bold font-mono tabular-nums ${colors.tableText}`}>{fmtNum(sb)}</span>
                          </td>
                          <td className={`px-2 py-3 text-center align-middle border-r ${colors.tableBorder}`}>
                            <DeltaCell delta={dSB} isDark={isDark} />
                          </td>

                          <td className={`px-3 py-3 text-center align-middle border-r ${colors.tableBorder}`}>
                            <span className={`font-bold font-mono tabular-nums ${colors.tableText}`}>{fmtNum(h4)}</span>
                          </td>
                          <td className={`px-2 py-3 text-center align-middle border-r ${colors.tableBorder}`}>
                            <DeltaCell delta={d4} isDark={isDark} />
                          </td>

                          <td className={`px-3 py-3 text-center align-middle border-r ${colors.tableBorder}`}>
                            <span className={`font-bold font-mono tabular-nums ${colors.tableText}`}>{fmtNum(h15)}</span>
                          </td>
                          <td className={`px-2 py-3 text-center align-middle border-r ${colors.tableBorder}`}>
                            <DeltaCell delta={d15} isDark={isDark} />
                          </td>

                          <td className="px-3 py-3 align-middle max-w-[180px]">
                            {row.notes ? (
                              <span className={`text-sm line-clamp-2 ${colors.notesText}`}>"{row.notes}"</span>
                            ) : (
                              <span className={colors.emptyText}>—</span>
                            )}
                          </td>

                          {isAdmin && (
                            <td className={`px-2 py-3 align-middle border-l ${colors.tableBorder}`}>
                              {row.id && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => startEditFromRow(row)}
                                    className={`rounded-lg border p-2 transition ${isDark ? "border-[#ff6b2c]/30 bg-[#ff6b2c]/10 hover:bg-[#ff6b2c]/20" : "border-[rgba(233,78,27,0.25)] bg-[rgba(233,78,27,0.10)] hover:bg-[rgba(233,78,27,0.15)]"}`}
                                  >
                                    <Pencil size={14} className="text-[#ff6b2c]" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={savingAdmin}
                                    onClick={() => adminDeleteRow(row)}
                                    className="rounded-lg border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.10)] p-2 hover:bg-[rgba(239,68,68,0.15)] transition"
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
            <EmptyStatePreset preset="jig" compact />
          )}
        </div>
      </div>

      {/* Floating Save Button */}
      <button
        disabled={!canSave || saving}
        onClick={handleSave}
        className={`fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-6 z-30 rounded-full flex items-center justify-center transition-all duration-300 ${
          saving
            ? "w-20 h-20 bg-white text-[#e94e1b] shadow-[0_0_40px_rgba(233,78,27,0.60)] animate-pulse scale-110"
            : !canSave
              ? `w-14 h-14 ${isDark ? "bg-[#252525] text-[#666666]" : "bg-[rgba(30,51,49,0.10)] text-[#8A9A94]"} cursor-not-allowed`
              : "w-14 h-14 bg-[linear-gradient(180deg,#f0714a_0%,#e94e1b_100%)] text-white shadow-[0_8px_24px_rgba(233,78,27,0.40)] active:scale-95"
        }`}
      >
        <Save size={saving ? 28 : 22} className={saving ? "animate-spin" : ""} />
      </button>

      {/* Deviation Warning Modal */}
      {warnOpen && warnInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={cancelWarn} />
          <div className={`relative rounded-3xl border shadow-2xl max-w-md w-full p-6 ${isDark ? "bg-[#1e1e1e] border-[#2a2a2a]" : "bg-[rgba(232,228,220,0.98)] border-[rgba(0,0,0,0.08)]"}`}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-[rgba(239,68,68,0.10)] border border-[rgba(239,68,68,0.20)] p-2">
                  <AlertTriangle className="text-red-500" size={20} />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-[#1e3331]"}`}>Significant change detected</h3>
                  <p className={`text-xs mt-1 ${isDark ? "text-[#888888]" : "text-[#5A7A70]"}`}>
                    Compared to the last saved jig update
                    {warnInfo.prevWhen ? ` (${warnInfo.prevWhen.toLocaleString()})` : ""}.
                    Threshold: <span className="font-bold">{warnInfo.threshold}mm</span>
                  </p>
                </div>
              </div>
              <button onClick={cancelWarn} className={`p-2 rounded-full ${isDark ? "bg-[#252525]" : "bg-[rgba(30,51,49,0.08)]"}`}>
                <X size={18} className={isDark ? "text-[#888888]" : "text-[#5A7A70]"} />
              </button>
            </div>

            <div className="rounded-2xl border border-[rgba(239,68,68,0.20)] bg-[rgba(239,68,68,0.05)] p-4 mb-4">
              <div className="space-y-2 text-sm">
                {warnInfo.flagged.slice(0, 3).map((d) => (
                  <div key={d.key} className="flex items-center justify-between gap-3">
                    <span className={isDark ? "text-[#888888]" : "text-[#5A7A70]"}>{d.label}</span>
                    <div className="text-right">
                      <span className={`font-bold font-mono tabular-nums ${isDark ? "text-white" : "text-[#1e3331]"}`}>{fmtNum(d.next)}mm</span>
                      <span className={isDark ? "text-[#666666]" : "text-[#8A9A94]"}> (was {fmtNum(d.prev)}mm)</span>
                      <span className="ml-2 font-bold font-mono tabular-nums text-red-500">{fmtSigned(d.diff)}mm</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-red-500/70 italic">
                If this is intentional, continue. If not, cancel and re-check the jig.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={cancelWarn}
                className={`flex-1 px-4 py-3 rounded-2xl font-semibold ${isDark ? "bg-[#252525] text-white" : "bg-[rgba(30,51,49,0.08)] text-[#1e3331]"}`}
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveAnyway}
                className="flex-1 px-4 py-3 rounded-2xl bg-[linear-gradient(180deg,#f0714a_0%,#e94e1b_100%)] text-white font-semibold flex items-center justify-center gap-2"
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
          <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <Drawer.Content
            className={`flex flex-col rounded-t-[20px] fixed bottom-0 left-0 right-0 z-50 outline-none border-t`}
            style={{
              background: isDark ? colors.modalBg : `radial-gradient(400px 300px at 50% 100%, rgba(30,51,49,0.15), transparent 70%), ${colors.modalBg}`,
              borderColor: colors.modalBorder,
            }}
          >
            <div className="p-4 rounded-t-[20px] flex-none">
              <div className={`mx-auto w-12 h-1.5 flex-shrink-0 rounded-full ${colors.modalHandle}`} />
            </div>

            <div className="text-center pb-4">
              <p className={`text-[10px] uppercase font-semibold tracking-[0.3em] ${colors.modalHeader}`}>
                Tap Rider &rarr; Switch
              </p>
            </div>

            <div className="px-4 pb-6">
              <div className="flex justify-center gap-4 mb-6">
                {RIDERS.slice(0, 3).map((r) => (
                  <Avatar
                    key={r.id}
                    name={r.name}
                    initial={r.name[0]}
                    image={r.image}
                    selected={rider === r.name}
                    onClick={() => switchRider(r.name)}
                    theme={theme}
                  />
                ))}
              </div>

              <div className="flex justify-center gap-4">
                {RIDERS.slice(3).map((r) => (
                  <Avatar
                    key={r.id}
                    name={r.name}
                    initial={r.name[0]}
                    image={r.image}
                    selected={rider === r.name}
                    onClick={() => switchRider(r.name)}
                    theme={theme}
                  />
                ))}
              </div>
            </div>

            <div className="h-[env(safe-area-inset-bottom)]" />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Bike Picker Drawer */}
      <Drawer.Root open={bikePickerOpen} onOpenChange={setBikePickerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className={`fixed inset-0 backdrop-blur-sm z-50 ${isDark ? "bg-black/60" : "bg-black/40"}`} />
          <Drawer.Content
            className={`flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-50 outline-none border-t ${
              isDark ? "border-[#2a2a2a]" : "border-[rgba(0,0,0,0.08)]"
            }`}
            style={{
              background: isDark
                ? "#1e1e1e"
                : "radial-gradient(400px 300px at 50% 100%, rgba(30,51,49,0.15), transparent 70%)," +
                  "rgba(232,228,220,0.98)",
            }}
          >
            {/* Drag handle */}
            <div className="p-4 rounded-t-[32px] flex-none">
              <div className={`mx-auto w-12 h-1.5 flex-shrink-0 rounded-full ${
                isDark ? "bg-[#444444]" : "bg-[rgba(30,51,49,0.15)]"
              }`} />
            </div>

            {/* Instruction text */}
            <div className="text-center pb-4">
              <p className={`text-[10px] uppercase font-semibold tracking-[0.3em] ${
                isDark ? "text-[#ff6b2c]" : "text-[#5A7A70] opacity-70"
              }`}>
                Tap Bike &rarr; Switch
              </p>
            </div>

            {/* Bike Grid */}
            <div className="px-4 pb-6">
              <div className="flex justify-center gap-4 flex-wrap">
                {BIKE_TYPES.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      switchBikeType(b.id);
                      setBikePickerOpen(false);
                    }}
                    className={`
                      group flex flex-col items-center gap-3 w-[80px] flex-shrink-0
                      focus-visible:outline-none focus-visible:ring-2 ${isDark ? "focus-visible:ring-[#ff6b2c]" : "focus-visible:ring-[rgba(233,78,27,0.55)]"}
                    `}
                  >
                    {/* Bike tile */}
                    <div
                      style={{
                        boxShadow: isDark
                          ? "0 4px 12px rgba(0, 0, 0, 0.4)"
                          : "0 10px 28px rgba(0, 0, 0, 0.18)",
                      }}
                      className={[
                        "relative p-[2px] rounded-2xl",
                        "transition-all duration-200 ease-out",
                        "group-hover:scale-[1.03] group-active:scale-[0.97]",
                        isDark
                          ? bikeType === b.id ? "bg-[#2a2a2a]" : "bg-[#1e1e1e]"
                          : bikeType === b.id ? "bg-[rgba(30,51,49,0.18)]" : "bg-[rgba(30,51,49,0.12)]",
                        "backdrop-blur-sm",
                        isDark
                          ? "border-transparent border-b-2 border-b-[#ff6b2c]"
                          : "border border-[rgba(0,0,0,0.08)]",
                        bikeType === b.id
                          ? isDark ? "ring-1 ring-[#ff6b2c]" : "ring-1 ring-[rgba(233,78,27,0.50)]"
                          : isDark ? "ring-0" : "ring-1 ring-[rgba(30,51,49,0.20)]",
                        isDark
                          ? "group-hover:shadow-[0_8px_24px_rgba(255,107,44,0.15)]"
                          : "group-hover:shadow-[0_12px_32px_rgba(0,0,0,0.22)]",
                      ].join(" ")}
                    >
                      <div
                        className={`
                          w-[70px] h-[70px] rounded-xl overflow-hidden flex items-center justify-center
                          ${isDark ? "bg-[#1e1e1e] border border-[rgba(255,255,255,0.05)]" : "bg-[rgba(255,255,255,0.70)] border border-[rgba(0,0,0,0.06)]"}
                        `}
                      >
                        {b.image ? (
                          <img src={b.image} alt={b.label} className="w-[58px] h-[58px] object-contain" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center ${
                            isDark ? "bg-[#ff6b2c]" : "bg-[linear-gradient(180deg,#f0714a_0%,#e94e1b_100%)]"
                          }`}>
                            <span className="text-lg font-bold text-white">{b.label[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Label */}
                    <span
                      style={{
                        textShadow: isDark
                          ? "0 1px 2px rgba(0,0,0,0.5)"
                          : "0 1px 2px rgba(0,0,0,0.15)",
                      }}
                      className={[
                        "text-sm font-semibold transition-colors duration-200 truncate max-w-full",
                        bikeType === b.id
                          ? isDark ? "text-[#ff6b2c]" : "text-[#e94e1b]"
                          : isDark ? "text-white" : "text-[#1e3331]",
                        isDark ? "group-hover:text-[#ff6b2c]" : "group-hover:text-[#e94e1b]",
                      ].join(" ")}
                    >
                      {b.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom safe area padding */}
            <div className="h-[env(safe-area-inset-bottom)]" />
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {/* Compare Modal */}
      <JigCompareModal
        open={compareModalOpen}
        onClose={() => setCompareModalOpen(false)}
        defaultRider={rider}
        defaultBike={bikeType}
      />
    </div>
  );
}

// Delta cell component for history table
function DeltaCell({ delta, isDark }) {
  if (delta === null || delta === undefined) {
    return <span className={`font-mono tabular-nums ${isDark ? "text-[#666666]" : "text-[#8A9A94]"}`}>—</span>;
  }

  // Green for positive, red for negative
  const colorClass = delta > 0 ? "text-green-500" : delta < 0 ? "text-red-500" : (isDark ? "text-[#666666]" : "text-[#8A9A94]");

  return (
    <span className={`font-mono tabular-nums font-medium ${colorClass}`}>
      {fmtSigned(delta)}
    </span>
  );
}
