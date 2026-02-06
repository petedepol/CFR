// BikeSpecPage.jsx - V3 Styled Bike Spec Form
// Full restyle of V2 FullSpecPage with V3 design system

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, useOutletContext, useLocation } from "react-router-dom";
import { ArrowLeft, Save, Wifi, WifiOff, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { Drawer } from "vaul";
import { motion } from "motion/react";

import { useAuth } from "../../auth/AuthProvider.jsx";
import { useToast } from "../../../components/ToastProvider.jsx";
import { ensureSession, fetchLatestFull, fetchFullHistory, insertFull, updateMeasurement, deleteMeasurement } from "../../measurements/api/measurementsApi";
import { FULL_SPEC_DEFAULTS } from "../../measurements/utils/fullSpecDefaults";
import {
  getCachedSpecLatest,
  getCachedSpecHistory,
  getCachedSpecMeta,
} from "../../../lib/offlineCache.js";
import { CachedDataBanner } from "../../../components/CachedDataBanner.jsx";

import { SpecSection } from "../components/SpecSection.jsx";
import { SpecField } from "../components/SpecField.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { EmptyStatePreset, SkeletonList } from "../../../components/ui/index.js";

// ----- Labels & field UI rules -----
const SECTION_LABELS = {
  frame: "Frame",
  cockpit: "Cockpit",
  drivetrain: "Drivetrain",
  brakes: "Brakes",
  suspension: "Suspension",
  other: "Other",
};

const FIELD_LABELS = {
  size: "Size",
  link: "Link",
  chain_guard: "Chain guard",
  notes: "Notes",
  saddle: "Saddle",
  stem: "Stem",
  spacers_under: "Spacers under",
  bars: "Bars",
  grips: "Grips",
  dropper: "Dropper",
  dropper_lever: "Dropper lever",
  lockout_lever: "Lockout lever",
  distance_to_brake_lever: "Distance to brake lever",
  distance_to_dropper_lever: "Distance to dropper lever",
  i_spec_adapter_hole: "I-Spec adapter hole",
  garmin_mount: "Garmin mount",
  crank_set: "Crank-set",
  pedals: "Pedals",
  pedal_clicks: "Pedal clicks",
  levers: "Levers",
  calipers: "Calipers",
  pads: "Pads",
  shock_and_tune: "Shock + tune",
  fork_and_tune: "Fork + tune",
  bottle_cage: "Bottle cage",
  other_info: "Other info",
};

const NUMERIC_KEYS = new Set(["spacers_under", "distance_to_brake_lever", "distance_to_dropper_lever", "pedal_clicks"]);
const DECIMAL_KEYS = new Set(["distance_to_brake_lever", "distance_to_dropper_lever"]);
const TEXTAREA_KEYS = new Set(["notes", "other_info"]);

const PLACEHOLDERS = {
  spacers_under: "e.g. 20 (mm)",
  distance_to_brake_lever: "e.g. 55 (mm)",
  distance_to_dropper_lever: "e.g. 35 (mm)",
  pedal_clicks: "e.g. 2",
  notes: "Anything important...",
  other_info: "Anything else...",
};

// Riders list (shared with LandingPlayground)
const RIDERS = [
  { id: "ana", name: "Ana", image: "/riders/ana.png" },
  { id: "charlie", name: "Charlie", image: "/riders/charlie.png" },
  { id: "cole", name: "Cole", image: "/riders/cole.png" },
  { id: "luca", name: "Luca", image: "/riders/luca.png" },
  { id: "jolanda", name: "Jolanda", image: "/riders/jolanda.png" },
];

const BIKE_TYPES = [
  { id: "race", label: "Race", image: "/bikes/race.png" },
  { id: "training", label: "Train", image: "/bikes/training.png" },
  { id: "ebike", label: "E-Bike", image: "/bikes/ebike.png" },
  { id: "road", label: "Road", image: "/bikes/road.png" },
  { id: "cx", label: "CX", image: "/bikes/cx.png" },
];

// ----- Utility functions -----
function normalizeSpec(maybeSpec) {
  if (!maybeSpec || typeof maybeSpec !== "object") return null;
  if (maybeSpec.mtb && typeof maybeSpec.mtb === "object") return maybeSpec.mtb;
  if (Object.prototype.hasOwnProperty.call(maybeSpec, "frame") || Object.prototype.hasOwnProperty.call(maybeSpec, "cockpit")) {
    return maybeSpec;
  }
  return null;
}

function clone(obj) {
  try {
    return structuredClone(obj);
  } catch {
    return JSON.parse(JSON.stringify(obj));
  }
}

function mergeDefaults(defaults, incoming) {
  const out = clone(defaults);
  for (const section of Object.keys(out)) {
    if (incoming?.[section] && typeof incoming[section] === "object") {
      out[section] = { ...out[section], ...incoming[section] };
    }
  }
  return out;
}

function labelForSection(section) {
  return SECTION_LABELS[section] || section;
}

function labelForField(key) {
  return FIELD_LABELS[key] || key.replace(/_/g, " ");
}

function fieldUiMeta(key) {
  const isNumeric = NUMERIC_KEYS.has(key);
  const isTextarea = TEXTAREA_KEYS.has(key);
  const placeholder = PLACEHOLDERS[key] || "";
  const fullWidth = key === "notes" || key === "other_info";
  const wantsDecimal = DECIMAL_KEYS.has(key);
  const inputMode = isNumeric ? (wantsDecimal ? "decimal" : "numeric") : undefined;
  const pattern = isNumeric ? (wantsDecimal ? "[0-9]*[.,]?[0-9]*" : "[0-9]*") : undefined;
  const rows = key === "other_info" ? 5 : key === "notes" ? 4 : 3;
  return { isNumeric, isTextarea, placeholder, fullWidth, inputMode, pattern, rows };
}

// ----- Draft persistence -----
const DRAFT_PREFIX = "cfr_v3_spec_draft__";
function draftKey(rider, bikeType) {
  return `${DRAFT_PREFIX}${encodeURIComponent(rider || "")}__${bikeType || "mtb"}`;
}
function readDraft(rider, bikeType) {
  if (!rider) return null;
  try {
    const raw = localStorage.getItem(draftKey(rider, bikeType));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.spec) return null;
    return { at: Number(parsed.at || 0), spec: parsed.spec };
  } catch {
    return null;
  }
}
function writeDraft(rider, bikeType, spec) {
  if (!rider) return;
  try {
    localStorage.setItem(draftKey(rider, bikeType), JSON.stringify({ at: Date.now(), spec }));
  } catch { /* ignore localStorage errors */ }
}
function clearDraft(rider, bikeType) {
  if (!rider) return;
  try {
    localStorage.removeItem(draftKey(rider, bikeType));
  } catch { /* ignore localStorage errors */ }
}

