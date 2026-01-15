import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, ChevronRight, ChevronDown, History, WifiOff } from "lucide-react";

import { useAuth } from "../../auth/AuthProvider.jsx";
import { fetchRiders } from "../../measurements/api/measurementsApi";
import { fetchMtbSettingsHistory, fetchLatestMtbSettings, insertMtbSettings } from "../api/settingsApi";
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
  const [history, setHistory] = useState([]);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState(() => new Set());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

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
    const blob = row?.full_spec || {};
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
        fetchMtbSettingsHistory(selectedRider, 60),
      ]);

      setHistory(hist || []);

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

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
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

      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-10 bg-lime-400 rounded-full" />
        <div>
          <div className="text-sm text-white/60 uppercase tracking-widest">MTB</div>
          <h1 className="text-2xl md:text-3xl font-black text-white">Setup Settings</h1>
        </div>
      </div>

      {/* CONTEXT */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-5 mb-4">
        <div className="text-white font-black mb-3 flex items-center gap-2">
          <div className="w-1 h-6 bg-lime-400 rounded-full" />
          CONTEXT
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-white/60 uppercase mb-2">Rider</label>
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
            <label className="block text-xs font-bold text-white/60 uppercase mb-2">
              Event / Context <span className="text-white/40 normal-case">(auto-fills)</span>
            </label>
            <input
              value={eventContext}
              onChange={(e) => setEventContext(e.target.value)}
              placeholder="e.g., Lenzerheide XCO / Wet"
              className="w-full px-4 py-3 bg-black border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-lime-400"
            />
          </div>
        </div>
      </div>

      {/* CURRENT SETUP */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-5 mb-4">
        <div className="text-white font-black mb-3 flex items-center gap-2">
          <div className="w-1 h-6 bg-lime-400 rounded-full" />
          CURRENT SETUP
        </div>

        {!selectedRider ? (
          <div className="text-white/60 py-6">Select a rider to start.</div>
        ) : loading ? (
          <div className="py-6 space-y-3">
            <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
            <div className="h-10 bg-white/5 rounded-xl animate-pulse" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEFAULT_KEYS.map((k) => (
                <div key={k}>
                  <label className="block text-xs font-bold text-white/60 uppercase mb-1">
                    {labelize(k)}
                    {k.includes("pressure") ? " (psi)" : ""}
                    {k.includes("rebound") ? " (clicks)" : ""}
                  </label>
                  <input
                    value={setup[k]}
                    onChange={(e) => setSetup((p) => ({ ...p, [k]: e.target.value }))}
                    className="w-full px-3 py-2 bg-black border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-lime-400"
                  />
                </div>
              ))}

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-white/60 uppercase mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={setup.notes}
                  onChange={(e) => setSetup((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-lime-400"
                  placeholder="Any observations / changes…"
                />
              </div>
            </div>

            <button
              onClick={() => setShowExpanded((s) => !s)}
              className="w-full mt-4 flex items-center justify-center gap-2 py-2 rounded-xl bg-lime-400/10 text-lime-300 border border-lime-400/20 hover:bg-lime-400/15 transition"
            >
              {showExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              {showExpanded ? "Hide" : "Show"} more settings
            </button>

            {showExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                {EXPANDED_KEYS.map((k) => (
                  <div key={k} className={k === "wheelset" ? "md:col-span-2" : ""}>
                    <label className="block text-xs font-bold text-white/60 uppercase mb-1">{labelize(k)}</label>
                    <input
                      value={setup[k]}
                      onChange={(e) => setSetup((p) => ({ ...p, [k]: e.target.value }))}
                      className="w-full px-3 py-2 bg-black border border-white/10 text-white rounded-lg focus:ring-2 focus:ring-lime-400"
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className={`w-full mt-5 py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 shadow-2xl transition ${
                saving
                  ? "bg-white/10 text-white/30 cursor-not-allowed border border-white/10"
                  : "bg-gradient-to-r from-lime-400 to-green-500 text-black hover:from-lime-500 hover:to-green-600"
              }`}
            >
              <Save size={22} />
              {saving ? "SAVING…" : offline ? "SAVE (QUEUE)" : "SAVE SETUP"}
            </button>
          </>
        )}
      </div>

      {/* HISTORY */}
      {selectedRider && history.length > 0 && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-5">
          <div className="text-white font-black mb-3 flex items-center gap-2">
            <div className="w-1 h-6 bg-lime-400 rounded-full" />
            <span>HISTORY</span>
            <span className="text-white/50 font-bold">({history.length})</span>
            <History size={18} className="text-lime-300 ml-1" />
          </div>

          <div className="space-y-2">
            {history.map((row, idx) => {
              const isLatest = idx === 0;
              const id = row.id || `${row.timestamp}-${idx}`;
              const isExpanded = expandedHistoryIds.has(id);

              const cur = normalizeSetup(row?.full_spec?.setup || {});
              const prev = normalizeSetup(history?.[idx + 1]?.full_spec?.setup || {});
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
                    isLatest && (changes?.defaultChanged.length || hasExpandedOnlyChanges || changes?.notesChanged)
                      ? "border-lime-400/40"
                      : "border-white/10 hover:border-white/20"
                  }`}
                  onClick={() => toggleHistoryExpand(id)}
                >
                  <div className="p-4 flex items-center justify-between">
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

                          {!!row?.full_spec?.event_context && (
                            <span className="text-xs text-lime-300/80 px-2 py-0.5 bg-lime-400/10 rounded border border-lime-400/20">
                              {row.full_spec.event_context}
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
          </div>
        </div>
      )}
    </div>
  );
}
