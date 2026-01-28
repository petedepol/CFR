// BikeSpecPage.jsx - V3 Styled Bike Spec Form
// Full restyle of V2 FullSpecPage with V3 design system

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Wifi, WifiOff, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { Drawer } from "vaul";
import { motion } from "motion/react";

import { useAuth } from "../../auth/AuthProvider.jsx";
import { useToast } from "../../../components/ToastProvider.jsx";
import { ensureSession, fetchLatestFull, fetchFullHistory, fetchMeasurementById, insertFull, updateMeasurement, deleteMeasurement } from "../../measurements/api/measurementsApi";
import { FULL_SPEC_DEFAULTS } from "../../measurements/utils/fullSpecDefaults";
import {
  getCachedSpecLatest,
  getCachedSpecHistory,
  getCachedSpecMeta,
} from "../../../lib/offlineCache.js";
import { CachedDataBanner } from "../../../components/CachedDataBanner.jsx";

import { SpecSection } from "../components/SpecSection.jsx";
import { SpecField } from "../components/SpecField.jsx";

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
  { id: "ana", name: "Ana", image: "/riders/ana.jpeg" },
  { id: "charlie", name: "Charlie", image: "/riders/charlie.jpeg" },
  { id: "cole", name: "Cole", image: "/riders/cole.jpeg" },
  { id: "luca", name: "Luca", image: "/riders/luca.jpeg" },
  { id: "jolanda", name: "Jolanda", image: "/riders/jolanda.jpeg" },
];

const BIKE_TYPES = [
  { id: "race", label: "Race" },
  { id: "training", label: "Train" },
  { id: "ebike", label: "E-Bike" },
  { id: "road", label: "Road" },
  { id: "cx", label: "CX" },
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
  } catch {}
}
function clearDraft(rider, bikeType) {
  if (!rider) return;
  try {
    localStorage.removeItem(draftKey(rider, bikeType));
  } catch {}
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

  const rider = params.get("rider") || "";
  const bikeType = (() => {
    const bt = String(params.get("bike") || "race").toLowerCase();
    return ["race", "training", "ebike", "road", "cx"].includes(bt) ? bt : "race";
  })();
  const mechanic = displayName || "";

  // Rider picker state
  const [riderPickerOpen, setRiderPickerOpen] = useState(false);

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  const [spec, setSpec] = useState(() => clone(FULL_SPEC_DEFAULTS[bikeType] || FULL_SPEC_DEFAULTS.race));
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);

  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Offline cache state
  const [showingCached, setShowingCached] = useState(false);

  const lastSaveRef = useRef({ at: 0, sig: "" });
  const canSave = useMemo(() => mechanic && rider, [mechanic, rider]);

  const defaults = useMemo(() => FULL_SPEC_DEFAULTS[bikeType] || FULL_SPEC_DEFAULTS.race, [bikeType]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  // Load data on mount
  async function load({ silent = false, keepEdits = false, forceRefresh = false } = {}) {
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
        clearDraft(rider, bikeType);
        setEditingId(null);
        toast.success("Updated");
        await load({ silent: true, keepEdits: true });
        await loadHistory({ silent: true });
        return;
      }

      const res = await insertFull({ rider, mechanic, bikeType, fullSpec: spec, dedupeSig });
      lastSaveRef.current = { sig: dedupeSig, at: Date.now() };
      setDirty(false);
      clearDraft(rider, bikeType);

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
              <span className="text-xs font-semibold tracking-[0.15em] text-foreground/50 uppercase">Bike Spec</span>
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

        {/* Status indicators - softer styling */}
        {offline && (
          <div className="mb-4 px-4 py-3 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2">
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
          <div className="mb-4 px-4 py-3 rounded-2xl bg-blue-500/5 border border-blue-500/10 text-blue-600 dark:text-blue-400 text-sm flex items-center justify-between">
            <span>Editing history entry</span>
            <button onClick={cancelEdit} className="text-xs font-semibold underline">
              Cancel
            </button>
          </div>
        )}

        {/* Spec Sections */}
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
            {Object.keys(spec).map((section) => (
              <SpecSection
                key={section}
                title={labelForSection(section).toUpperCase()}
                defaultOpen={false}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.keys(spec[section]).map((key) => {
                    const meta = fieldUiMeta(key);
                    return (
                      <div
                        key={key}
                        className="rounded-2xl p-3"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.45)",
                          border: "1px solid rgba(0,0,0,0.06)",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                        }}
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
          <h2 className="text-xs font-semibold tracking-[0.15em] text-foreground/40 uppercase mb-4 flex items-center justify-between">
            <span>History</span>
            <span className="text-[10px] tracking-normal normal-case text-foreground/30">{bikeTypeLabel}</span>
          </h2>

          {historyLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl animate-pulse" />
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
                    className="rounded-[26px] border border-black/10 dark:border-white/[0.10] bg-white/[0.62] dark:bg-white/[0.06] backdrop-blur-[14px] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)]"
                  >
                    <div className="w-full px-4 py-3 flex items-start justify-between gap-3">
                      {/* Clickable area for expand/collapse */}
                      <button
                        type="button"
                        onClick={() => setExpandedHistoryId(open ? null : rowKey)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="text-foreground dark:text-white font-semibold text-sm">
                          {formatDateTime(row.timestamp)}
                        </div>
                        <div className="text-xs text-foreground/50 dark:text-white/50 mt-0.5">
                          {row.mechanic ? `By ${row.mechanic}` : ""}
                        </div>
                      </button>

                      {/* Right side: chevron + admin buttons */}
                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedHistoryId(open ? null : rowKey)}
                          className="text-foreground/40 dark:text-white/40"
                        >
                          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        {isAdmin && row.id && (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditFromRow(row)}
                              className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-2"
                            >
                              <Pencil size={14} className="text-orange-500" />
                            </button>
                            <button
                              type="button"
                              disabled={savingAdmin}
                              onClick={() => adminDeleteRow(row)}
                              className="rounded-lg border border-red-500/30 bg-red-500/10 p-2"
                            >
                              <Trash2 size={14} className="text-red-500" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {open && specObj && (
                      <div className="px-4 pb-4 border-t border-black/10 dark:border-white/10">
                        <div className="space-y-3 mt-3">
                          {Object.keys(specObj).map((sectionKey) => {
                            const sec = specObj[sectionKey];
                            if (!sec || typeof sec !== "object") return null;
                            const items = Object.entries(sec).filter(([_, v]) => !isBlank(v));
                            if (!items.length) return null;

                            return (
                              <div
                                key={sectionKey}
                                className="rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] p-3"
                              >
                                <div className="text-foreground dark:text-white font-bold text-xs mb-2">
                                  {labelForSection(sectionKey)}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {items.map(([k, v]) => (
                                    <div
                                      key={k}
                                      className="rounded-xl px-3 py-2"
                                      style={{
                                        backgroundColor: "rgba(255,255,255,0.45)",
                                        border: "1px solid rgba(0,0,0,0.06)",
                                        boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                                      }}
                                    >
                                      <div className="text-[10px] text-foreground/50 dark:text-white/50 font-semibold">
                                        {labelForField(k)}
                                      </div>
                                      <div className="text-sm text-foreground dark:text-white mt-0.5 whitespace-pre-wrap">
                                        {String(v)}
                                      </div>
                                    </div>
                                  ))}
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
            <div className="text-sm text-foreground/30 py-6 text-center">No history yet</div>
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
                    <span className={`font-semibold ${rider === r.name ? "text-orange-600 dark:text-orange-400" : "text-foreground"}`}>
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
