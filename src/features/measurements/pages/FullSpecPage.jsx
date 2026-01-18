import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, WifiOff, RefreshCcw, ChevronDown, ChevronUp, Pencil, Trash2, X } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { useToast } from "../../../components/ToastProvider.jsx";

import { ensureSession, fetchLatestFull, fetchFullHistory, fetchMeasurementById, insertFull, updateMeasurement, deleteMeasurement } from "../api/measurementsApi";
import { FULL_SPEC_DEFAULTS } from "../utils/fullSpecDefaults";

const BASE_DEFAULTS = FULL_SPEC_DEFAULTS?.mtb ? FULL_SPEC_DEFAULTS.mtb : FULL_SPEC_DEFAULTS;

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
  // Frame
  size: "Size",
  link: "Link",
  chain_guard: "Chain guard",
  notes: "Notes",

  // Cockpit
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

  // Drivetrain
  crank_set: "Crank-set",
  pedals: "Pedals",
  pedal_clicks: "Pedal clicks",

  // Brakes
  levers: "Levers",
  calipers: "Calipers",
  pads: "Pads",

  // Suspension
  shock_and_tune: "Shock + tune",
  fork_and_tune: "Fork + tune",

  // Other
  bottle_cage: "Bottle cage",
  other_info: "Other info",
};

const NUMERIC_KEYS = new Set([
  "spacers_under",
  "distance_to_brake_lever",
  "distance_to_dropper_lever",
  "pedal_clicks",
]);

const TEXTAREA_KEYS = new Set(["notes", "other_info"]);

const PLACEHOLDERS = {
  spacers_under: "e.g. 20 (mm)",
  distance_to_brake_lever: "e.g. 55 (mm)",
  distance_to_dropper_lever: "e.g. 35 (mm)",
  pedal_clicks: "e.g. 2",
  notes: "Anything important…",
  other_info: "Anything else…",
};