function isBlank(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  return false;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

// ----- Main Component -----
export default function BikeSpecPage() {
  const navigate = useNavigate();
  const [params, setSearchParams] = useSearchParams();
  const { displayName, isAdmin } = useAuth();
  const toast = useToast();
  const { isDark } = useOutletContext();

  const rider = params.get("rider") || "";
  const bikeType = (() => {
    const bt = String(params.get("bike") || "race").toLowerCase();
    return ["race", "training", "ebike", "road", "cx"].includes(bt) ? bt : "race";
  })();
  const mechanic = displayName || "";

  // Picker states
  const [riderPickerOpen, setRiderPickerOpen] = useState(false);
  const [bikePickerOpen, setBikePickerOpen] = useState(false);

  // Close modals on navigation (fixes iOS swipe-back leaving modals open)
  const location = useLocation();
  useEffect(() => {
    const closeAllModals = () => {
      setRiderPickerOpen(false);
      setBikePickerOpen(false);
    };

    // Close on route change
    closeAllModals();

    // Also listen to popstate for iOS swipe-back gesture
    window.addEventListener('popstate', closeAllModals);
    return () => window.removeEventListener('popstate', closeAllModals);
  }, [location.pathname]);

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  const [spec, setSpec] = useState(() => clone(FULL_SPEC_DEFAULTS[bikeType] || FULL_SPEC_DEFAULTS.race));
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);

  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Reset key to collapse sections after save
  const [sectionResetKey, setSectionResetKey] = useState(0);

  // Offline cache state
  const [showingCached, setShowingCached] = useState(false);

  const lastSaveRef = useRef({ at: 0, sig: "" });
  const canSave = useMemo(() => mechanic && rider, [mechanic, rider]);

  const defaults = useMemo(() => FULL_SPEC_DEFAULTS[bikeType] || FULL_SPEC_DEFAULTS.race, [bikeType]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // Load data on mount
  async function load({ silent = false, keepEdits = false } = {}) {
    if (!rider) return;
    if (!silent) setLoading(true);

    try {
      await ensureSession();
      const latest = await fetchLatestFull(rider, bikeType);
      const latestAt = latest?.timestamp ? new Date(latest.timestamp).getTime() : 0;

      setShowingCached(false); // Fresh data from server

      if (keepEdits && dirtyRef.current) return;

      const draft = readDraft(rider, bikeType);
      const draftAt = draft?.at || 0;
      const draftSpec = normalizeSpec(draft?.spec);
      const latestSpec = normalizeSpec(latest?.full_spec);

      if (draftSpec && draftAt > latestAt) {
        setSpec(mergeDefaults(defaults, draftSpec));
        setDirty(true);
      } else if (latestSpec) {
        setSpec(mergeDefaults(defaults, latestSpec));
        setDirty(false);
        clearDraft(rider, bikeType);
      } else {
        setSpec(clone(defaults));
        setDirty(false);
        clearDraft(rider, bikeType);
      }
    } catch (e) {
      // OFFLINE FALLBACK: Use cached data
      const isOffline = e?.code === "OFFLINE" || (typeof navigator !== "undefined" && navigator.onLine === false);
      if (isOffline) {
        const cachedLatest = getCachedSpecLatest(rider, bikeType);
        const cachedSpec = normalizeSpec(cachedLatest?.full_spec);

        if (cachedSpec && !dirtyRef.current) {
          setSpec(mergeDefaults(defaults, cachedSpec));
          setDirty(false);
          setShowingCached(true);
          // Don't show error toast - we have cached data
        } else if (!dirtyRef.current) {
          // No cache, show error
          toast.error("Offline and no cached data available");
        }
      } else {
        toast.error(e.message || "Failed to load bike spec");
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
      const rows = await fetchFullHistory(rider, bikeType, 10);
      setHistoryRows(Array.isArray(rows) ? rows : []);
    } catch (e) {
      // OFFLINE FALLBACK: Use cached history
      const isOffline = e?.code === "OFFLINE" || (typeof navigator !== "undefined" && navigator.onLine === false);
      if (isOffline) {
        const cachedHistory = getCachedSpecHistory(rider, bikeType);
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
  }, [rider, bikeType]);

  // Auto-save draft
  useEffect(() => {
    if (!rider || !dirty) return;
    const t = setTimeout(() => writeDraft(rider, bikeType, spec), 250);
    return () => clearTimeout(t);
  }, [rider, bikeType, spec, dirty]);

  function setField(section, key, value) {
    setDirty(true);
    setSpec((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }

  function cancelEdit() {
    setEditingId(null);
    setDirty(false);
    load({ silent: true, keepEdits: false });
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
      await loadHistory({ silent: true });
      toast.success("Deleted");
    } catch (e) {
      toast.error(e?.message || "Delete failed");
    } finally {
      setSavingAdmin(false);
    }
  }

  function startEditFromRow(row) {
    if (!isAdmin || !row?.id) return;
    const specObj = normalizeSpec(row?.full_spec);
    if (!specObj) {
      toast.error("This entry has no spec data");
      return;
    }
    setSpec(mergeDefaults(defaults, specObj));
    setDirty(true);
    setEditingId(row.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSave() {
    if (!canSave) {
      toast.error("Missing rider or mechanic");
      return;
    }

    const dedupeSig = JSON.stringify({ rider, mechanic, bikeType, fullSpec: spec, editingId: editingId || "" });
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
          full_spec: spec,
          mechanic,
          timestamp: new Date().toISOString(),
        });
        lastSaveRef.current = { sig: dedupeSig, at: Date.now() };
        setDirty(false);
        dirtyRef.current = false;
        clearDraft(rider, bikeType);
        setEditingId(null);
        toast.success("Updated");
        setSectionResetKey((k) => k + 1);
        await load({ silent: true, keepEdits: true });
        await loadHistory({ silent: true });
        return;
      }

      const res = await insertFull({ rider, mechanic, bikeType, fullSpec: spec, dedupeSig });
      lastSaveRef.current = { sig: dedupeSig, at: Date.now() };
      setDirty(false);
      dirtyRef.current = false;
      clearDraft(rider, bikeType);

      if (res?.queued) {
        toast.success("Saved offline — will sync later");
        setSectionResetKey((k) => k + 1);
      } else {
        toast.success("Saved");
        setSectionResetKey((k) => k + 1);
        await load({ silent: true, keepEdits: true });
        await loadHistory({ silent: true });
      }
    } catch (e) {
      toast.error(`Save failed: ${e?.message || "unknown error"}`);
    } finally {
      setSaving(false);
      setSavingAdmin(false);
    }
  }

  const bikeTypeLabel = BIKE_TYPES.find((bt) => bt.id === bikeType)?.label || bikeType;

  // Handle switching rider - preserves current draft before switching
  function switchRider(newRiderName) {
    if (newRiderName === rider) {
      setRiderPickerOpen(false);
      return;
    }
    // Current spec is auto-saved as draft via useEffect, so just switch
    setSearchParams({ rider: newRiderName, bike: bikeType });
    setRiderPickerOpen(false);
  }

  // Handle switching bike type - preserves current draft before switching
  function switchBikeType(newBikeType) {
    if (newBikeType === bikeType) return;
    // Current spec is auto-saved as draft via useEffect, so just switch
    setSearchParams({ rider, bike: newBikeType });
  }

  // Theme-specific colors
  const theme = isDark ? "dark" : "light";
  const pageBackground = isDark
    ? "#121212"
    : "#e8e4dc";
  const pageGradient = isDark
    ? "none"
    : "radial-gradient(520px 360px at 50% 0, rgba(30,51,49,0.30), rgba(30,51,49,0.12) 35%, transparent 70%)";

  return (
    <div
      className="min-h-dvh font-sans selection:bg-[rgba(233,78,27,0.30)]"
      style={{
        backgroundColor: pageBackground,
        backgroundImage: pageGradient,
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-lg mx-auto px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-24">
        {/* Header */}
        <div className="mb-6">
          {/* Top row: Back button + Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/v3")}
                className={`p-2 rounded-full active:scale-95 transition ${
                  isDark
                    ? "bg-[#1e1e1e] text-white"
                    : "bg-[rgba(30,51,49,0.08)] text-[#5A7A70]"
                }`}
              >
                <ArrowLeft size={20} />
              </button>
              <span className={`text-xs font-semibold tracking-[0.15em] uppercase ${
                isDark ? "text-white" : "text-[#5A7A70]"
              }`}>Bike Spec</span>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2">
              {offline ? (
                <WifiOff size={16} className={isDark ? "text-[#888888]" : "text-[#8A9A94]"} />
              ) : (
                <Wifi size={16} className={isDark ? "text-[#ff6b2c]" : "text-green-600"} />
              )}
              {dirty && (
                <div
                  className="w-2 h-2 rounded-full bg-[#ff6b2c] animate-pulse"
                  style={{ animationDuration: "1.5s" }}
                />
              )}
            </div>
          </div>

          {/* Rider + Bike Type Row - Glass Surface */}
          <div className={`flex items-center justify-between rounded-[26px] p-3.5 backdrop-blur-sm border ring-1 ${
            isDark
              ? "bg-[#1e1e1e] border-[#2a2a2a] ring-[rgba(255,255,255,0.05)] shadow-[0_10px_28px_rgba(0,0,0,0.40)]"
              : "bg-[rgba(232,228,220,0.75)] border-[rgba(0,0,0,0.08)] ring-[rgba(30,51,49,0.12)] shadow-[0_10px_28px_rgba(0,0,0,0.10)]"
          }`}>
            {/* Rider Selector */}
            {(() => {
              const currentRider = RIDERS.find((r) => r.name === rider);
              return (
                <button
                  onClick={() => setRiderPickerOpen(true)}
                  className="flex items-center gap-3 active:scale-[0.98] transition"
                >
                  {/* Avatar with glass tile */}
                  <div className={`relative p-[2px] rounded-2xl backdrop-blur-sm border ring-1 ${
                    isDark
                      ? "bg-[#252525] border-[#333333] border-b-2 border-b-[#ff6b2c] ring-[rgba(255,255,255,0.05)] shadow-[0_8px_20px_rgba(0,0,0,0.40)]"
                      : "bg-[rgba(30,51,49,0.12)] border-[rgba(0,0,0,0.08)] ring-[rgba(30,51,49,0.20)] shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
                  }`}>
                    <div className={`w-[50px] h-[50px] rounded-xl overflow-hidden border ${
                      isDark
                        ? "bg-[#1e1e1e] border-[rgba(255,255,255,0.05)]"
                        : "bg-[#1e3331] border-[rgba(255,255,255,0.1)]"
                    }`}>
                      {currentRider?.image ? (
                        <img src={currentRider.image} alt={rider} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[linear-gradient(180deg,#f0714a_0%,#e94e1b_100%)] flex items-center justify-center">
                          <span className="text-sm font-bold text-white">{rider?.[0] || "?"}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Rider name */}
                  <span className={`font-bold tracking-[0.10em] ${isDark ? "text-white" : "text-[#1e3331]"}`}>{rider?.toUpperCase()}</span>
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
                      ? "bg-[#252525] border-[#333333] border-b-2 border-b-[#ff6b2c] ring-[rgba(255,255,255,0.05)] shadow-[0_8px_20px_rgba(0,0,0,0.40)]"
                      : "bg-[rgba(30,51,49,0.12)] border-[rgba(0,0,0,0.08)] ring-[rgba(30,51,49,0.20)] shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
                  }`}>
                    <div className={`w-[50px] h-[50px] rounded-xl overflow-hidden border flex items-center justify-center ${
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
          <div className={`mb-4 px-4 py-3 rounded-2xl text-sm flex items-center gap-2 ${
            isDark
              ? "bg-[rgba(245,158,11,0.15)] border border-[rgba(245,158,11,0.25)] text-amber-400"
              : "bg-[rgba(245,158,11,0.08)] border border-[rgba(245,158,11,0.15)] text-amber-700"
          }`}>
            <WifiOff size={16} /> Offline — saves will queue
          </div>
        )}

        {showingCached && (
          <CachedDataBanner
            className="mb-4"
            fetchedAt={getCachedSpecMeta(rider, bikeType)?.fetchedAt}
            onRefresh={() => {
              setShowingCached(false);
              load({ forceRefresh: true });
              loadHistory();
            }}
          />
        )}

        {editingId && (
          <div className={`mb-4 px-4 py-3 rounded-2xl text-sm flex items-center justify-between ${
            isDark
              ? "bg-[rgba(59,130,246,0.15)] border border-[rgba(59,130,246,0.25)] text-blue-400"
              : "bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.15)] text-blue-700"
          }`}>
            <span>Editing history entry</span>
            <button onClick={cancelEdit} className={`text-xs font-semibold underline ${isDark ? "text-blue-300" : ""}`}>
              Cancel
            </button>
          </div>
        )}

        {/* Spec Sections */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-16 rounded-3xl animate-pulse ${
                isDark ? "bg-[#1e1e1e]" : "bg-[rgba(30,51,49,0.04)]"
              }`} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {Object.keys(spec).map((section) => (
              <SpecSection
                key={`${section}-${sectionResetKey}`}
                title={labelForSection(section).toUpperCase()}
                defaultOpen={false}
                theme={theme}
              >
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(spec[section]).map((key) => {
                    const meta = fieldUiMeta(key);
                    return (
                      <div
                        key={key}
                        className={`rounded-xl p-2 border shadow-[0_2px_6px_rgba(0,0,0,0.03)] ${meta.fullWidth ? "col-span-2" : ""} ${
                          isDark
                            ? "bg-[#1a1a1a] border-[#2a2a2a]"
                            : "bg-[rgba(255,255,255,0.45)] border-[rgba(0,0,0,0.06)]"
                        }`}
                      >
                        <SpecField
                          label={labelForField(key)}
                          value={spec[section][key]}
                          onChange={(v) => setField(section, key, v)}
                          placeholder={meta.placeholder}
                          textarea={meta.isTextarea}
                          rows={meta.rows}
                          inputMode={meta.inputMode}
                          pattern={meta.pattern}
                          fullWidth={meta.fullWidth}
                          theme={theme}
                        />
                      </div>
                    );
                  })}
                </div>
              </SpecSection>
            ))}
          </motion.div>
        )}

        {/* History Section */}
        <div className="mt-8">
          <h2 className={`text-xs font-semibold tracking-[0.15em] uppercase mb-4 flex items-center justify-between ${
            isDark ? "text-[#ff6b2c]" : "text-[#5A7A70]"
          }`}>
            <span>History</span>
            <span className={`text-[10px] tracking-normal normal-case ${isDark ? "text-[#888888]" : "text-[#8A9A94]"}`}>{bikeTypeLabel}</span>
          </h2>

          {historyLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className={`h-14 rounded-2xl animate-pulse ${
                  isDark ? "bg-[#1e1e1e]" : "bg-[rgba(30,51,49,0.04)]"
                }`} />
              ))}
            </div>
          ) : historyRows.length ? (
            <div className="space-y-2">
              {historyRows.map((row) => {
                const rowKey = row.id || row.timestamp;
                const open = expandedHistoryId === rowKey;
                const specObj = normalizeSpec(row?.full_spec);

                return (
                  <div
                    key={rowKey}
                    className={`rounded-[26px] border backdrop-blur-sm ring-1 overflow-hidden ${
                      isDark
                        ? "border-[#2a2a2a] bg-[#1e1e1e] ring-[rgba(255,255,255,0.05)] shadow-[0_10px_28px_rgba(0,0,0,0.40)]"
                        : "border-[rgba(0,0,0,0.08)] bg-[rgba(232,228,220,0.75)] ring-[rgba(30,51,49,0.10)] shadow-[0_10px_28px_rgba(0,0,0,0.10)]"
                    }`}
                  >
                    <div className="w-full px-4 py-3 flex items-start justify-between gap-3">
                      {/* Clickable area for expand/collapse */}
                      <button
                        type="button"
                        onClick={() => setExpandedHistoryId(open ? null : rowKey)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className={`font-semibold text-sm font-mono tabular-nums ${isDark ? "text-white" : "text-[#1e3331]"}`}>
                          {formatDateTime(row.timestamp)}
                        </div>
                        <div className={`text-xs mt-0.5 ${isDark ? "text-[#888888]" : "text-[#8A9A94]"}`}>
                          {row.mechanic ? `By ${row.mechanic}` : ""}
                        </div>
                      </button>

                      {/* Right side: chevron + admin buttons */}
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedHistoryId(open ? null : rowKey)}
                          className={isDark ? "text-[#888888]" : "text-[#8A9A94]"}
                        >
                          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        {isAdmin && row.id && (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditFromRow(row)}
                              className={`rounded-lg border p-2 ${
                                isDark
                                  ? "border-[#333333] bg-[#252525] hover:bg-[#333333]"
                                  : "border-[rgba(233,78,27,0.25)] bg-[rgba(233,78,27,0.10)]"
                              }`}
                            >
                              <Pencil size={14} className={isDark ? "text-[#ff6b2c]" : "text-[#e94e1b]"} />
                            </button>
                            <button
                              type="button"
                              disabled={savingAdmin}
                              onClick={() => adminDeleteRow(row)}
                              className={`rounded-lg border p-2 ${
                                isDark
                                  ? "border-[#333333] bg-[#252525] hover:bg-[#333333]"
                                  : "border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.10)]"
                              }`}
                            >
                              <Trash2 size={14} className="text-red-500" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {open && specObj && (
                      <div className={`px-4 pb-4 border-t ${isDark ? "border-[#2a2a2a]" : "border-[rgba(0,0,0,0.06)]"}`}>
                        <div className="space-y-3 mt-3">
                          {Object.keys(specObj).map((sectionKey) => {
                            const sec = specObj[sectionKey];
                            if (!sec || typeof sec !== "object") return null;
                            const items = Object.entries(sec).filter((entry) => !isBlank(entry[1]));
                            if (!items.length) return null;

                            return (
                              <div
                                key={sectionKey}
                                className={`rounded-xl border p-3 ${
                                  isDark
                                    ? "border-[#333333] bg-[#252525]"
                                    : "border-[rgba(0,0,0,0.06)] bg-[rgba(30,51,49,0.03)]"
                                }`}
                              >
                                <div className={`font-bold text-xs mb-2 ${isDark ? "text-white" : "text-[#1e3331]"}`}>
                                  {labelForSection(sectionKey)}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {items.map(([k, v]) => {
                                    const isNumericValue = NUMERIC_KEYS.has(k);
                                    return (
                                      <div
                                        key={k}
                                        className={`rounded-xl px-3 py-2 border ${
                                          isDark
                                            ? "bg-[#1e1e1e] border-[#333333]"
                                            : "bg-[rgba(255,255,255,0.45)] border-[rgba(0,0,0,0.06)]"
                                        }`}
                                      >
                                        <div className={`text-[10px] font-semibold ${isDark ? "text-[#888888]" : "text-[#8A9A94]"}`}>
                                          {labelForField(k)}
                                        </div>
                                        <div className={`text-sm mt-0.5 whitespace-pre-wrap ${
                                          isDark ? "text-white" : "text-[#1e3331]"
                                        } ${isNumericValue ? "font-mono tabular-nums" : ""}`}>
                                          {String(v)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyStatePreset preset="spec" compact />
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
              ? `w-14 h-14 ${isDark ? "bg-[#1e1e1e] text-[#666666]" : "bg-[rgba(30,51,49,0.10)] text-[#8A9A94]"} cursor-not-allowed`
              : "w-14 h-14 bg-[#ff6b2c] text-white shadow-[0_8px_24px_rgba(255,107,44,0.40)] active:scale-95"
        }`}
      >
        <Save size={saving ? 28 : 22} className={saving ? "animate-spin" : ""} />
      </button>

      {/* Rider Picker Drawer */}
      <Drawer.Root open={riderPickerOpen} onOpenChange={setRiderPickerOpen}>
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
                Tap Rider &rarr; Switch
              </p>
            </div>

            {/* Rider Grid - Pyramid Layout */}
            <div className="px-4 pb-6">
              {/* Top row - 3 riders */}
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

              {/* Bottom row - 2 riders, centered */}
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

            {/* Bottom safe area padding */}
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
    </div>
  );
}
