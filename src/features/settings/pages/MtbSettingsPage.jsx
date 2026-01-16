import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  ChevronRight,
  ChevronDown,
  History,
  WifiOff,
  Flag,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import { useAuth } from "../../auth/AuthProvider.jsx";
import { fetchRiders } from "../../measurements/api/measurementsApi";
import {
  fetchMtbSettingsHistory,
  fetchLatestMtbSettings,
  insertMtbSettings,
  setMtbSettingsRaceMark,
} from "../api/settingsApi";
import { supabase } from "../../../lib/supabaseClient";
import { useToast } from "../../../components/ToastProvider.jsx";
import { UI } from "../../../ui/styles.js";

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

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

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

function isPressureKey(k) {
  return k === "front_pressure" || k === "rear_pressure" || k === "fork_pressure" || k === "shock_pressure";
}
function isReboundKey(k) {
  return k === "fork_rebound" || k === "shock_rebound";
}

const INPUT =
  "w-full rounded-2xl bg-white/[0.07] border border-white/15 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-lime-300/40 focus:border-white/25 transition";

function InputField({ k, value, onChange, inputRef, onEnterNext, enterHint }) {
  const numericPressure = isPressureKey(k);
  const numericRebound = isReboundKey(k);

  const common = {
    ref: inputRef,
    value: value ?? "",
    onChange: (e) => onChange(e.target.value),
    className: INPUT,
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
      <input {...common} inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 10" aria-label={labelize(k)} />
    );
  }

  return <input {...common} aria-label={labelize(k)} />;
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "px-3 py-2 rounded-2xl text-xs font-black border transition inline-flex items-center gap-2 active:scale-[0.99]",
        active ? UI.tabActive : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
      )}
    >
      {children}
    </button>
  );
}

