import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ensureSession, fetchLatestQuick, insertQuick } from "../api/measurementsApi";
import { ArrowLeft, Save, WifiOff, AlertTriangle, X } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { useToast } from "../../../components/ToastProvider.jsx";

const WARN_THRESHOLD_MM = 4;

const BIKE_TYPES = [
  { key: "mtb", label: "MTB" },
  { key: "road", label: "Road" },
  { key: "cx", label: "CX" },
];

export default function QuickEntryPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { displayName } = useAuth();
  const toast = useToast();

  const mechanic = (displayName || "").trim();
  const rider = params.get("rider") || "";

  const [bikeType, setBikeType] = useState("mtb");
  const [form, setForm] = useState({
    saddleSetback: "",
    height4cm: "",
    height15cm: "",
    notes: "",
    location: "",
  });

  const [status, setStatus] = useState({ kind: "idle", msg: "" }); // idle|saving|ok|err
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState(null);

  const lastLoadedQuickRef = useRef(null);

  const [warnOpen, setWarnOpen] = useState(false);
  const [warnInfo, setWarnInfo] = useState(null);
  const pendingPayloadRef = useRef(null);

  const lastSaveRef = useRef({ at: 0, sig: "" });

  const canSave = useMemo(() => mechanic && rider, [mechanic, rider]);
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  async function load({ silent = false } = {}) {
    if (!rider) return;
    if (!silent) setLoading(true);

    try {
      await ensureSession();
      const latest = await fetchLatestQuick(rider, bikeType);

      lastLoadedQuickRef.current = latest || null;

      if (latest) {
        setForm({
          saddleSetback: latest.saddle_setback ?? "",
          height4cm: latest.height_4cm ?? "",
          height15cm: latest.height_15cm ?? "",
          notes: latest.notes ?? "",
          location: latest.location ?? "",
        });
      }

      if (!silent) setStatus({ kind: "idle", msg: "" });
    } catch (e) {
      if (!silent) setStatus({ kind: "err", msg: e.message || "Failed to load latest jig update." });
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const onVis = () => {
      if (document.visibilityState === "visible") load({ silent: true });
    };
    const onFocus = () => load({ silent: true });
    const onOnline = () => load({ silent: true });

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

  async function doSave(payload) {
    if (!canSave) {
      setStatus({ kind: "err", msg: "No mechanic/rider found." });
      toast.error("Missing mechanic or rider");
      return;
    }
    if (status.kind === "saving") return;

    // Dedupe signature WITHOUT timestamp
    const dedupeSig = JSON.stringify({
      rider: payload.rider,
      mechanic: payload.mechanic,
      bikeType: payload.bikeType,
      saddleSetback: payload.saddleSetback,
      height4cm: payload.height4cm,
      height15cm: payload.height15cm,
      notes: payload.notes,
      location: payload.location,
    });

    const now = Date.now();
    if (lastSaveRef.current.sig === dedupeSig && now - lastSaveRef.current.at < 1500) {
      setStatus({ kind: "ok", msg: "✓ Already saved (just now)" });
      toast.success("Already saved (just now)");
      return;
    }

    setStatus({ kind: "saving", msg: "Saving…" });

    try {
      const res = await insertQuick({ ...payload, dedupeSig });

      lastSaveRef.current = { sig: dedupeSig, at: Date.now() };

      setSnapshot({
        bikeType: payload.bikeType,
        saddleSetback: payload.saddleSetback,
        height4cm: payload.height4cm,
        height15cm: payload.height15cm,
        at: new Date(),
        queued: !!res?.queued,
      });

      if (res?.queued) {
        setStatus({ kind: "ok", msg: "✓ Saved offline (queued)" });
        toast.success("Saved offline — queued to sync");
        // don’t reload; it would just re-pull old DB state and confuse
      } else {
        setStatus({ kind: "ok", msg: "✓ Saved" });
        toast.success("Saved ✓");
        await load({ silent: true });
      }
    } catch (e) {
      setStatus({ kind: "err", msg: `Save failed: ${e.message || "unknown error"}` });
      toast.error(`Save failed: ${e.message || "unknown error"}`);
    }
  }

  function computeDeviationWarning(payload) {
    const prev = lastLoadedQuickRef.current;
    if (!prev) return null;

    const prevSB = toNum(prev.saddle_setback);
    const prev4 = toNum(prev.height_4cm);
    const prev15 = toNum(prev.height_15cm);

    const nextSB = toNum(payload.saddleSetback);
    const next4 = toNum(payload.height4cm);
    const next15 = toNum(payload.height15cm);

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

  async function onSave() {
    const payload = { rider, mechanic, bikeType, ...form };

    const info = computeDeviationWarning(payload);
    if (info) {
      pendingPayloadRef.current = payload;
      setWarnInfo(info);
      setWarnOpen(true);
      return;
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

  return (
    <div className="space-y-4 pb-28">
      <button onClick={() => navigate("/measurements")} className="inline-flex items-center gap-2 text-white/70 hover:text-white">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="text-sm text-white/60 uppercase tracking-widest">Jig Update</div>
            <div className="text-2xl font-black mt-1">{rider || "No rider selected"}</div>
            <div className="text-white/50 text-sm mt-1">Mechanic: {mechanic || "—"}</div>
            {offline ? <div className="mt-2 text-xs text-yellow-200/80">Offline — saves will queue and sync later</div> : null}
          </div>

          <label className="block">
            <div className="text-[11px] text-white/50 uppercase tracking-widest mb-2">Bike type</div>
            <select
              value={bikeType}
              onChange={(e) => setBikeType(e.target.value)}
              className="rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-300/40"
            >
              {BIKE_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
            <div className="mt-2 text-[11px] text-white/45">Road/CX are rare — default is MTB.</div>
          </label>
        </div>

        {loading ? (
          <div className="mt-6 text-white/60">Loading latest…</div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Saddle Setback (mm)">
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                value={form.saddleSetback}
                onChange={(e) => setForm({ ...form, saddleSetback: e.target.value })}
                className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-300/40"
              />
            </Field>

            <Field label="Height at 4cm">
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                value={form.height4cm}
                onChange={(e) => setForm({ ...form, height4cm: e.target.value })}
                className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-300/40"
              />
            </Field>

            <Field label="Height at 15cm">
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                value={form.height15cm}
                onChange={(e) => setForm({ ...form, height15cm: e.target.value })}
                className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-300/40"
              />
            </Field>

            <Field label="Location (optional)">
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-300/40"
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Notes (optional)">
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-300/40"
                />
              </Field>
            </div>
          </div>
        )}
      </div>

      {warnOpen && warnInfo && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={cancelWarn} />
          <div className="relative w-full max-w-xl rounded-3xl border border-white/10 bg-black/70 backdrop-blur-xl p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-2xl bg-red-500/15 border border-red-400/25 p-2">
                  <AlertTriangle className="text-red-200" size={18} />
                </div>
                <div>
                  <div className="text-lg font-black text-white">Significant change detected</div>
                  <div className="text-sm text-white/60 mt-1">
                    Compared to the last saved jig update
                    {warnInfo.prevWhen ? ` (${warnInfo.prevWhen.toLocaleString()})` : ""}. Threshold: {warnInfo.threshold}mm.
                  </div>
                </div>
              </div>

              <button
                onClick={cancelWarn}
                className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 p-2"
                aria-label="Close"
              >
                <X size={18} className="text-white/70" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-500/10 p-4">
              <div className="space-y-2 text-sm">
                {warnInfo.flagged.slice(0, 3).map((d) => (
                  <div key={d.key} className="flex items-center justify-between gap-3">
                    <div className="text-white/75">{d.label}</div>
                    <div className="text-right">
                      <span className="font-black text-white tabular-nums">{fmtNum(d.next)}mm</span>
                      <span className="text-white/40"> (base {fmtNum(d.prev)}mm)</span>
                      <span className="ml-2 font-black text-red-200 tabular-nums">{fmtSigned(d.diff)}mm</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-red-100/70 italic">
                If this is intentional, continue. If not, cancel and re-check the jig.
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-end">
              <button onClick={cancelWarn} className="rounded-2xl px-4 py-3 font-black border border-white/10 bg-white/5 hover:bg-white/10 text-white">
                Cancel
              </button>
              <button
                onClick={confirmSaveAnyway}
                className="rounded-2xl px-4 py-3 font-black bg-lime-300 text-black hover:bg-lime-200 inline-flex items-center gap-2 justify-center"
              >
                <Save size={18} /> Save anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-5xl px-4 z-30">
        <div className="rounded-3xl border border-white/10 bg-black/50 backdrop-blur-xl p-4 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="min-w-0">
              {offline ? (
                <div className="inline-flex items-center gap-2 text-xs text-white/70">
                  <WifiOff size={14} /> Offline — saves will queue
                </div>
              ) : snapshot ? (
                <div className="text-xs text-white/70">
                  <span className="text-white/85 font-black">Saved:</span>{" "}
                  <span className="font-black text-white/85 tabular-nums">
                    {bikeTypeLabel(snapshot.bikeType)} • SB {fmt(snapshot.saddleSetback)} • 4cm {fmt(snapshot.height4cm)} • 15cm {fmt(snapshot.height15cm)}
                  </span>
                  <span className="text-white/40"> • {snapshot.at.toLocaleTimeString()}</span>
                  {snapshot.queued ? <span className="ml-2 text-yellow-200/80">• queued</span> : null}
                </div>
              ) : (
                <div className="text-xs text-white/50">Ready</div>
              )}

              {status.kind === "err" && <div className="mt-1 text-xs text-red-200/90 truncate">{status.msg}</div>}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={status.kind === "saving" || !canSave}
                onClick={onSave}
                className={`rounded-2xl px-5 py-3 font-black flex items-center gap-2 ${
                  status.kind === "saving" || !canSave
                    ? "bg-white/10 text-white/30 cursor-not-allowed"
                    : "bg-lime-300 text-black hover:bg-lime-200"
                }`}
              >
                <Save size={18} /> {status.kind === "saving" ? "Saving…" : offline ? "Save (Queue)" : "Save Jig Update"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function bikeTypeLabel(k) {
  return k === "road" ? "Road" : k === "cx" ? "CX" : "MTB";
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs text-white/60 uppercase tracking-widest mb-2">{label}</div>
      {children}
    </label>
  );
}

function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mkDiff(label, key, prev, next) {
  if (prev === null || next === null) return null;
  const d = +(next - prev).toFixed(1);
  return { label, key, prev, next, diff: d };
}

function fmt(v) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
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
