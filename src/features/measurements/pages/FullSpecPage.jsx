import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, WifiOff, RefreshCcw } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { useToast } from "../../../components/ToastProvider.jsx";

import { ensureSession, fetchLatestFull, insertFull } from "../api/measurementsApi";
import { FULL_SPEC_DEFAULTS } from "../utils/fullSpecDefaults";

const BASE_DEFAULTS = FULL_SPEC_DEFAULTS?.mtb ? FULL_SPEC_DEFAULTS.mtb : FULL_SPEC_DEFAULTS;

function normalizeSpec(maybeSpec) {
  if (!maybeSpec || typeof maybeSpec !== "object") return null;
  if (maybeSpec.mtb && typeof maybeSpec.mtb === "object") return maybeSpec.mtb;
  if (
    Object.prototype.hasOwnProperty.call(maybeSpec, "frame") ||
    Object.prototype.hasOwnProperty.call(maybeSpec, "saddle") ||
    Object.prototype.hasOwnProperty.call(maybeSpec, "cockpit")
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

function humanize(str) {
  return String(str || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
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
function draftKey(rider) {
  return `${FULLSPEC_DRAFT_PREFIX}${encodeURIComponent(rider || "")}`;
}
function readDraft(rider) {
  if (!rider) return null;
  try {
    const raw = localStorage.getItem(draftKey(rider));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.spec || typeof parsed.spec !== "object") return null;
    return { at: Number(parsed.at || 0), spec: parsed.spec };
  } catch {
    return null;
  }
}
function writeDraft(rider, spec) {
  if (!rider) return;
  try {
    localStorage.setItem(draftKey(rider), JSON.stringify({ at: Date.now(), spec }));
  } catch {}
}
function clearDraft(rider) {
  if (!rider) return;
  try {
    localStorage.removeItem(draftKey(rider));
  } catch {}
}

export default function FullSpecPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { displayName } = useAuth();
  const toast = useToast();

  const mechanicFromUrl = params.get("mech") || "";
  const mechanic = (displayName || mechanicFromUrl || "").trim();
  const rider = params.get("rider") || "";

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  const scrollKey = rider ? `cfr_scroll_fullspec__${encodeURIComponent(rider)}` : "";
  useStickyScroll(scrollKey, Boolean(rider));

  const [spec, setSpec] = useState(clone(BASE_DEFAULTS));
  const [loading, setLoading] = useState(true);

  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  const lastSaveRef = useRef({ at: 0, sig: "" });
  const canSave = useMemo(() => mechanic && rider, [mechanic, rider]);

  async function load({ silent = false, keepEdits = false } = {}) {
    if (!rider) return;
    if (!silent) setLoading(true);

    try {
      await ensureSession();
      const latest = await fetchLatestFull(rider);
      const latestAt = latest?.timestamp ? new Date(latest.timestamp).getTime() : 0;

      if (keepEdits && dirtyRef.current) return;

      const draft = readDraft(rider);
      const draftAt = draft?.at ? Number(draft.at) : 0;
      const draftSpec = normalizeSpec(draft?.spec);
      const latestSpec = normalizeSpec(latest?.full_spec);

      if (draftSpec && draftAt > latestAt) {
        setSpec(mergeDefaults(BASE_DEFAULTS, draftSpec));
        setDirty(true);
      } else if (latestSpec) {
        setSpec(mergeDefaults(BASE_DEFAULTS, latestSpec));
        setDirty(false);
        clearDraft(rider);
      } else {
        setSpec(clone(BASE_DEFAULTS));
        setDirty(false);
        clearDraft(rider);
      }
    } catch (e) {
      toast.error(e.message || "Failed to load latest bike spec");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const onVis = () => {
      if (document.visibilityState === "visible") load({ silent: true, keepEdits: true });
    };
    const onFocus = () => load({ silent: true, keepEdits: true });
    const onOnline = () => load({ silent: true, keepEdits: true });

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rider]);

  useEffect(() => {
    if (!rider) return;
    if (!dirty) return;

    const t = setTimeout(() => writeDraft(rider, spec), 250);
    return () => clearTimeout(t);
  }, [rider, spec, dirty]);

  function setField(section, key, value) {
    setDirty(true);
    setSpec((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }

  async function handleSave() {
    if (!canSave) {
      toast.error("Missing rider or mechanic");
      return;
    }

    // dedupe signature WITHOUT timestamp
    const dedupeSig = JSON.stringify({ rider, mechanic, fullSpec: spec });

    const now = Date.now();
    if (lastSaveRef.current.sig === dedupeSig && now - lastSaveRef.current.at < 1500) {
      toast.success("Already saved (just now)");
      return;
    }

    try {
      const res = await insertFull({ rider, mechanic, fullSpec: spec, dedupeSig });
      lastSaveRef.current = { sig: dedupeSig, at: Date.now() };

      // Treat queued as saved locally (it WILL sync later)
      setDirty(false);
      clearDraft(rider);

      if (res?.queued) {
        toast.success("Saved offline — queued to sync");
        // Don't reload from DB (would show older data)
      } else {
        toast.success("Saved ✓");
        await load({ silent: true, keepEdits: true });
      }
    } catch (e) {
      toast.error(`Save failed: ${e?.message || "unknown error"}`);
    }
  }

  return (
    <div className="space-y-4 pb-28">
      <button
        onClick={() => navigate(`/measurements?mech=${encodeURIComponent(mechanic)}&rider=${encodeURIComponent(rider)}`)}
        className="inline-flex items-center gap-2 text-white/70 hover:text-white"
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="text-sm text-white/60 uppercase tracking-widest">Bike Spec</div>
            <div className="text-2xl font-black mt-1">{rider || "No rider selected"}</div>
            <div className="text-white/50 text-sm mt-1">Mechanic: {mechanic || "—"}</div>
            {offline ? (
              <div className="mt-2 text-xs text-yellow-200/80 inline-flex items-center gap-2">
                <WifiOff size={14} /> Offline — saves will queue and sync later
              </div>
            ) : null}
            {dirty ? (
              <div className="mt-2 text-xs text-yellow-200/80">
                Unsaved changes (kept locally until saved)
              </div>
            ) : null}
          </div>

          <button
            onClick={() => load({ silent: false, keepEdits: true })}
            className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-3 font-bold text-white/85 inline-flex items-center gap-2"
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
              <Section key={section} title={humanize(section)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.keys(spec[section]).map((key) => (
                    <Field
                      key={key}
                      label={humanize(key)}
                      value={spec[section][key]}
                      onChange={(v) => setField(section, key, v)}
                    />
                  ))}
                </div>
              </Section>
            ))}
          </div>
        )}
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-5xl px-4 z-30">
        <div className="rounded-3xl border border-white/10 bg-black/50 backdrop-blur-xl p-4 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 text-xs text-white/70">
              {offline ? <WifiOff size={14} /> : null}
              {offline ? "Offline — save will queue" : dirty ? "Unsaved changes" : "Ready"}
            </div>

            <button
              disabled={!canSave}
              onClick={handleSave}
              className={`rounded-2xl px-5 py-3 font-black flex items-center gap-2 ${
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
    <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
      <div className="text-xs text-white/60 uppercase tracking-widest mb-4">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange }) {
  const safeValue =
    value === null || value === undefined
      ? ""
      : typeof value === "string" || typeof value === "number"
      ? value
      : "";

  return (
    <label className="block">
      <div className="text-xs text-white/50 uppercase tracking-widest mb-2">{label}</div>
      <input
        value={safeValue}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-300/40"
      />
    </label>
  );
}
