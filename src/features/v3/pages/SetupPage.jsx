// SetupPage.jsx - V3 Styled MTB Setup Form
// Race bike tire/suspension settings per rider with history

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, useOutletContext, useLocation } from "react-router-dom";
import { ArrowLeft, Save, Wifi, WifiOff, Pencil, Trash2, Flag, ChevronDown, ChevronRight, X, Zap } from "lucide-react";
import { Drawer } from "vaul";
// eslint-disable-next-line no-unused-vars
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
import { Avatar } from "../components/Avatar.jsx";

// Riders list (shared with other v3 pages)
const RIDERS = [
  { id: "ana", name: "Ana", image: "/riders/ana.png" },
  { id: "charlie", name: "Charlie", image: "/riders/charlie.png" },
  { id: "cole", name: "Cole", image: "/riders/cole.png" },
  { id: "luca", name: "Luca", image: "/riders/luca.png" },
  { id: "jolanda", name: "Jolanda", image: "/riders/jolanda.png" },
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
  const { isDark } = useOutletContext();

  const rider = params.get("rider") || "";
  const mechanic = displayName || "";

  // Rider picker state
  const [riderPickerOpen, setRiderPickerOpen] = useState(false);

  // Close modals on navigation (fixes iOS swipe-back leaving modals open)
  const location = useLocation();
  useEffect(() => {
    const closeAllModals = () => {
      setRiderPickerOpen(false);
    };

    // Close on route change
    closeAllModals();

    // Also listen to popstate for iOS swipe-back gesture
    window.addEventListener('popstate', closeAllModals);
    return () => window.removeEventListener('popstate', closeAllModals);
  }, [location.pathname]);

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  // Form state
  const [eventContext, setEventContext] = useState(readEventContextFallback());
  const [setup, setSetup] = useState(DEFAULT_SETUP);

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
  const [saving, setSaving] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);

  // Reset key to collapse sections after save
  const [sectionResetKey, setSectionResetKey] = useState(0);

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
  async function load({ silent = false, keepEdits = false } = {}) {
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
    // Convert comma to dot for pressure fields (European decimal separator)
    const isPressure = key.includes("pressure");
    const normalizedValue = isPressure && typeof value === "string"
      ? value.replace(/,/g, ".")
      : value;
    setDirty(true);
    setSetup((prev) => ({ ...prev, [key]: normalizedValue }));
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

    setSaving(true);
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(50);

    try {
      if (editingId && isAdmin) {
        setSavingAdmin(true);
        await updateMtbSettingsEntry({ id: editingId, eventContext, setup });
        lastSaveRef.current = { sig: dedupeSig, at: Date.now() };
        setDirty(false);
        dirtyRef.current = false;
        clearDraft(rider);
        setEditingId(null);
        toast.success("Updated");
        setSectionResetKey((k) => k + 1);
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
      dirtyRef.current = false;
      clearDraft(rider);

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

  // Theme-specific colors
  const theme = isDark ? "dark" : "light";
  const pageBackground = isDark ? "var(--bg-app)" : "var(--light-bg)";
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
                    ? "bg-app-surface text-white"
                    : "bg-[rgba(30,51,49,0.08)] text-text-accent-light"
                }`}
              >
                <ArrowLeft size={20} />
              </button>
              <span className={`text-xs font-semibold tracking-[0.15em] uppercase ${
                isDark ? "text-white" : "text-text-accent-light"
              }`}>MTB Setup</span>
            </div>

            {/* Status indicator */}
            <div className="flex items-center gap-2">
              {offline ? (
                <WifiOff size={16} className={isDark ? "text-text-muted" : "text-text-muted"} />
              ) : (
                <Wifi size={16} className={isDark ? "text-brand-orange" : "text-green-600"} />
              )}
              {dirty && <div className="w-2 h-2 rounded-full bg-brand-orange" />}
            </div>
          </div>

          {/* Rider Row - Glass Surface */}
          <div className={`flex items-center justify-between rounded-[26px] p-3.5 backdrop-blur-sm border ring-1 ${
            isDark
              ? "bg-app-surface border-chrome-strong ring-[rgba(255,255,255,0.05)] shadow-[0_10px_28px_rgba(0,0,0,0.40)]"
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
                      ? "bg-app-elevated border-chrome-strong border-b-2 border-b-brand-orange ring-[rgba(255,255,255,0.05)] shadow-[0_8px_20px_rgba(0,0,0,0.40)]"
                      : "bg-[rgba(30,51,49,0.12)] border-[rgba(0,0,0,0.08)] ring-[rgba(30,51,49,0.20)] shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
                  }`}>
                    <div className={`w-[50px] h-[50px] rounded-xl overflow-hidden border ${
                      isDark
                        ? "bg-app-surface border-[rgba(255,255,255,0.05)]"
                        : "bg-brand-green border-[rgba(255,255,255,0.1)]"
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
                  <span className={`font-bold tracking-[0.10em] ${isDark ? "text-white" : "text-brand-green"}`}>{rider?.toUpperCase()}</span>
                </button>
              );
            })()}

            {/* Race Bike Badge */}
            <div className={`px-3 py-1.5 rounded-xl ${
              isDark
                ? "bg-brand-orange border border-brand-orange"
                : "bg-[rgba(233,78,27,0.10)] border border-[rgba(233,78,27,0.20)]"
            }`}>
              <span className={`text-xs font-semibold ${isDark ? "text-white" : "text-[#e94e1b]"}`}>RACE BIKE</span>
            </div>
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
            fetchedAt={getCachedSettingsMeta(rider)?.fetchedAt}
            onRefresh={() => {
              setShowingCached(false);
              load();
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

        {/* Setup Form */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-16 rounded-3xl animate-pulse ${
                isDark ? "bg-app-surface" : "bg-[rgba(30,51,49,0.04)]"
              }`} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {/* Event/Context Section */}
            <SpecSection key={`event-${sectionResetKey}`} title="EVENT / CONTEXT" defaultOpen={false} theme={theme}>
              <input
                type="text"
                value={eventContext}
                onChange={(e) => { setEventContext(e.target.value); setDirty(true); }}
                placeholder="e.g. Nove Mesto WC2 / Wet"
                className={`w-full rounded-lg px-3 py-2 border transition-all duration-200 ${
                  isDark
                    ? "bg-app-elevated border-chrome-strong text-white placeholder:text-text-muted focus:border-brand-orange focus:ring-2 focus:ring-[rgba(233,78,27,0.25)]"
                    : "bg-[rgba(255,255,255,0.55)] border-[rgba(0,0,0,0.08)] text-brand-green placeholder:text-text-placeholder focus:border-[rgba(233,78,27,0.5)] focus:ring-2 focus:ring-[rgba(233,78,27,0.18)]"
                } focus:outline-none`}
              />
            </SpecSection>

            {/* Tyres Section */}
            <SpecSection key={`tyres-${sectionResetKey}`} title="TYRES" defaultOpen={false} theme={theme}>
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  label="Front Tyre"
                  value={setup.front_tyre}
                  onChange={(v) => setField("front_tyre", v)}
                  placeholder="e.g. Maxxis Assegai"
                  inputRef={setRefFor("front_tyre")}
                  onEnterNext={() => focusNextFrom("front_tyre")}
                  isDark={isDark}
                />
                <FormField
                  label="Rear Tyre"
                  value={setup.rear_tyre}
                  onChange={(v) => setField("rear_tyre", v)}
                  placeholder="e.g. Maxxis Dissector"
                  inputRef={setRefFor("rear_tyre")}
                  onEnterNext={() => focusNextFrom("rear_tyre")}
                  isDark={isDark}
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
                  isDark={isDark}
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
                  isDark={isDark}
                />
              </div>
            </SpecSection>

            {/* Suspension Section */}
            <SpecSection key={`suspension-${sectionResetKey}`} title="SUSPENSION" defaultOpen={false} theme={theme}>
              <div className="grid grid-cols-2 gap-2">
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
                  isDark={isDark}
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
                  isDark={isDark}
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
                  isDark={isDark}
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
                  isDark={isDark}
                />
              </div>

              {/* Neo Settings Button */}
              <button
                onClick={() => navigate(`/v3/neo?rider=${encodeURIComponent(rider)}`)}
                className="mt-4 w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-brand-orange text-white shadow-[0_8px_20px_rgba(233,78,27,0.35)] transition-all active:scale-[0.97]"
              >
                <Zap size={18} />
                <span className="font-semibold">Neo Settings</span>
              </button>
            </SpecSection>

            {/* Advanced Section (collapsed by default) */}
            <SpecSection key={`advanced-${sectionResetKey}`} title="ADVANCED" defaultOpen={false} theme={theme}>
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  label="Front Insert"
                  value={setup.front_insert}
                  onChange={(v) => setField("front_insert", v)}
                  placeholder="e.g. CushCore Pro"
                  isDark={isDark}
                />
                <FormField
                  label="Rear Insert"
                  value={setup.rear_insert}
                  onChange={(v) => setField("rear_insert", v)}
                  placeholder="e.g. CushCore XC"
                  isDark={isDark}
                />
                <FormField
                  label="Fork Spacers"
                  value={setup.fork_spacers}
                  onChange={(v) => setField("fork_spacers", v)}
                  placeholder="e.g. 2 x 5mm"
                  isDark={isDark}
                />
                <FormField
                  label="Shock Spacers"
                  value={setup.shock_spacers}
                  onChange={(v) => setField("shock_spacers", v)}
                  placeholder="e.g. 1 x 5mm"
                  isDark={isDark}
                />
                <FormField
                  label="Fork Compression"
                  value={setup.fork_compression}
                  onChange={(v) => setField("fork_compression", v)}
                  placeholder="e.g. LSC 8, HSC 2"
                  isDark={isDark}
                />
                <FormField
                  label="Shock Compression"
                  value={setup.shock_compression}
                  onChange={(v) => setField("shock_compression", v)}
                  placeholder="e.g. LSC 6, HSC 1"
                  isDark={isDark}
                />
                <FormField
                  label="Chainring"
                  value={setup.chainring}
                  onChange={(v) => setField("chainring", v)}
                  placeholder="e.g. 34T"
                  isDark={isDark}
                />
                <FormField
                  label="Cassette"
                  value={setup.cassette}
                  onChange={(v) => setField("cassette", v)}
                  placeholder="e.g. 10-52"
                  isDark={isDark}
                />
                <div className="col-span-2">
                  <FormField
                    label="Wheelset"
                    value={setup.wheelset}
                    onChange={(v) => setField("wheelset", v)}
                    placeholder="e.g. Reserve 30"
                    fullWidth
                    isDark={isDark}
                  />
                </div>
              </div>
            </SpecSection>

            {/* Notes Section */}
            <SpecSection key={`notes-${sectionResetKey}`} title="NOTES" defaultOpen={false} theme={theme}>
              <textarea
                ref={setRefFor("notes")}
                value={setup.notes ?? ""}
                onChange={(e) => setField("notes", e.target.value)}
                placeholder="Any observations / changes..."
                rows={2}
                className={`w-full rounded-lg px-3 py-2 border resize-none transition-all duration-200 ${
                  isDark
                    ? "bg-app-elevated border-chrome-strong text-white placeholder:text-text-muted focus:border-brand-orange focus:ring-2 focus:ring-[rgba(233,78,27,0.25)]"
                    : "bg-[rgba(255,255,255,0.55)] border-[rgba(0,0,0,0.08)] text-brand-green placeholder:text-text-placeholder focus:border-[rgba(233,78,27,0.5)] focus:ring-2 focus:ring-[rgba(233,78,27,0.18)]"
                } focus:outline-none`}
              />
            </SpecSection>
          </motion.div>
        )}

        {/* History Section */}
        <div className="mt-8">
          <h2 className={`text-xs font-semibold tracking-[0.15em] uppercase mb-4 font-sans ${
            isDark ? "text-brand-orange" : "text-text-accent-light"
          }`}>
            <span className={isDark ? "text-brand-orange" : ""}>Setup History</span>
            <span className={isDark ? "text-white" : ""}> ({history.length}{history.length !== historyRaw.length ? ` / ${historyRaw.length}` : ""})</span>
          </h2>

          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            <FilterChip active={range === "week"} onClick={() => setRange("week")} isDark={isDark}>This week</FilterChip>
            <FilterChip active={range === "30d"} onClick={() => setRange("30d")} isDark={isDark}>30 days</FilterChip>
            <FilterChip active={range === "all"} onClick={() => setRange("all")} isDark={isDark}>All</FilterChip>
            <FilterChip active={raceOnly} onClick={() => setRaceOnly((v) => !v)} isDark={isDark}>
              <Flag size={14} /> Race only
            </FilterChip>
          </div>

          {historyLoading ? (
            <div className={`h-32 rounded-[26px] animate-pulse ${
              isDark ? "bg-app-surface" : "bg-[rgba(30,51,49,0.04)]"
            }`} />
          ) : history.length ? (
            <div className="space-y-2">
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

                // Border classes for race/changes/default
                const borderClass = isDark
                  ? isRace
                    ? "border-[rgba(234,179,8,0.50)]"
                    : hasAnyChanges
                    ? "border-brand-orange"
                    : "border-chrome-strong"
                  : isRace
                    ? "border-[rgba(234,179,8,0.35)]"
                    : hasAnyChanges
                    ? "border-[rgba(233,78,27,0.35)]"
                    : "border-[rgba(0,0,0,0.08)]";

                return (
                  <div
                    key={id}
                    className={`rounded-[26px] overflow-hidden backdrop-blur-sm ring-1 transition border ${borderClass} ${
                      isDark
                        ? "bg-app-surface ring-[rgba(255,255,255,0.05)] shadow-[0_10px_28px_rgba(0,0,0,0.40)]"
                        : "bg-[rgba(232,228,220,0.75)] ring-[rgba(30,51,49,0.10)] shadow-[0_10px_28px_rgba(0,0,0,0.10)]"
                    }`}
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
                            <ChevronDown size={18} className={`mt-0.5 shrink-0 ${isDark ? "text-brand-orange" : "text-[#e94e1b]"}`} />
                          ) : (
                            <ChevronRight size={18} className={`mt-0.5 shrink-0 ${isDark ? "text-text-muted" : "text-text-muted"}`} />
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-bold truncate ${isDark ? "text-white" : "text-brand-green"}`}>{row.mechanic || "—"}</span>
                              <span className={`text-xs font-mono tabular-nums ${isDark ? "text-text-muted" : "text-text-muted"}`}>{formatTimestamp(row.timestamp)}</span>

                              {!!fs?.event_context && (
                                <span className={`text-xs px-2 py-0.5 rounded-2xl border ${
                                  isDark
                                    ? "text-brand-orange bg-[rgba(233,78,27,0.15)] border-[rgba(233,78,27,0.30)]"
                                    : "text-[#e94e1b] bg-[rgba(233,78,27,0.10)] border-[rgba(233,78,27,0.20)]"
                                }`}>
                                  {fs.event_context}
                                </span>
                              )}

                              {isRace && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-2xl border inline-flex items-center gap-1 ${
                                  isDark
                                    ? "text-yellow-400 bg-[rgba(234,179,8,0.20)] border-[rgba(234,179,8,0.40)]"
                                    : "text-yellow-700 bg-[rgba(234,179,8,0.12)] border-[rgba(234,179,8,0.25)]"
                                }`}>
                                  <Flag size={12} /> Race
                                </span>
                              )}

                              {hasExpandedOnlyChanges && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-2xl border ${
                                  isDark
                                    ? "bg-[rgba(233,78,27,0.15)] text-brand-orange border-[rgba(233,78,27,0.30)]"
                                    : "bg-[rgba(210,74,31,0.10)] text-brand-orange-lo border-[rgba(210,74,31,0.20)]"
                                }`}>
                                  Other changed
                                </span>
                              )}

                              {isLatest && changes?.notesChanged && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-2xl border ${
                                  isDark
                                    ? "bg-[rgba(233,78,27,0.15)] text-brand-orange border-[rgba(233,78,27,0.30)]"
                                    : "bg-[rgba(210,74,31,0.10)] text-brand-orange-lo border-[rgba(210,74,31,0.20)]"
                                }`}>
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
                            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition inline-flex items-center gap-1.5 active:scale-[0.97] ${
                              offline || !row?.id
                                ? isDark
                                  ? "bg-app-elevated text-text-muted border-chrome-strong cursor-not-allowed"
                                  : "bg-[rgba(18,38,33,0.04)] text-text-muted border-[rgba(0,0,0,0.05)] cursor-not-allowed"
                                : isRace
                                ? isDark
                                  ? "bg-[rgba(234,179,8,0.20)] text-yellow-400 border-[rgba(234,179,8,0.40)]"
                                  : "bg-[rgba(234,179,8,0.15)] text-yellow-700 border-[rgba(234,179,8,0.30)]"
                                : isDark
                                  ? "bg-app-elevated text-text-muted border-chrome-strong"
                                  : "bg-[rgba(255,255,255,0.60)] text-text-accent-light border-[rgba(0,0,0,0.08)]"
                            }`}
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
                                className={`rounded-lg p-1.5 border transition active:scale-[0.97] ${
                                  offline || !row?.id
                                    ? isDark
                                      ? "bg-app-elevated text-text-muted border-chrome-strong cursor-not-allowed"
                                      : "bg-[rgba(18,38,33,0.04)] text-text-muted border-[rgba(0,0,0,0.05)] cursor-not-allowed"
                                    : isDark
                                      ? "bg-app-elevated text-brand-orange border-chrome-strong hover:bg-chrome-strong"
                                      : "bg-[rgba(210,74,31,0.10)] text-brand-orange-lo border-[rgba(210,74,31,0.25)]"
                                }`}
                                title="Edit (admin)"
                              >
                                <Pencil size={14} />
                              </button>

                              <button
                                onClick={() => adminDeleteRow(row)}
                                disabled={offline || !row?.id || savingAdmin}
                                className={`rounded-lg p-1.5 border transition active:scale-[0.97] ${
                                  offline || !row?.id || savingAdmin
                                    ? isDark
                                      ? "bg-app-elevated text-text-muted border-chrome-strong cursor-not-allowed"
                                      : "bg-[rgba(18,38,33,0.04)] text-text-muted border-[rgba(0,0,0,0.05)] cursor-not-allowed"
                                    : isDark
                                      ? "bg-app-elevated text-red-500 border-chrome-strong hover:bg-chrome-strong"
                                      : "bg-[rgba(239,68,68,0.10)] text-red-600 border-[rgba(239,68,68,0.25)]"
                                }`}
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
                          className={`p-2.5 rounded-xl ${
                            isDark
                              ? it.changed
                                ? "bg-[rgba(233,78,27,0.15)] border border-[rgba(233,78,27,0.30)]"
                                : "bg-app-elevated border border-chrome-strong"
                              : it.changed
                                ? "bg-[rgba(210,74,31,0.10)] border border-[rgba(210,74,31,0.25)] shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                                : "bg-[rgba(255,255,255,0.45)] border border-[rgba(0,0,0,0.06)] shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                          }`}
                        >
                          <div className={`text-[11px] ${
                            isDark
                              ? it.changed ? "text-brand-orange" : "text-text-muted"
                              : it.changed ? "text-brand-orange-lo" : "text-text-muted"
                          }`}>{it.label}</div>
                          <div className={`font-semibold truncate tabular-nums font-mono ${isDark ? "text-white" : "text-[#1F3D36]"}`}>{it.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className={`px-4 pb-4 pt-2 border-t ${isDark ? "border-chrome-strong" : "border-[rgba(0,0,0,0.06)]"}`}>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {EXPANDED_KEYS.map((k) => {
                            const v = cur?.[k];
                            if (!v) return null;
                            const expandedChanged = isLatest && changes?.expandedChanged.includes(k);
                            return (
                              <div
                                key={k}
                                className={`p-2.5 rounded-xl ${k === "wheelset" ? "col-span-2" : ""} ${
                                  isDark
                                    ? expandedChanged
                                      ? "bg-[rgba(233,78,27,0.15)] border border-[rgba(233,78,27,0.30)]"
                                      : "bg-app-elevated border border-chrome-strong"
                                    : expandedChanged
                                      ? "bg-[rgba(233,78,27,0.10)] border border-[rgba(233,78,27,0.25)] shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                                      : "bg-[rgba(255,255,255,0.45)] border border-[rgba(0,0,0,0.06)] shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                                }`}
                              >
                                <div className={`text-[11px] ${
                                  isDark
                                    ? expandedChanged ? "text-brand-orange" : "text-text-muted"
                                    : expandedChanged ? "text-[#e94e1b]" : "text-text-muted"
                                }`}>{labelize(k)}</div>
                                <div className={`font-semibold break-words ${isDark ? "text-white" : "text-brand-green"}`}>{v}</div>
                              </div>
                            );
                          })}
                        </div>

                        {!!cur?.notes && (
                          <div
                            className={`mt-3 p-2.5 rounded-xl ${
                              isDark
                                ? isLatest && changes?.notesChanged
                                  ? "bg-[rgba(233,78,27,0.15)] border border-[rgba(233,78,27,0.30)]"
                                  : "bg-app-elevated border border-chrome-strong"
                                : isLatest && changes?.notesChanged
                                  ? "bg-[rgba(233,78,27,0.10)] border border-[rgba(233,78,27,0.25)] shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                                  : "bg-[rgba(255,255,255,0.45)] border border-[rgba(0,0,0,0.06)] shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                            }`}
                          >
                            <div className={`text-[11px] ${
                              isDark
                                ? isLatest && changes?.notesChanged ? "text-brand-orange" : "text-text-muted"
                                : isLatest && changes?.notesChanged ? "text-[#e94e1b]" : "text-text-muted"
                            }`}>Notes</div>
                            <div className={`italic break-words ${isDark ? "text-text-secondary" : "text-text-accent-light"}`}>"{cur.notes}"</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`text-sm py-6 text-center ${isDark ? "text-text-muted" : "text-text-muted"}`}>
              No history for this filter. Try switching to <span className={`font-bold ${isDark ? "text-white" : "text-brand-green"}`}>All</span>.
            </div>
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
              ? `w-14 h-14 ${isDark ? "bg-app-surface text-text-muted" : "bg-[rgba(30,51,49,0.10)] text-text-muted"} cursor-not-allowed`
              : "w-14 h-14 bg-brand-orange text-white shadow-[0_8px_24px_rgba(233,78,27,0.40)] active:scale-95"
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
              isDark ? "border-chrome-strong" : "border-[rgba(0,0,0,0.08)]"
            }`}
            style={{
              background: isDark
                ? "var(--bg-surface)"
                : "radial-gradient(400px 300px at 50% 100%, rgba(30,51,49,0.15), transparent 70%)," +
                  "rgba(232,228,220,0.98)",
            }}
          >
            {/* Drag handle */}
            <div className="p-4 rounded-t-[32px] flex-none">
              <div className={`mx-auto w-12 h-1.5 flex-shrink-0 rounded-full ${
                isDark ? "bg-text-muted" : "bg-[rgba(30,51,49,0.15)]"
              }`} />
            </div>

            {/* Rider Grid - Pyramid Layout */}
            <div className="px-4 py-6">
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
    </div>
  );
}

// ----- Subcomponents -----

function FormField({ label, value, onChange, placeholder, unit, inputMode, pattern, inputRef, onEnterNext, fullWidth, textarea, rows, isDark }) {
  // Check if this is a numeric measurement field
  const isNumeric = inputMode === "decimal" || inputMode === "numeric";

  return (
    <div
      className={`rounded-xl p-2 border ${fullWidth ? "col-span-full" : ""} ${
        isDark
          ? "bg-app-bg border-chrome-strong"
          : "bg-[rgba(255,255,255,0.45)] border-[rgba(0,0,0,0.06)] shadow-[0_2px_6px_rgba(0,0,0,0.03)]"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-medium ${isDark ? "text-text-muted" : "text-text-accent-light"}`}>{label}</span>
        {unit && (
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
            isDark
              ? "text-text-muted bg-app-surface"
              : "text-text-muted bg-[rgba(30,51,49,0.04)]"
          }`}>
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
          className={`w-full bg-transparent outline-none resize-none ${
            isDark
              ? "text-white placeholder:text-text-muted"
              : "text-brand-green placeholder:text-text-muted"
          }`}
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
          className={`w-full bg-transparent outline-none ${
            isDark
              ? "text-white placeholder:text-text-muted"
              : "text-brand-green placeholder:text-text-muted"
          } ${isNumeric ? "font-mono text-lg tabular-nums" : ""}`}
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

function FilterChip({ active, onClick, children, isDark }) {
  const baseStyle = "px-3 py-2 rounded-full text-xs font-semibold border transition inline-flex items-center gap-1.5 active:scale-[0.97]";

  if (active) {
    return (
      <button
        onClick={onClick}
        className={`${baseStyle} ${
          isDark
            ? "bg-brand-orange text-white border-brand-orange"
            : "bg-[rgba(233,78,27,0.12)] text-[#e94e1b] border-[rgba(233,78,27,0.25)]"
        }`}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${baseStyle} ${
        isDark
          ? "bg-app-elevated text-text-muted border-chrome-strong hover:bg-chrome-strong"
          : "bg-[rgba(30,51,49,0.06)] text-text-accent-light border-[rgba(0,0,0,0.06)] hover:bg-[rgba(30,51,49,0.10)]"
      }`}
    >
      {children}
    </button>
  );
}