function normalizeSpec(maybeSpec) {
  if (!maybeSpec || typeof maybeSpec !== "object") return null;
  if (maybeSpec.mtb && typeof maybeSpec.mtb === "object") return maybeSpec.mtb;
  if (
    Object.prototype.hasOwnProperty.call(maybeSpec, "frame") ||
    Object.prototype.hasOwnProperty.call(maybeSpec, "cockpit") ||
    Object.prototype.hasOwnProperty.call(maybeSpec, "drivetrain")
  ) {
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

function humanizeFallback(str) {
  return String(str || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function labelForSection(section) {
  return SECTION_LABELS[section] || humanizeFallback(section);
}

function labelForField(key) {
  return FIELD_LABELS[key] || humanizeFallback(key);
}

function isIOS() {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function readSessionNumber(key) {
  try {
    const raw = sessionStorage.getItem(key);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeSessionNumber(key, n) {
  try {
    sessionStorage.setItem(key, String(n));
  } catch {}
}

// Keeps scroll position stable across iOS tab-out/tab-in + keyboard hide/show.
function useStickyScroll(scrollKey, enabled = true) {
  const lastGoodYRef = useRef(0);

  useEffect(() => {
    if (!enabled || !scrollKey) return;

    const restore = () => {
      const y = readSessionNumber(scrollKey);
      if (y > 0) {
        requestAnimationFrame(() => window.scrollTo(0, y));
        setTimeout(() => window.scrollTo(0, y), 50);
        setTimeout(() => window.scrollTo(0, y), 250);
      }
    };

    const save = () => {
      const y = window.scrollY || 0;
      lastGoodYRef.current = y;
      writeSessionNumber(scrollKey, y);
    };

    const onVis = () => {
      if (document.visibilityState === "hidden") save();
      if (document.visibilityState === "visible") restore();
    };

    const onPageHide = () => save();
    const onScroll = () => save();

    let focusStartY = 0;
    const onFocusIn = () => {
      focusStartY = window.scrollY || 0;
    };
    const onFocusOut = () => {
      const before = focusStartY || 0;
      setTimeout(() => {
        const after = window.scrollY || 0;
        const lastGood = lastGoodYRef.current || before;
        if (after < 10 && lastGood > 150) window.scrollTo(0, lastGood);
      }, 80);
    };

    restore();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("scroll", onScroll, { passive: true });

    if (isIOS()) {
      window.addEventListener("focusin", onFocusIn);
      window.addEventListener("focusout", onFocusOut);
    }

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("scroll", onScroll);

      if (isIOS()) {
        window.removeEventListener("focusin", onFocusIn);
        window.removeEventListener("focusout", onFocusOut);
      }
    };
  }, [scrollKey, enabled]);
}

const FULLSPEC_DRAFT_PREFIX = "cfr_fullspec_draft__";
function draftKey(rider, bikeType) {
  const bt = String(bikeType || "mtb").toLowerCase();
  return `${FULLSPEC_DRAFT_PREFIX}${encodeURIComponent(rider || "")}__${bt}`;
}
function readDraft(rider, bikeType) {
  if (!rider) return null;
  try {
    const raw = localStorage.getItem(draftKey(rider, bikeType));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.spec || typeof parsed.spec !== "object") return null;
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

function fieldUiMeta(section, key) {
  const isNumeric = NUMERIC_KEYS.has(key);
  const isTextarea = TEXTAREA_KEYS.has(key);
  const placeholder = PLACEHOLDERS[key] || "";
  const fullWidth = key === "notes" || key === "other_info";

  const inputMode = isNumeric ? "numeric" : undefined;
  const pattern = isNumeric ? "[0-9]*" : undefined;

  const rows = key === "other_info" ? 5 : key === "notes" ? 4 : 3;

  return { isNumeric, isTextarea, placeholder, fullWidth, inputMode, pattern, rows, section };
}

export default function FullSpecPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { displayName, isAdmin } = useAuth();
  const toast = useToast();

  const mechanicFromUrl = params.get("mech") || "";
  const mechanic = (displayName || mechanicFromUrl || "").trim();
  const rider = params.get("rider") || "";

  const editIdFromUrl = params.get("edit") || "";

  const initialBikeType = (() => {
    const bt = String(params.get("bike") || "mtb").toLowerCase();
    return bt === "road" || bt === "cx" || bt === "mtb" ? bt : "mtb";
  })();
  const [bikeType, setBikeType] = useState(initialBikeType);

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;


  const historyRef = useRef(null);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingStamp, setEditingStamp] = useState("");
  const [savingAdmin, setSavingAdmin] = useState(false);

  const scrollKey = rider ? `cfr_scroll_fullspec__${encodeURIComponent(rider)}__${bikeType}` : "";
  useStickyScroll(scrollKey, Boolean(rider));

  const defaults = useMemo(() => {
    return (
      FULL_SPEC_DEFAULTS?.[bikeType] ||
      FULL_SPEC_DEFAULTS?.mtb ||
      BASE_DEFAULTS
    );
  }, [bikeType]);

  const [spec, setSpec] = useState(() => clone(defaults));
  const [loading, setLoading] = useState(true);

  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const lastSaveRef = useRef({ at: 0, sig: "" });
  const canSave = useMemo(() => mechanic && rider, [mechanic, rider]);

  function clearEditParam() {
    try {
      const nextParams = new URLSearchParams(params);
      nextParams.delete("edit");
      setParams(nextParams, { replace: true });
    } catch {
      // ignore
    }
  }

  function setEditParam(id) {
    try {
      const nextParams = new URLSearchParams(params);
      if (id) nextParams.set("edit", id);
      else nextParams.delete("edit");
      setParams(nextParams, { replace: true });
    } catch {
      // ignore
    }
  }

  function changeBikeType(next) {
    const bt = String(next || "mtb").toLowerCase();
    const normalized = bt === "road" || bt === "cx" || bt === "mtb" ? bt : "mtb";
    if (normalized === bikeType) return;

    // If we have unsaved edits, keep them as a draft under the current bikeType before switching.
    if (rider && dirtyRef.current) {
      writeDraft(rider, bikeType, spec);
    }

    setBikeType(normalized);

    // Persist bike type in URL so it stays consistent when sharing/reloading.
    try {
      const nextParams = new URLSearchParams(params);
      nextParams.set("bike", normalized);
      setParams(nextParams, { replace: true });
    } catch {
      // ignore
    }
  }

  async function load({ silent = false, keepEdits = false } = {}) {
    if (!rider) return;
    if (!silent) setLoading(true);

    try {
      await ensureSession();
      const latest = await fetchLatestFull(rider, bikeType);
      const latestAt = latest?.timestamp ? new Date(latest.timestamp).getTime() : 0;

      if (keepEdits && dirtyRef.current) return;

      const draft = readDraft(rider, bikeType);
      const draftAt = draft?.at ? Number(draft.at) : 0;
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
      toast.error(e.message || "Failed to load latest bike spec");
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
    } catch {
      // History is helpful but non-critical; ignore errors.
    } finally {
      if (!silent) setHistoryLoading(false);
    }
  }

  useEffect(() => {
    load();
    loadHistory();

    if (editIdFromUrl && isAdmin) {
      // Start edit mode from URL (used by History page)
      startEditById(editIdFromUrl);
    }

    const onVis = () => {
      if (document.visibilityState === "visible") {
        load({ silent: true, keepEdits: true });
        loadHistory({ silent: true });
      }
    };
    const onFocus = () => {
      load({ silent: true, keepEdits: true });
      loadHistory({ silent: true });
    };
    const onOnline = () => {
      load({ silent: true, keepEdits: true });
      loadHistory({ silent: true });
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rider, bikeType]);

  useEffect(() => {
    if (!rider) return;
    if (!dirty) return;

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

  function bikeTypeFromRowType(t) {
    const s = String(t || "").toLowerCase();
    if (s.endsWith("_road")) return "road";
    if (s.endsWith("_cx")) return "cx";
    return "mtb";
  }

  async function startEditById(id) {
    if (!id || !isAdmin) return;
    try {
      await ensureSession();
      const row = await fetchMeasurementById(id);
      if (!row || row.rider !== rider) {
        toast.error("Edit entry not found");
        clearEditParam();
        return;
      }
      const bt = bikeTypeFromRowType(row.type);
      if (bt !== bikeType) {
        changeBikeType(bt);
        // load() will run via effect; keep edits will protect, but we're about to set spec anyway
      }
      const specObj = normalizeSpec(row?.full_spec);
      if (!specObj) {
        toast.error("This entry has no spec data");
        clearEditParam();
        return;
      }
      setSpec(mergeDefaults(defaults, specObj));
      setDirty(true);
      setEditingId(row.id);
      setEditingStamp(row.timestamp || "");
      setEditParam(row.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
      toast.success("Editing history entry");
    } catch (e) {
      toast.error(e?.message || "Failed to start edit");
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
    setEditingStamp(row.timestamp || "");
    setEditParam(row.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingStamp("");
    clearEditParam();
    setDirty(false);
    load({ silent: true, keepEdits: false });
  }

  async function adminDeleteRow(row) {
    if (!isAdmin || !row?.id) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      toast.error("You are offline. Admin deletes require being online.");
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

  async function handleSave() {
    if (!canSave) {
      toast.error("Missing rider or mechanic");
      return;
    }

    const dedupeSig = JSON.stringify({ rider, mechanic, bikeType, fullSpec: spec, editingId: editingId || "" });

    const now = Date.now();
    if (lastSaveRef.current.sig === dedupeSig && now - lastSaveRef.current.at < 1500) {
      toast.success("Already saved (just now)");
      return;
    }

    try {
      if (editingId && isAdmin) {
        // Overwrite existing history entry
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
        setEditingStamp("");
        clearEditParam();
        toast.success("Updated ✓");
        await load({ silent: true, keepEdits: true });
        await loadHistory({ silent: true });
        return;
      }

      const res = await insertFull({ rider, mechanic, bikeType, fullSpec: spec, dedupeSig });
      lastSaveRef.current = { sig: dedupeSig, at: Date.now() };

      setDirty(false);
      clearDraft(rider, bikeType);

      if (res?.queued) {
        toast.success("Saved offline — queued to sync");
      } else {
        toast.success("Saved ✓");
        await load({ silent: true, keepEdits: true });
        await loadHistory({ silent: true });
      }
    } catch (e) {
      toast.error(`Save failed: ${e?.message || "unknown error"}`);
    } finally {
      setSavingAdmin(false);
    }
  }

  return (
    <div className="space-y-4 pb-28">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate(`/measurements?rider=${encodeURIComponent(rider)}`)}
          className="inline-flex items-center gap-2 text-white/75 hover:text-white transition"
          type="button"
        >
          <ArrowLeft size={18} /> Back
        </button>

        <button
          onClick={() => {
            if (historyRef.current) {
              historyRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          className="text-xs font-black text-white/70 hover:text-white transition"
          type="button"
        >
          History ↓
        </button>
      </div>

      <div className="rounded-3xl border border-white/12 bg-white/[0.06] backdrop-blur p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="text-sm text-white/65 font-bold tracking-wide">Bike Spec</div>
            <div className="text-2xl font-black mt-1 text-white">{rider || "No rider selected"}</div>
            <div className="text-white/60 text-sm mt-1">Mechanic: {mechanic || "—"}</div>

            <div className="mt-3 flex items-center gap-2">
              <div className="text-xs text-white/50 font-black tracking-wide">Bike</div>
              <select
                value={bikeType}
                onChange={(e) => changeBikeType(e.target.value)}
                className="rounded-2xl border border-white/12 bg-white/[0.06] px-3 py-2 text-sm font-black text-white/90"
              >
                <option value="mtb">MTB</option>
                <option value="road">Road</option>
                <option value="cx">CX</option>
              </select>
            </div>

            {offline ? (
              <div className="mt-2 text-xs text-yellow-200/90 inline-flex items-center gap-2">
                <WifiOff size={14} /> Offline — saves will queue and sync later
              </div>
            ) : null}

            {dirty ? (
              <div className="mt-2 text-xs text-yellow-200/90">Unsaved changes (kept locally until saved)</div>
            ) : null}
          </div>

          <button
            onClick={() => load({ silent: false, keepEdits: true })}
            className="rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] px-4 py-3 font-bold text-white/90 inline-flex items-center gap-2 transition"
            title="Reload latest (won’t overwrite if you have unsaved edits)"
          >
            <RefreshCcw size={14} /> Reload
          </button>
        </div>

        {loading ? (
          <div className="mt-6 space-y-3">
            <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
          </div>
        ) : (
          <div className="mt-6 space-y-8">
            {Object.keys(spec).map((section) => (
              <Section key={section} title={labelForSection(section)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.keys(spec[section]).map((key) => {
                    const meta = fieldUiMeta(section, key);
                    return (
                      <Field
                        key={key}
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
                    );
                  })}
                </div>
              </Section>
            ))}
          </div>
        )}
      </div>

      <div ref={historyRef} className="rounded-3xl border border-white/12 bg-white/[0.06] backdrop-blur p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-white/65 font-bold tracking-wide">History</div>
          <div className="text-xs font-black text-white/50">{bikeType.toUpperCase()}</div>
        </div>

        {historyLoading ? (
          <div className="mt-4 space-y-2">
            <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
          </div>
        ) : historyRows && historyRows.length ? (
          <div className="mt-4 space-y-2">
            {historyRows.map((row) => {
              const rowKey = row.id || row.timestamp;
              const open = expandedHistoryId === rowKey;
              const specObj = normalizeSpec(row?.full_spec);
              return (
                <div key={rowKey} className="rounded-2xl border border-white/10 bg-white/5">
                  <button
                    type="button"
                    onClick={() => setExpandedHistoryId(open ? null : rowKey)}
                    className="w-full px-4 py-3 flex items-start justify-between gap-3 text-left"
                  >
                    <div className="min-w-0">
                      <div className="text-white/85 font-black text-sm">{formatDateTime(row.timestamp)}</div>
                      <div className="text-xs text-white/60 mt-0.5">{row.mechanic ? `By ${row.mechanic}` : ""}</div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 text-white/60 mt-0.5">
                      {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      {isAdmin && row.id ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditFromRow(row);
                            }}
                            className="rounded-xl border border-white/12 bg-white/5 hover:bg-white/10 px-2 py-2"
                            title="Edit"
                          >
                            <Pencil size={16} className="text-white/80" />
                          </button>
                          <button
                            type="button"
                            disabled={savingAdmin}
                            onClick={(e) => {
                              e.stopPropagation();
                              adminDeleteRow(row);
                            }}
                            className="rounded-xl border border-red-500/25 bg-white/5 hover:bg-white/10 px-2 py-2"
                            title="Delete"
                          >
                            <Trash2 size={16} className="text-red-300" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </button>

                  {open ? (
                    <div className="px-4 pb-4">
                      {specObj ? (
                        <div className="space-y-4">
                          {Object.keys(specObj).map((sectionKey) => {
                            const sec = specObj[sectionKey];
                            if (!sec || typeof sec !== "object") return null;
                            const items = Object.entries(sec).filter(([_, v]) => !isBlank(v));
                            if (!items.length) return null;
                            return (
                              <div key={sectionKey} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                                <div className="text-white font-black text-sm">{labelForSection(sectionKey)}</div>
                                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {items.map(([k, v]) => (
                                    <div key={k} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                                      <div className="text-[11px] text-white/55 font-black tracking-wide">{labelForField(k)}</div>
                                      <div className="mt-1 text-sm text-white/85 whitespace-pre-wrap">{String(v)}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-white/60">No spec data found on this entry.</div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 text-sm text-white/60">No history yet.</div>
        )}
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-5xl px-4 z-30">
        <div className="rounded-3xl border border-white/12 bg-black/55 backdrop-blur-xl p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-xs text-white/75">
              {offline ? <WifiOff size={14} /> : null}
              {offline ? "Offline — save will queue" : dirty ? "Unsaved changes" : "Ready"}
            </div>

            <button
              disabled={!canSave}
              onClick={handleSave}
              className={`rounded-2xl px-5 py-3 font-black flex items-center gap-2 transition ${
                !canSave ? "bg-white/10 text-white/30 cursor-not-allowed" : "bg-lime-300 text-black hover:bg-lime-200"
              }`}
            >
              <Save size={18} /> {offline ? "Save (Queue)" : "Save Bike Spec"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-3xl border border-white/12 bg-black/25 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-black text-white/85">{title}</div>
        <div className="h-px flex-1 ml-4 bg-white/10" />
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea, rows, inputMode, pattern, fullWidth }) {
  const safeValue =
    value === null || value === undefined
      ? ""
      : typeof value === "string" || typeof value === "number"
      ? value
      : "";

  const wrapperClass = fullWidth ? "block md:col-span-2" : "block";

  return (
    <label className={wrapperClass}>
      {/* Brighter, easier to read */}
      <div className="text-sm font-bold text-white/80 mb-2">{label}</div>

      {textarea ? (
        <textarea
          value={safeValue}
          rows={rows || 3}
          placeholder={placeholder || ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl bg-white/[0.07] border border-white/15 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-lime-300/40 focus:border-white/25 transition"
        />
      ) : (
        <input
          value={safeValue}
          placeholder={placeholder || ""}
          inputMode={inputMode}
          pattern={pattern}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl bg-white/[0.07] border border-white/15 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-lime-300/40 focus:border-white/25 transition"
        />
      )}
    </label>
  );
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