function ModalShell({ open, title, subtitle, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className={cx("absolute left-1/2 top-1/2 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 p-5", UI.card, "bg-black/80")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-white font-black text-lg">{title}</div>
            {subtitle ? <div className={cx(UI.helper, "mt-1")}>{subtitle}</div> : null}
          </div>

          <button onClick={onClose} className={UI.btnIcon} title="Close">
            <X size={18} className="text-white/85" />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

export default function MtbSettingsPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const riderParam = params.get("rider") || "";

  const toast = useToast();
  const { displayName, isAdmin } = useAuth();

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

  // Admin edit/delete modal
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editEventContext, setEditEventContext] = useState("");
  const [editSetup, setEditSetup] = useState(DEFAULT_SETUP);
  const [editSaving, setEditSaving] = useState(false);

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

  function openEdit(row) {
    const fs = safeFullSpec(row?.full_spec);
    setEditRow(row);
    setEditEventContext(String(fs?.event_context ?? ""));
    setEditSetup(normalizeSetup(fs?.setup));
    setEditOpen(true);
  }

  async function adminSaveEdit() {
    if (!isAdmin) return;
    if (offline) {
      toast.warning("Offline — can’t edit right now");
      return;
    }
    if (!editRow?.id) {
      toast.error("Missing id");
      return;
    }
    if (editSaving) return;

    setEditSaving(true);
    try {
      const curFs = safeFullSpec(editRow.full_spec);
      const nextFs = {
        ...curFs,
        event_context: editEventContext || "",
        setup: normalizeSetup(editSetup),
      };

      const { error } = await supabase
        .from("bike_measurements")
        .update({
          full_spec: nextFs,
          notes: normalizeSetup(editSetup)?.notes || "",
        })
        .eq("id", editRow.id);

      if (error) throw error;

      toast.success("Updated ✓");
      setEditOpen(false);
      setEditRow(null);
      await loadAll();
    } catch (e) {
      toast.error(`Update failed: ${e?.message || "unknown error"}`);
    } finally {
      setEditSaving(false);
    }
  }

  async function adminDeleteRow(row) {
    if (!isAdmin) return;
    if (offline) {
      toast.warning("Offline — can’t delete right now");
      return;
    }
    if (!row?.id) {
      toast.error("Missing id");
      return;
    }
    const ok = window.confirm("Delete this settings entry? This cannot be undone.");
    if (!ok) return;

    try {
      const { error } = await supabase.from("bike_measurements").delete().eq("id", row.id);
      if (error) throw error;
      toast.success("Deleted ✓");
      await loadAll();
    } catch (e) {
      toast.error(`Delete failed: ${e?.message || "unknown error"}`);
    }
  }

  const canSave = Boolean(selectedRider) && Boolean(displayName);

  return (
    <div className="space-y-4 pb-28">
      <button onClick={() => nav("/settings")} className="inline-flex items-center gap-2 text-white/75 hover:text-white transition">
        <ArrowLeft size={18} /> Back
      </button>

      {/* Rider + context */}
      <div className={cx(UI.card, "p-5")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm text-white/65 font-bold tracking-wide">MTB Setup</div>
            <div className="text-2xl font-black mt-1 text-white">{selectedRider || "Select rider"}</div>
            <div className={cx(UI.helper, "mt-1")}>Fast entry + history for tyre/pressure/suspension.</div>
          </div>

          {offline ? (
            <div className={cx(UI.pillBase, UI.pillWarn)}>
              <span className="inline-flex items-center gap-2">
                <WifiOff size={14} /> Offline
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className={cx(UI.label, "mb-2")}>Rider</div>
            <select
              value={selectedRider}
              onChange={(e) => setSelectedRider(e.target.value)}
              className={INPUT}
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
            <div className={cx(UI.label, "mb-2")}>Event / Context</div>
            <input
              value={eventContext}
              onChange={(e) => setEventContext(e.target.value)}
              placeholder="e.g. Nove Mesto WC2 / Wet"
              className={INPUT}
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {/* Current setup */}
      <div className={cx(UI.card, "p-5")}>
        {!selectedRider ? (
          <div className="text-white/60 py-3">Select a rider to start.</div>
        ) : loading ? (
          <div className="py-3 space-y-3">
            <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEFAULT_KEYS.map((k) => {
                const idx = FAST_ORDER.indexOf(k);
                const enterHint = idx === FAST_ORDER.length - 1 ? "done" : "next";

                const unit = k.includes("pressure") ? "psi" : k.includes("rebound") ? "clicks" : "";
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between mb-2">
                      <div className={UI.label}>{labelize(k)}</div>
                      {unit ? <div className={cx(UI.helper, "px-2 py-0.5 rounded-xl border border-white/10 bg-white/5")}>{unit}</div> : null}
                    </div>

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
                <div className={cx(UI.label, "mb-2")}>Notes</div>
                <textarea
                  ref={setRefFor("notes")}
                  rows={3}
                  value={setup.notes}
                  onChange={(e) => setSetup((p) => ({ ...p, notes: e.target.value }))}
                  className={cx(INPUT, "min-h-[88px]")}
                  placeholder="Any observations / changes…"
                  autoComplete="off"
                  enterKeyHint="done"
                />
              </div>
            </div>

            <button
              onClick={() => setShowExpanded((s) => !s)}
              className={cx(
                "w-full mt-4 rounded-2xl px-4 py-3 font-black border transition active:scale-[0.99] inline-flex items-center justify-center gap-2",
                showExpanded
                  ? "bg-white/5 text-white/80 border-white/10 hover:bg-white/10"
                  : "bg-lime-300/10 text-lime-200 border-lime-300/25 hover:bg-lime-300/15"
              )}
            >
              {showExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              {showExpanded ? "Hide advanced" : "More"}
            </button>

            {showExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
                {EXPANDED_KEYS.map((k) => (
                  <div key={k} className={k === "wheelset" ? "md:col-span-2" : ""}>
                    <div className={cx(UI.label, "mb-2")}>{labelize(k)}</div>
                    <input
                      value={setup[k]}
                      onChange={(e) => setSetup((p) => ({ ...p, [k]: e.target.value }))}
                      className={INPUT}
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* History */}
      {selectedRider && (historyRaw?.length || 0) > 0 && (
        <div className={cx(UI.card, "p-5")}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-white font-black">History</div>
              <div className="text-white/50 font-bold">
                ({history.length}
                {history.length !== historyRaw.length ? ` / ${historyRaw.length}` : ""})
              </div>
              <History size={18} className="text-lime-300 ml-1" />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Chip active={range === "week"} onClick={() => setRange("week")}>
              This week
            </Chip>
            <Chip active={range === "30d"} onClick={() => setRange("30d")}>
              30 days
            </Chip>
            <Chip active={range === "all"} onClick={() => setRange("all")}>
              All
            </Chip>
            <Chip active={raceOnly} onClick={() => setRaceOnly((v) => !v)}>
              <Flag size={14} /> Race only
            </Chip>
          </div>

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

              const summaryItems = buildCollapsedSummary(cur, prev, isLatest, changes);

              const borderClass = isRace
                ? "border-yellow-400/35"
                : isLatest && (changes?.defaultChanged.length || hasExpandedOnlyChanges || changes?.notesChanged)
                ? "border-lime-300/35"
                : "border-white/10 hover:border-white/20";

              return (
                <div
                  key={id}
                  className={cx("rounded-3xl border overflow-hidden bg-white/[0.03] hover:bg-white/[0.05] transition", borderClass)}
                  onClick={() => toggleHistoryExpand(id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {isExpanded ? (
                        <ChevronDown size={18} className="text-lime-300 mt-0.5" />
                      ) : (
                        <ChevronRight size={18} className="text-white/50 mt-0.5" />
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white truncate">{row.mechanic || "—"}</span>
                          <span className="text-xs text-white/50">{formatTimestamp(row.timestamp)}</span>

                          {!!fs?.event_context ? (
                            <span className="text-xs text-lime-200/80 px-2 py-0.5 bg-lime-300/10 rounded-2xl border border-lime-300/20">
                              {fs.event_context}
                            </span>
                          ) : null}

                          {isRace ? (
                            <span className="text-xs font-black text-yellow-200 px-2 py-0.5 bg-yellow-400/10 rounded-2xl border border-yellow-400/20 inline-flex items-center gap-1">
                              <Flag size={12} /> Race
                            </span>
                          ) : null}

                          {hasExpandedOnlyChanges ? (
                            <span className="text-xs font-bold text-yellow-200 px-2 py-0.5 bg-yellow-400/10 rounded-2xl border border-yellow-400/20">
                              Other changed
                            </span>
                          ) : null}

                          {isLatest && changes?.notesChanged ? (
                            <span className="text-xs font-bold text-lime-200 px-2 py-0.5 bg-lime-300/10 rounded-2xl border border-lime-300/20">
                              Notes changed
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleRace(row, !isRace);
                        }}
                        disabled={offline || !row?.id}
                        className={cx(
                          "rounded-2xl px-3 py-2 text-xs font-black border transition inline-flex items-center gap-2 active:scale-[0.99]",
                          offline || !row?.id
                            ? "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
                            : isRace
                            ? "bg-yellow-400/15 text-yellow-100 border-yellow-400/25 hover:bg-yellow-400/20"
                            : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                        )}
                        title={offline ? "Offline" : isRace ? "Unmark race" : "Mark as race"}
                      >
                        <Flag size={14} />
                        {isRace ? "Race" : "Mark"}
                      </button>

                      {isAdmin ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openEdit(row);
                            }}
                            disabled={offline || !row?.id}
                            className={cx(
                              "rounded-2xl px-3 py-2 text-xs font-black border transition inline-flex items-center gap-2 active:scale-[0.99]",
                              offline || !row?.id
                                ? "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
                                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                            )}
                            title="Edit (admin)"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>

                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              adminDeleteRow(row);
                            }}
                            disabled={offline || !row?.id}
                            className={cx(
                              "rounded-2xl px-3 py-2 text-xs font-black border transition inline-flex items-center gap-2 active:scale-[0.99]",
                              offline || !row?.id
                                ? "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
                                : "bg-red-500/10 text-red-200 border-red-500/25 hover:bg-red-500/15"
                            )}
                            title="Delete (admin)"
                          >
                            <Trash2 size={14} />
                            Del
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Summary grid */}
                  <div className="px-4 pb-4 grid grid-cols-2 gap-3 text-sm">
                    {summaryItems.map((it) => (
                      <div
                        key={it.label}
                        className={cx(
                          "p-3 rounded-2xl border",
                          it.changed ? "bg-lime-300/10 border-lime-300/20" : "bg-white/5 border-white/10"
                        )}
                      >
                        <div className={cx(UI.helper)}>{it.label}</div>
                        <div className={cx("mt-1 font-bold truncate", it.changed ? "text-lime-200" : "text-white")}>
                          {it.value || "—"}
                        </div>
                        {it.changed ? (
                          <div className="text-[11px] text-white/45 truncate mt-1">
                            Prev: <span className="text-white/60">{it.prevValue || "—"}</span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {/* Expanded */}
                  {isExpanded ? (
                    <div className="px-4 pb-4 pt-3 border-t border-white/10">
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {EXPANDED_KEYS.map((k) => {
                          const v = cur?.[k];
                          const changed = isLatest && changes?.expandedChanged.includes(k);
                          if (!v && !changed) return null;

                          return (
                            <div
                              key={k}
                              className={cx(
                                "p-3 rounded-2xl border",
                                changed ? "bg-lime-300/10 border-lime-300/20" : "bg-white/5 border-white/10"
                              )}
                            >
                              <div className={UI.helper}>{labelize(k)}</div>
                              <div className="text-white font-bold mt-1 break-words">{v || "—"}</div>
                            </div>
                          );
                        })}
                      </div>

                      {!!cur?.notes ? (
                        <div className="mt-4 p-3 rounded-2xl border border-white/10 bg-white/5">
                          <div className={UI.helper}>Notes</div>
                          <div className="text-white/85 mt-1 italic break-words">“{cur.notes}”</div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}

            {history.length === 0 ? (
              <div className="text-white/60 py-6">
                No entries for this filter. Try switching to <span className="font-black text-white">All</span>.
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Sticky save bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-6xl px-4 z-30">
        <div className="rounded-3xl border border-white/12 bg-black/55 backdrop-blur-xl p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-white/70">
              {offline ? "Offline — save will queue" : saving ? "Saving…" : selectedRider ? "Ready" : "Select a rider"}
            </div>

            <button
              disabled={!canSave || saving}
              onClick={handleSave}
              className={cx(
                "rounded-2xl px-5 py-3 font-black inline-flex items-center gap-2 transition active:scale-[0.99]",
                !canSave || saving
                  ? "bg-white/10 text-white/30 cursor-not-allowed"
                  : "bg-lime-300 text-black hover:bg-lime-200"
              )}
            >
              <Save size={18} /> {offline ? "Save (Queue)" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Admin edit modal */}
      <ModalShell
        open={editOpen}
        onClose={() => {
          if (editSaving) return;
          setEditOpen(false);
          setEditRow(null);
        }}
        title="Edit settings entry"
        subtitle={editRow?.timestamp ? `Saved: ${formatTimestamp(editRow.timestamp)} • ${editRow.mechanic || "—"}` : ""}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <div className={cx(UI.label, "mb-2")}>Event / Context</div>
            <input
              value={editEventContext}
              onChange={(e) => setEditEventContext(e.target.value)}
              className={INPUT}
              placeholder="e.g. Nove Mesto WC2 / Wet"
              autoComplete="off"
            />
          </div>

          {DEFAULT_KEYS.map((k) => (
            <div key={k}>
              <div className={cx(UI.label, "mb-2")}>{labelize(k)}</div>
              <InputField
                k={k}
                value={editSetup[k]}
                onChange={(v) => setEditSetup((p) => ({ ...p, [k]: v }))}
              />
            </div>
          ))}

          <div className="md:col-span-2">
            <div className={cx(UI.label, "mb-2")}>Notes</div>
            <textarea
              rows={4}
              value={editSetup.notes || ""}
              onChange={(e) => setEditSetup((p) => ({ ...p, notes: e.target.value }))}
              className={cx(INPUT, "min-h-[110px]")}
              placeholder="Any observations / changes…"
              autoComplete="off"
            />
          </div>

          <div className="md:col-span-2">
            <div className={cx(UI.label, "mb-2")}>Advanced</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {EXPANDED_KEYS.map((k) => (
                <div key={k} className={k === "wheelset" ? "md:col-span-2" : ""}>
                  <div className={cx(UI.helper, "mb-2")}>{labelize(k)}</div>
                  <input
                    value={editSetup[k] || ""}
                    onChange={(e) => setEditSetup((p) => ({ ...p, [k]: e.target.value }))}
                    className={INPUT}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex items-center justify-end gap-2 mt-2">
            <button
              onClick={() => {
                if (editSaving) return;
                setEditOpen(false);
                setEditRow(null);
              }}
              className={UI.btnSecondary}
            >
              Cancel
            </button>

            <button
              onClick={adminSaveEdit}
              disabled={editSaving || offline}
              className={cx(UI.btnPrimary, (editSaving || offline) && "opacity-60 cursor-not-allowed")}
            >
              <Save size={16} /> {editSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </ModalShell>
    </div>
  );
}
