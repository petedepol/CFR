import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureSession, fetchRiders } from "../api/measurementsApi";
import { useAuth } from "../../auth/AuthProvider";
import { History, ChevronRight } from "lucide-react";

export default function MeasurementsHome() {
  const navigate = useNavigate();
  const { displayName } = useAuth();

  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const mountedRef = useRef(true);
  const reqIdRef = useRef(0);

  const mechanic = useMemo(() => (displayName || "").trim(), [displayName]);
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  async function loadRiders({ silent = false } = {}) {
    const reqId = ++reqIdRef.current;

    if (!silent) setLoading(true);
    setErr("");

    try {
      await ensureSession();
      const list = await fetchRiders();

      if (!mountedRef.current) return;
      if (reqId !== reqIdRef.current) return;

      setRiders(list);
    } catch (e) {
      if (!mountedRef.current) return;
      if (reqId !== reqIdRef.current) return;

      setRiders([]);
      setErr(e?.message || "Failed to load riders.");
    } finally {
      if (!mountedRef.current) return;
      if (reqId !== reqIdRef.current) return;

      setLoading(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    loadRiders();

    const onVis = () => {
      if (document.visibilityState === "visible") loadRiders({ silent: true });
    };
    const onFocus = () => loadRiders({ silent: true });
    const onOnline = () => loadRiders({ silent: true });

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function go(path, riderName) {
    const p = new URLSearchParams();
    if (riderName) p.set("rider", riderName);
    navigate(`${path}?${p.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6">
        <div className="text-sm text-white/60 uppercase tracking-widest">Mechanic</div>
        <div className="mt-1 text-2xl font-black">{mechanic || "—"}</div>

        {offline && (
          <div className="mt-3 text-xs text-white/60">
            You’re offline — saves disabled, history still available.
          </div>
        )}

        {err && (
          <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-red-200 text-sm">
            {err}
          </div>
        )}
      </div>

      <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.055]">
          <div className="absolute -rotate-12 top-10 left-[-18%] text-[140px] md:text-[170px] font-black tracking-tight select-none">
            CANNONDALE
          </div>
          <div className="absolute rotate-6 bottom-6 right-[-10%] text-[92px] md:text-[120px] font-black tracking-tight select-none">
            CFR
          </div>
        </div>

        <div className="relative">
          <div className="text-lg font-black tracking-tight">Team Riders</div>
          <div className="text-sm text-white/50 mt-1">Choose a rider and an action.</div>

          {loading ? (
            <div className="py-10 text-white/60">Loading riders…</div>
          ) : riders.length === 0 ? (
            <div className="py-10 text-white/60">No riders loaded.</div>
          ) : (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {riders.map((r) => (
                <RiderCard
                  key={r.name}
                  rider={r}
                  mechanic={mechanic}
                  offline={offline}
                  onJigUpdate={() => go("/measurements/quick", r.name)}
                  onBikeSpec={() => go("/measurements/full", r.name)}
                  onJigHistory={() => go("/measurements/history", r.name)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RiderCard({ rider, mechanic, offline, onJigUpdate, onBikeSpec, onJigHistory }) {
  const canSave = Boolean(mechanic) && !offline;

  const bgStyle = rider.photo
    ? { backgroundImage: `url(${rider.photo})` }
    : { backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(0,0,0,0.35))" };

  return (
    <div className="rounded-3xl border border-lime-300/20 bg-black/30 overflow-hidden shadow-lg">
      <div className="relative h-[280px] md:h-[320px] bg-cover bg-center" style={bgStyle}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/85" />
        <div className="absolute top-4 right-4">
          <div className="h-12 w-12 rounded-2xl border border-lime-300/30 bg-black/55 backdrop-blur flex items-center justify-center text-xl">
            {rider.flag || "🏁"}
          </div>
        </div>
        <div className="absolute bottom-4 left-5 right-5">
          <div className="text-2xl font-black text-white leading-tight drop-shadow">
            {rider.fullName || rider.name}
          </div>
          <div className="mt-1 text-sm font-black text-lime-300 tracking-widest">
            {(rider.code || rider.countryCode || "").toUpperCase() || rider.country || ""}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <button
          disabled={!canSave}
          onClick={onJigUpdate}
          className={`w-full rounded-2xl px-4 py-4 font-black inline-flex items-center justify-center gap-2 transition ${
            canSave ? "bg-lime-300 text-black hover:bg-lime-200" : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
        >
          JIG UPDATE <ChevronRight size={18} />
        </button>

        <button
          disabled={!canSave}
          onClick={onBikeSpec}
          className={`w-full rounded-2xl px-4 py-4 font-black inline-flex items-center justify-center gap-2 transition ${
            canSave
              ? "bg-lime-300/15 text-lime-200 border border-lime-300/30 hover:bg-lime-300/20"
              : "bg-white/10 text-white/30 cursor-not-allowed"
          }`}
        >
          BIKE SPEC <ChevronRight size={18} />
        </button>

        <button
          disabled={!mechanic}
          onClick={onJigHistory}
          className={`w-full rounded-2xl px-4 py-4 font-black inline-flex items-center justify-center gap-2 transition ${
            mechanic
              ? "bg-white/5 text-white/80 border border-white/15 hover:bg-white/10"
              : "bg-white/5 text-white/20 cursor-not-allowed border border-white/10"
          }`}
        >
          <History size={18} />
          JIG HISTORY
        </button>
      </div>
    </div>
  );
}
