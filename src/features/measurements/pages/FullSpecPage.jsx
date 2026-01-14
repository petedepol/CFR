import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ensureSession, fetchLatestFull, insertFull } from "../api/measurementsApi";
import { FULL_SPEC_DEFAULTS, FULL_SPEC_TEMPLATE_EXPORT } from "../utils/fullSpecDefaults";
import { ArrowLeft, Save, WifiOff } from "lucide-react";
import { useAuth } from "../../auth/AuthProvider.jsx";

const BIKE_TYPES = [
  { key: "mtb", label: "MTB" },
  { key: "road", label: "Road" },
  { key: "cx", label: "CX" },
];

export default function FullSpecPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { displayName } = useAuth();

  const mechanic = (displayName || "").trim();
  const rider = params.get("rider") || "";

  const [bikeType, setBikeType] = useState("mtb"); // default, minimal visibility for road/cx
  const [spec, setSpec] = useState(clone(FULL_SPEC_DEFAULTS)); // { mtb, road, cx }
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({ kind: "idle", msg: "" }); // idle|saving|ok|err
  const [snapshot, setSnapshot] = useState(null);

  const lastSaveRef = useRef({ at: 0, sig: "" });

  const canSave = useMemo(() => mechanic && rider, [mechanic, rider]);
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  const activeSpec = useMemo(() => {
    const k = bikeType || "mtb";
    const base = spec?.[k];
    return base && typeof base === "object" ? base : clone(FULL_SPEC_DEFAULTS.mtb);
  }, [spec, bikeType]);

  async function load({ silent = false } = {}) {
    if (!rider) return;
    if (!silent) setLoading(true);

    try {
      await ensureSession();
      const latest = await fetchLatestFull(rider);

      if (latest?.full_spec) {
        setSpec(normalizeFullSpec(latest.full_spec));
      } else {
        setSpec(clone(FULL_SPEC_DEFAULTS));
      }

      if (!silent) setStatus({ kind: "idle", msg: "" });
    } catch (e) {
      if (!silent) setStatus({ kind: "err", msg: e.message || "Failed to load latest bike spec." });
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
  }, [rider]);

  async function doSave(payload) {
    if (!canSave) {
      setStatus({ kind: "err", msg: "No mechanic/rider found." });
      return;
    }
    if (offline) {
      setStatus({ kind: "err", msg: "You’re offline. Reconnect and try again." });
      return;
    }
    if (status.kind === "saving") return;

    const sig = JSON.stringify(payload);
    const now = Date.now();
    if (lastSaveRef.current.sig === sig && now - lastSaveRef.current.at < 1500) {
      setStatus({ kind: "ok", msg: "✓ Already saved (just now)" });
      return;
    }

    setStatus({ kind: "saving", msg: "Saving…" });

    try {
      await insertFull(payload);
      lastSaveRef.current = { sig, at: Date.now() };
      setSnapshot({ at: new Date(), bikeType });
      setStatus({ kind: "ok", msg: "✓ Saved" });
      await load({ silent: true });
    } catch (e) {
      setStatus({ kind: "err", msg: `Save failed: ${e.message || "unknown error"}` });
    }
  }

  async function onSave() {
    // Store all 3 types together: mtb/road/cx
    await doSave({ rider, mechanic, fullSpec: spec });
  }

  function setField(section, key, value) {
    setSpec((prev) => {
      const prevType = prev?.[bikeType] && typeof prev[bikeType] === "object" ? prev[bikeType] : {};
      const nextType = {
        ...prevType,
        [section]: {
          ...(prevType?.[section] || {}),
          [key]: value,
        },
      };

      return {
        ...(prev || {}),
        [bikeType]: nextType,
      };
    });
  }

  return (
    <div className="space-y-4 pb-28">
      <button onClick={() => navigate("/measurements")} className="inline-flex items-center gap-2 text-white/70 hover:text-white">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="text-sm text-white/60 uppercase tracking-widest">Bike Spec</div>
            <div className="text-2xl font-black mt-1">{rider || "No rider selected"}</div>
            <div className="text-white/50 text-sm mt-1">Mechanic: {mechanic || "—"}</div>
          </div>

          {/* Minimal visibility selector: defaults to MTB */}
          <div className="flex items-end gap-3">
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
              <div className="mt-2 text-[11px] text-white/45">
                Road/CX are rare — default is MTB.
              </div>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 text-white/60">Loading latest…</div>
        ) : (
          <div className="mt-6 space-y-5">
            <Section title={`Frame (${labelForBikeType(bikeType)})`}>
              <Row>
                <Input label="Size" value={activeSpec.frame.size} onChange={(v) => setField("frame", "size", v)} />
                <Input label="Notes" value={activeSpec.frame.notes} onChange={(v) => setField("frame", "notes", v)} />
              </Row>
            </Section>

            <Section title="Saddle">
              <Row>
                <Input label="Model" value={activeSpec.saddle.model} onChange={(v) => setField("saddle", "model", v)} />
                <Input label="Angle" value={activeSpec.saddle.angle} onChange={(v) => setField("saddle", "angle", v)} />
              </Row>
            </Section>

            <Section title="Cockpit">
              <Row>
                <Input label="Stem model" value={activeSpec.cockpit.stemModel} onChange={(v) => setField("cockpit", "stemModel", v)} />
                <Input
                  label="Spacer under stem"
                  value={activeSpec.cockpit.spacerUnderStem}
                  onChange={(v) => setField("cockpit", "spacerUnderStem", v)}
                />
                <Input label="Grips" value={activeSpec.cockpit.grips} onChange={(v) => setField("cockpit", "grips", v)} />
              </Row>
              <Row>
                <Input
                  label="Handlebar model"
                  value={activeSpec.cockpit.handlebarModel}
                  onChange={(v) => setField("cockpit", "handlebarModel", v)}
                />
              </Row>
            </Section>

            <Section title="Drivetrain">
              <Row>
                <Input
                  label="Crank length"
                  value={activeSpec.drivetrain.crankLength}
                  onChange={(v) => setField("drivetrain", "crankLength", v)}
                />
                <Input
                  label="Pedals axle"
                  value={activeSpec.drivetrain.pedalsAxle}
                  onChange={(v) => setField("drivetrain", "pedalsAxle", v)}
                />
              </Row>
            </Section>

            <Section title="Seatpost">
              <Row>
                <Input label="Model" value={activeSpec.seatpost.model} onChange={(v) => setField("seatpost", "model", v)} />
                <Input
                  label="Lever option"
                  value={activeSpec.seatpost.leverOption}
                  onChange={(v) => setField("seatpost", "leverOption", v)}
                />
              </Row>
            </Section>

            <Section title="Brakes">
              <Row>
                <Input label="Model" value={activeSpec.brakes.model} onChange={(v) => setField("brakes", "model", v)} />
                <Input
                  label="Lever angle"
                  value={activeSpec.brakes.leverAngle}
                  onChange={(v) => setField("brakes", "leverAngle", v)}
                />
                <Input
                  label="Clamp to end bar"
                  value={activeSpec.brakes.clampToEndBar}
                  onChange={(v) => setField("brakes", "clampToEndBar", v)}
                />
              </Row>
            </Section>

            <Section title="Suspension">
              <Row>
                <Input
                  label="Shock tune"
                  value={activeSpec.suspension.shockTune}
                  onChange={(v) => setField("suspension", "shockTune", v)}
                />
                <Input
                  label="Fork tune"
                  value={activeSpec.suspension.forkTune}
                  onChange={(v) => setField("suspension", "forkTune", v)}
                />
              </Row>
            </Section>

            <Section title="Wheels / Tyres">
              <Row>
                <Input label="Tyres" value={activeSpec.wheels.tyres} onChange={(v) => setField("wheels", "tyres", v)} />
                <Input
                  label="Pressure front"
                  value={activeSpec.wheels.pressureFront}
                  onChange={(v) => setField("wheels", "pressureFront", v)}
                />
                <Input
                  label="Pressure rear"
                  value={activeSpec.wheels.pressureRear}
                  onChange={(v) => setField("wheels", "pressureRear", v)}
                />
              </Row>
            </Section>

            <Section title="Base settings">
              <Row>
                <Input
                  label="Fork PSI"
                  value={activeSpec.basesettings.forkPsi}
                  onChange={(v) => setField("basesettings", "forkPsi", v)}
                />
                <Input
                  label="Shock PSI"
                  value={activeSpec.basesettings.shockPsi}
                  onChange={(v) => setField("basesettings", "shockPsi", v)}
                />
                <Input
                  label="Bottle cage"
                  value={activeSpec.basesettings.bottleCage}
                  onChange={(v) => setField("basesettings", "bottleCage", v)}
                />
              </Row>
            </Section>
          </div>
        )}
      </div>

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-5xl px-4 z-30">
        <div className="rounded-3xl border border-white/10 bg-black/50 backdrop-blur-xl p-4 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="min-w-0">
              {offline ? (
                <div className="inline-flex items-center gap-2 text-xs text-white/70">
                  <WifiOff size={14} /> Offline — saves disabled
                </div>
              ) : snapshot ? (
                <div className="text-xs text-white/70">
                  <span className="text-white/85 font-black">Saved:</span>{" "}
                  <span className="font-black text-white/85">{`Bike Spec (${labelForBikeType(snapshot.bikeType || "mtb")})`}</span>
                  <span className="text-white/40"> • {snapshot.at.toLocaleTimeString()}</span>
                </div>
              ) : (
                <div className="text-xs text-white/50">Ready</div>
              )}
              {status.kind === "err" && <div className="mt-1 text-xs text-red-200/90 truncate">{status.msg}</div>}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={status.kind === "saving" || !canSave || offline}
                onClick={onSave}
                className={`rounded-2xl px-5 py-3 font-black flex items-center gap-2 ${
                  status.kind === "saving" || !canSave || offline
                    ? "bg-white/10 text-white/30 cursor-not-allowed"
                    : "bg-lime-300 text-black hover:bg-lime-200"
                }`}
              >
                <Save size={18} /> {status.kind === "saving" ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function labelForBikeType(k) {
  return k === "road" ? "Road" : k === "cx" ? "CX" : "MTB";
}

function normalizeFullSpec(incoming) {
  // If it's already in { mtb, road, cx } form, merge each.
  if (incoming && typeof incoming === "object" && (incoming.mtb || incoming.road || incoming.cx)) {
    return {
      mtb: mergeTemplate(FULL_SPEC_TEMPLATE_EXPORT, incoming.mtb),
      road: mergeTemplate(FULL_SPEC_TEMPLATE_EXPORT, incoming.road),
      cx: mergeTemplate(FULL_SPEC_TEMPLATE_EXPORT, incoming.cx),
    };
  }

  // Legacy: incoming was a single spec object (frame/saddle/...)
  // Treat it as MTB and keep Road/CX blank.
  return {
    mtb: mergeTemplate(FULL_SPEC_TEMPLATE_EXPORT, incoming),
    road: mergeTemplate(FULL_SPEC_TEMPLATE_EXPORT, null),
    cx: mergeTemplate(FULL_SPEC_TEMPLATE_EXPORT, null),
  };
}

function mergeTemplate(template, incoming) {
  const out = clone(template);

  if (!incoming || typeof incoming !== "object") return out;

  for (const section of Object.keys(out)) {
    const incSec = incoming?.[section];
    if (incSec && typeof incSec === "object") {
      out[section] = { ...out[section], ...incSec };
    }
  }
  return out;
}

function Section({ title, children }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 p-4">
      <div className="text-xs text-white/60 uppercase tracking-widest mb-3">{title}</div>
      {children}
    </div>
  );
}

function Row({ children }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 last:mb-0">{children}</div>;
}

function Input({ label, value, onChange }) {
  return (
    <label className="block">
      <div className="text-xs text-white/50 uppercase tracking-widest mb-2">{label}</div>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl bg-black/40 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-300/40"
      />
    </label>
  );
}

function clone(obj) {
  try {
    return structuredClone(obj);
  } catch {
    return JSON.parse(JSON.stringify(obj));
  }
}
