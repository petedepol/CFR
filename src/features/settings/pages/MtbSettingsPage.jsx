import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, ChevronRight, ChevronDown, History, WifiOff, Flag } from "lucide-react";

import { useAuth } from "../../auth/AuthProvider.jsx";
import { fetchRiders } from "../../measurements/api/measurementsApi";
import {
  fetchMtbSettingsHistory,
  fetchLatestMtbSettings,
  insertMtbSettings,
  setMtbSettingsRaceMark,
} from "../api/settingsApi";
import { useToast } from "../../../components/ToastProvider.jsx";

const LS_EVENT_CONTEXT = "cfr_settings_event_context_last";
const LS_DRAFT_PREFIX = "cfr_settings_mtb_setup_draft__"; // + riderName

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

function labelize(key) {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function formatTimestamp(iso) {
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

function draftKey(rider) {
  return `${LS_DRAFT_PREFIX}${encodeURIComponent(rider || "")}`;
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

function changedCellClass(changed) {
  return changed
    ? "bg-lime-400/10 p-2 rounded border border-lime-400/25"
    : "p-2 rounded border border-white/0";
}

function fmtPsi(v) {
  const s = String(v ?? "").trim();
  return s ? `${s} psi` : "—";
}

function fmtClicks(v) {
  const s = String(v ?? "").trim();
  return s ? `${s} clicks` : "—";
}

function buildCollapsedSummary(cur, prev, isLatest, changes) {
  const changedKeys = new Set((isLatest && changes?.defaultChanged) || []);
  const mk = (label, keys, value, prevValue) => {
    const changed = isLatest && keys.some((k) => changedKeys.has(k));
    return { label, value: value || "—", prevValue: prevValue || "—", changed };
  };

  return [
    mk("Front tyre", ["front_tyre"], cur.front_tyre || "—", prev.front_tyre || "—"),
    mk("Rear tyre", ["rear_tyre"], cur.rear_tyre || "—", prev.rear_tyre || "—"),
    mk("Front pressure", ["front_pressure"], fmtPsi(cur.front_pressure), fmtPsi(prev.front_pressure)),
    mk("Rear pressure", ["rear_pressure"], fmtPsi(cur.rear_pressure), fmtPsi(prev.rear_pressure)),
    mk(
      "Fork",
      ["fork_pressure", "fork_rebound"],
      `${fmtPsi(cur.fork_pressure)} / ${fmtClicks(cur.fork_rebound)}`,
      `${fmtPsi(prev.fork_pressure)} / ${fmtClicks(prev.fork_rebound)}`
    ),
    mk(
      "Shock",
      ["shock_pressure", "shock_rebound"],
      `${fmtPsi(cur.shock_pressure)} / ${fmtClicks(cur.shock_rebound)}`,
      `${fmtPsi(prev.shock_pressure)} / ${fmtClicks(prev.shock_rebound)}`
    ),
  ];
}

// Start of week = Monday 00:00 (local time)
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

function chipClass(active) {
  return [
    "px-3 py-2 rounded-2xl text-xs font-black border transition inline-flex items-center gap-2",
    active ? "bg-lime-300 text-black border-lime-200" : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10",
  ].join(" ");
}

function isPressureKey(k) {
  return k === "front_pressure" || k === "rear_pressure" || k === "fork_pressure" || k === "shock_pressure";
}
function isReboundKey(k) {
  return k === "fork_rebound" || k === "shock_rebound";
}

function InputField({ k, value, onChange, inputRef, onEnterNext, enterHint }) {
  const numericPressure = isPressureKey(k);
  const numericRebound = isReboundKey(k);

  const common = {
    ref: inputRef,
    value: value ?? "",
    onChange: (e) => onChange(e.target.value),
    className:
      "w-full px-3 py-2 bg-black border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-lime-400",
    autoComplete: "off",
    enterKeyHint: enterHint || "next",
    onKeyDown: (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onEnterNext?.();
      }
    },
  };

  if (numericPressure) {
    return (
      <input
        {...common}
        inputMode="decimal"
        pattern="[0-9]*"
        placeholder="e.g. 18"
        aria-label={labelize(k)}
      />
    );
  }

  if (numericRebound) {
    return (
      <input
        {...common}
        inputMode="numeric"
        pattern="[0-9]*"
        placeholder="e.g. 10"
        aria-label={labelize(k)}
      />
    );
  }

  return <input {...common} aria-label={labelize(k)} />;
}

export default function MtbSettingsPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const riderParam = params.get("rider") || "";

  const toast = useToast();
  const { displayName } = useAuth();

  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(riderParam);

  const [eventContext, setEventContext] = useState(readEventContextFallback());
  const [setup, setSetup] = useState(DEFAULT_SETUP);

  const [showExpanded, setShowExpanded] = useState(false);
  const [historyRaw, setHistoryRaw] = useState([]);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState(() => new Set());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // history filters
  const [range, setRange] = useState("week"); // week | 30d | all
  const [raceOnly, setRaceOnly] = useState(false);

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  // refs for fast "Next" focusing
  const inputRefs = useRef({});
  const lastAutoFocusRiderRef = useRef("");

  const setRefFor = useCallback((key) => {
    return (el) => {
      inputRefs.current[key] = el;
    };
  }, []);

  const focusKey = useCallback((key) => {
    const el = inputRefs.current[key];
    if (el && typeof el.focus === "function") el.focus();
  }, []);

  const focusNextFrom = useCallback(
    (key) => {
      const idx = FAST_ORDER.indexOf(key);
      if (idx < 0) return;
      const nextKey = FAST_ORDER[idx + 1];
      if (nextKey) focusKey(nextKey);
      else {
        // no next -> blur
        const el = inputRefs.current[key];
        if (el && typeof el.blur === "function") el.blur();
      }
    },
    [focusKey]
  );

  useEffect(() => {
    if (selectedRider) setParams({ rider: selectedRider }, { replace: true });
  }, [selectedRider, setParams]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetchRiders();
        if (!alive) return;
        setRiders(r);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    writeEventContext(eventContext);
  }, [eventContext]);

  const hydrateFromRow = useCallback((row) => {
    const blob = safeFullSpec(row?.full_spec);
    const nextCtx = String(blob?.event_context ?? "");
    const nextSetup = normalizeSetup(blob?.setup);

    setEventContext(nextCtx || readEventContextFallback());
    setSetup(nextSetup);
  }, []);

  const loadAll = useCallback(async () => {
    if (!selectedRider) return;
    setLoading(true);
    try {
      const [latest, hist] = await Promise.all([
        fetchLatestMtbSettings(selectedRider),
        fetchMtbSettingsHistory(selectedRider, 250),
      ]);

      setHistoryRaw(hist || []);

      if (latest) {
        hydrateFromRow(latest);
        clearDraft(selectedRider);
      } else {
        const d = readDraft(selectedRider);
        if (d) {
          setEventContext(d.eventContext || readEventContextFallback());
          setSetup(normalizeSetup(d.setup));
        } else {
          setEventContext(readEventContextFallback());
          setSetup(DEFAULT_SETUP);
        }
      }
    } catch (e) {
      toast.error(`Failed to load settings: ${e?.message || "unknown error"}`);
    } finally {
      setLoading(false);
    }
  }, [selectedRider, hydrateFromRow, toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!selectedRider) return;
    writeDraft(selectedRider, eventContext, setup);
  }, [selectedRider, eventContext, setup]);

  // Auto-focus front tyre once after selecting a rider (and once data has loaded)
  useEffect(() => {
    if (!selectedRider) return;
    if (loading) return;

    if (lastAutoFocusRiderRef.current === selectedRider) return;
    lastAutoFocusRiderRef.current = selectedRider;

    // allow paint
    setTimeout(() => {
      focusKey("front_tyre");
    }, 50);
  }, [selectedRider, loading, focusKey]);

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

  const toggleHistoryExpand = (id) => {
    setExpandedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!selectedRider) {
      toast.warning("Select a rider first");
      return;
    }
    if (!displayName) {
      toast.error("No mechanic name (auth not ready)");
      return;
    }
    if (saving) return;

    const dedupeSig = JSON.stringify({ rider: selectedRider, mechanic: displayName, eventContext, setup });

    setSaving(true);
    try {
      const res = await insertMtbSettings({
        rider: selectedRider,
        mechanic: displayName,
        eventContext,
        setup,
        dedupeSig,
      });

      clearDraft(selectedRider);

      if (res?.queued) {
        toast.success("Saved offline — queued to sync");
      } else {
        toast.success("Saved ✓");
        await loadAll();
      }
    } catch (e) {
      toast.error(`Save failed: ${e?.message || "unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  async function toggleRace(row, nextValue) {
    if (offline) {
      toast.warning("Offline — can’t mark Race right now");
      return;
    }
    if (!row?.id) {
      toast.error("This entry has no id (can’t update)");
      return;
    }

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
      await loadAll();
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 pb-10">
      {/* Minimal header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <button
          onClick={() => nav("/settings")}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-black/40 hover:bg-black/55 border border-white/10 hover:border-white/20 text-white/80 transition"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        <div className="flex items-center gap-2">
          {offline ? (
            <div className="inline-flex items-center gap-2 text-xs text-yellow-200/90 bg-yellow-400/10 border border-yellow-400/20 px-3 py-2 rounded-2xl">
              <WifiOff size={14} />
              Offline
            </div>
          ) : null}

          <div className="text-xs text-white/70 bg-white/5 border border-white/10 px-3 py-2 rounded-2xl max-w-[160px] truncate">
            {displayName || "—"}
          </div>
        </div>
      </div>

      {/* Quick entry area */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-4 mb-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-black text-white/55 uppercase mb-1">Rider</label>
            <select
              value={selectedRider}
              onChange={(e) => setSelectedRider(e.target.value)}
              className="w-full px-4 py-3 bg-black border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-lime-400"
            >
              <option value="">-- Select Rider --</option>
              {riders.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.flag} {r.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black text-white/55 uppercase mb-1">Event / Context</label>
            <input
              value={eventContext}
              onChange={(e) => setEventContext(e.target.value)}
              placeholder="e.g., Nove Mesto WC2 / Wet"
              className="w-full px-4 py-3 bg-black border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-lime-400"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {/* CURRENT SETUP */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-4 mb-3">
        {!selectedRider ? (
          <div className="text-white/60 py-5">Select a rider to start.</div>
        ) : loading ? (
          <div className="py-5 space-y-3">
            <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {DEFAULT_KEYS.map((k) => {
                const idx = FAST_ORDER.indexOf(k);
                const enterHint = idx === FAST_ORDER.length - 1 ? "done" : "next";
                return (
                  <div key={k}>
                    <label className="block text-[11px] font-black text-white/55 uppercase mb-1">
                      {labelize(k)}
                      {k.includes("pressure") ? " (psi)" : ""}
                      {k.includes("rebound") ? " (clicks)" : ""}
                    </label>

                    <InputField
                      k={k}
                      value={setup[k]}
                      inputRef={setRefFor(k)}
                      enterHint={enterHint}
                      onEnterNext={() => focusNextFrom(k)}
                      onChange={(v) => setSetup((p) => ({ ...p, [k]: v }))}
                    />
                  </div>
                );
              })}

              <div className="md:col-span-2">
                <label className="block text-[11px] font-black text-white/55 uppercase mb-1">Notes</label>
                <textarea
                  ref={setRefFor("notes")}
                  rows={2}
                  value={setup.notes}
                  onChange={(e) => setSetup((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-lime-400"
                  placeholder="Any observations / changes…"
                  autoComplete="off"
                  enterKeyHint="done"
                />
              </div>
            </div>

            <button
              onClick={() => setShowExpanded((s) => !s)}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-xl bg-lime-400/10 text-lime-300 border border-lime-400/20 hover:bg-lime-400/15 transition"
            >
              {showExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              {showExpanded ? "Hide" : "More"}
            </button>

            {showExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/10">
                {EXPANDED_KEYS.map((k) => (
                  <div key={k} className={k === "wheelset" ? "md:col-span-2" : ""}>
                    <label className="block text-[11px] font-black text-white/55 uppercase mb-1">{labelize(k)}</label>
                    <input
                      value={setup[k]}
                      onChange={(e) => setSetup((p) => ({ ...p, [k]: e.target.value }))}
                      className="w-full px-3 py-2 bg-black border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-lime-400"
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full mt-4 py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 shadow-2xl transition ${
                saving
                  ? "bg-white/10 text-white/30 cursor-not-allowed border border-white/10"
                  : "bg-gradient-to-r from-lime-400 to-green-500 text-black hover:from-lime-500 hover:to-green-600"
              }`}
            >
              <Save size={22} />
              {saving ? "SAVING…" : offline ? "SAVE (QUEUE)" : "SAVE"}
            </button>
          </>
        )}
      </div>

      {/* HISTORY */}
      {selectedRider && (historyRaw?.length || 0) > 0 && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-4">
          <div className="text-white font-black mb-3 flex items-center gap-2">
            <span>History</span>
            <span className="text-white/50 font-bold">
              ({history.length}
              {history.length !== historyRaw.length ? ` / ${historyRaw.length}` : ""})
            </span>
            <History size={18} className="text-lime-300 ml-1" />
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <button className={chipClass(range === "week")} onClick={() => setRange("week")}>
              This week
            </button>
            <button className={chipClass(range === "30d")} onClick={() => setRange("30d")}>
              30 days
            </button>
            <button className={chipClass(range === "all")} onClick={() => setRange("all")}>
              All
            </button>

            <button className={chipClass(raceOnly)} onClick={() => setRaceOnly((v) => !v)}>
              <Flag size={14} />
              Race only
            </button>
          </div>

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

              const summaryItems = buildCollapsedSummary(cur, prev, isLatest, changes);

              return (
                <div
                  key={id}
                  className={`bg-black/40 rounded-xl border overflow-hidden cursor-pointer transition ${
                    isRace
                      ? "border-yellow-400/35"
                      : isLatest && (changes?.defaultChanged.length || hasExpandedOnlyChanges || changes?.notesChanged)
                      ? "border-lime-400/40"
                      : "border-white/10 hover:border-white/20"
                  }`}
                  onClick={() => toggleHistoryExpand(id)}
                >
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isExpanded ? (
                        <ChevronDown size={18} className="text-lime-300" />
                      ) : (
                        <ChevronRight size={18} className="text-white/50" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white truncate">{row.mechanic || "—"}</span>
                          <span className="text-xs text-white/50">{formatTimestamp(row.timestamp)}</span>

                          {!!fs?.event_context && (
                            <span className="text-xs text-lime-300/80 px-2 py-0.5 bg-lime-400/10 rounded border border-lime-400/20">
                              {fs.event_context}
                            </span>
                          )}

                          {isRace && (
                            <span className="text-xs font-black text-yellow-200 px-2 py-0.5 bg-yellow-400/10 rounded border border-yellow-400/20 inline-flex items-center gap-1">
                              <Flag size={12} /> Race
                            </span>
                          )}

                          {hasExpandedOnlyChanges && (
                            <span className="text-xs font-bold text-yellow-300 px-2 py-0.5 bg-yellow-400/10 rounded border border-yellow-400/20">
                              Other changed
                            </span>
                          )}

                          {isLatest && changes?.notesChanged && (
                            <span className="text-xs font-bold text-lime-300 px-2 py-0.5 bg-lime-400/10 rounded border border-lime-400/20">
                              Notes changed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleRace(row, !isRace);
                      }}
                      disabled={offline || !row?.id}
                      className={[
                        "shrink-0 rounded-2xl px-3 py-2 text-xs font-black border transition inline-flex items-center gap-2",
                        offline || !row?.id
                          ? "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
                          : isRace
                          ? "bg-yellow-400/15 text-yellow-100 border-yellow-400/25 hover:bg-yellow-400/20"
                          : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10",
                      ].join(" ")}
                      title={offline ? "Offline" : isRace ? "Unmark race" : "Mark as race"}
                    >
                      <Flag size={14} />
                      {isRace ? "Race" : "Mark race"}
                    </button>
                  </div>

                  <div className="px-4 pb-4 grid grid-cols-2 gap-3 text-sm">
                    {summaryItems.map((it) => (
                      <div key={it.label} className={changedCellClass(it.changed)}>
                        <div className="text-white/50 text-xs">{it.label}</div>
                        <div className={`font-medium truncate ${it.changed ? "text-lime-200" : "text-white"}`}>
                          {it.value || "—"}
                        </div>
                        {it.changed && (
                          <div className="text-[11px] text-white/45 truncate mt-0.5">
                            Prev: <span className="text-white/55">{it.prevValue || "—"}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-white/10">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {EXPANDED_KEYS.map((k) => {
                          const v = cur?.[k];
                          const changed = isLatest && changes?.expandedChanged.includes(k);
                          if (!v && !changed) return null;
                          return (
                            <div
                              key={k}
                              className={changed ? "bg-lime-400/10 p-2 rounded border border-lime-400/25" : "p-2"}
                            >
                              <div className="text-white/50 text-xs">{labelize(k)}</div>
                              <div className="text-white font-medium">{v || "—"}</div>
                            </div>
                          );
                        })}
                      </div>

                      {!!cur?.notes && (
                        <div className="mt-3">
                          <div className="text-white/50 text-xs">Notes</div>
                          <div className="text-white/80 italic">“{cur.notes}”</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {history.length === 0 && (
              <div className="text-white/60 py-6">
                No entries for this filter. Try switching to <span className="font-black text-white">All</span>.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
