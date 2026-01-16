import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ensureSession, fetchLatestQuick, insertQuick } from "../api/measurementsApi";
import { ArrowLeft, Save, WifiOff, AlertTriangle, X } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider.jsx";
import { useToast } from "../../../components/ToastProvider.jsx";
import { UI } from "../../../ui/styles.js";

const WARN_THRESHOLD_MM = 4;

const BIKE_TYPES = [
  { key: "mtb", label: "MTB" },
  { key: "road", label: "Road" },
  { key: "cx", label: "CX" },
];

const INPUT =
  "w-full rounded-2xl bg-white/[0.07] border border-white/15 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-lime-300/40 focus:border-white/25 transition";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "px-3 py-2 rounded-2xl text-xs font-black border transition inline-flex items-center gap-2 active:scale-[0.99]",
        active ? UI.tabActive : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
      )}
      type="button"
    >
      {children}
    </button>
  );
}

function Field({ label, unit, children }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between mb-2">
        <div className={UI.label}>{label}</div>
        {unit ? (
          <div className="text-[11px] text-white/55 px-2 py-0.5 rounded-xl border border-white/10 bg-white/5">
            {unit}
          </div>
        ) : null}
      </div>
      {children}
    </label>
  );
}

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
      <button
        onClick={() => navigate("/measurements")}
        className="inline-flex items-center gap-2 text-white/75 hover:text-white transition"
        type="button"
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div className={cx(UI.card, "p-5")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm text-white/65 font-bold tracking-wide">Jig Update</div>
            <div className="text-2xl font-black mt-1 text-white">{rider || "No rider selected"}</div>
            <div className={cx(UI.helper, "mt-1")}>Mechanic: {mechanic || "—"}</div>
          </div>

          {offline ? (
            <div className={cx(UI.pillBase, UI.pillWarn)}>
              <span className="inline-flex items-center gap-2">
                <WifiOff size={14} /> Offline
              </span>
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className={cx(UI.helper, "mr-2")}>Bike type</div>
          {BIKE_TYPES.map((t) => (
            <Chip key={t.key} active={bikeType === t.key} onClick={() => setBikeType(t.key)}>
              {t.label}
            </Chip>
          ))}
          <div className={cx(UI.helper, "w-full mt-1")}>Road/CX are rare — default is MTB.</div>
        </div>

        {loading ? (
          <div className="mt-6 space-y-3">
            <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
            <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Saddle Setback" unit="mm">
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                value={form.saddleSetback}
                onChange={(e) => setForm({ ...form, saddleSetback: e.target.value })}
                className={INPUT}
              />
            </Field>

            <Field label="Height at 4cm" unit="mm">
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                value={form.height4cm}
                onChange={(e) => setForm({ ...form, height4cm: e.target.value })}
                className={INPUT}
              />
            </Field>

            <Field label="Height at 15cm" unit="mm">
              <input
                type="number"
                step="0.5"
                inputMode="decimal"
                value={form.height15cm}
                onChange={(e) => setForm({ ...form, height15cm: e.target.value })}
                className={INPUT}
              />
            </Field>

            <Field label="Location" unit="optional">
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className={INPUT}
                placeholder="e.g. Team truck / Hotel"
              />
            </Field>

            <div className="md:col-span-2">
              <Field label="Notes" unit="optional">
                <textarea
                  rows={4}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={cx(INPUT, "min-h-[110px]")}
                  placeholder="Any observations / changes…"
                />
              </Field>
            </div>
          </div>
        )}
      </div>

      {/* Warning modal */}
      {warnOpen && warnInfo ? (
        <div className="fixed inset-0 z-[80]">
          <div className="absolute inset-0 bg-black/70" onClick={cancelWarn} />
          <div className={cx("absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2 p-5", UI.card, "bg-black/80")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-2xl bg-red-500/15 border border-red-400/25 p-2">
                  <AlertTriangle className="text-red-200" size={18} />
                </div>
                <div>
                  <div className="text-lg font-black text-white">Significant change detected</div>
                  <div className={cx(UI.helper, "mt-1")}>
                    Compared to the last saved jig update
                    {warnInfo.prevWhen ? ` (${warnInfo.prevWhen.toLocaleString()})` : ""}. Threshold:{" "}
                    <span className="font-black text-white/80">{warnInfo.threshold}mm</span>.
                  </div>
                </div>
              </div>

              <button onClick={cancelWarn} className={UI.btnIcon} aria-label="Close" type="button">
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
              <button onClick={cancelWarn} className={UI.btnSecondary} type="button">
                Cancel
              </button>
              <button onClick={confirmSaveAnyway} className={cx(UI.btnPrimary, "justify-center")} type="button">
                <Save size={18} /> Save anyway
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Sticky save bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-5xl px-4 z-30">
        <div className="rounded-3xl border border-white/12 bg-black/55 backdrop-blur-xl p-4 shadow-lg">
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
                    {bikeTypeLabel(snapshot.bikeType)} • SB {fmt(snapshot.saddleSetback)} • 4cm {fmt(snapshot.height4cm)} •
                    15cm {fmt(snapshot.height15cm)}
                  </span>
                  <span className="text-white/40"> • {snapshot.at.toLocaleTimeString()}</span>
                  {snapshot.queued ? <span className="ml-2 text-yellow-200/80">• queued</span> : null}
                </div>
              ) : (
                <div className="text-xs text-white/50">Ready</div>
              )}

              {status.kind === "err" ? <div className="mt-1 text-xs text-red-200/90 truncate">{status.msg}</div> : null}
              {status.kind === "ok" ? <div className="mt-1 text-xs text-white/60 truncate">{status.msg}</div> : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={status.kind === "saving" || !canSave}
                onClick={onSave}
                className={cx(
                  "rounded-2xl px-5 py-3 font-black inline-flex items-center gap-2 transition active:scale-[0.99]",
                  status.kind === "saving" || !canSave
                    ? "bg-white/10 text-white/30 cursor-not-allowed"
                    : "bg-lime-300 text-black hover:bg-lime-200"
                )}
                type="button"
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
