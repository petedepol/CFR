import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureSession, fetchRiders } from "../api/measurementsApi";
import { useAuth } from "../../auth/AuthProvider";
import { ChevronRight } from "lucide-react";

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

  useEffect(() => {
    mountedRef.current = true;

    async function load() {
      const myId = ++reqIdRef.current;
      setLoading(true);
      setErr("");

      try {
        await ensureSession();
        const data = await fetchRiders();
        if (!mountedRef.current || myId !== reqIdRef.current) return;
        setRiders(data || []);
      } catch (e) {
        if (!mountedRef.current || myId !== reqIdRef.current) return;
        setErr(e.message || "Failed to load riders.");
      } finally {
        if (!mountedRef.current || myId !== reqIdRef.current) return;
        setLoading(false);
      }
    }

    load();

    const onFocus = () => load();
    const onOnline = () => load();

    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  function go(path, riderName) {
    const mech = encodeURIComponent(mechanic || "");
    const rider = encodeURIComponent(riderName || "");
    navigate(`${path}?mech=${mech}&rider=${rider}`);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <div className="text-sm text-white/60 uppercase tracking-widest">Measurements</div>
            <div className="text-2xl font-black mt-1">Select Rider</div>
            <div className="text-white/50 text-sm mt-1">Mechanic: {mechanic || "—"}</div>
          </div>

          {offline ? (
            <div className="text-xs text-white/50">Offline</div>
          ) : (
            <div className="text-xs text-white/50">Online</div>
          )}
        </div>

        {err ? <div className="mt-4 text-sm text-red-200/90">{err}</div> : null}

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
                onHistory={() => go("/measurements/history", r.name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RiderCard({ rider, mechanic, offline, onJigUpdate, onBikeSpec, onHistory }) {
  const bgStyle = rider.photo
    ? { backgroundImage: `url(${rider.photo})` }
    : { backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(0,0,0,0.35))" };

  return (
    <div className="rounded-3xl border border-lime-300/20 bg-black/30 overflow-hidden shadow-lg">
      <div className="relative h-[280px] md:h-[320px] bg-cover bg-center" style={bgStyle}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/85" />
        <div className="absolute top-4 right-4">
          <div className="h-12 w-12 rounded-2xl border border-white/10 bg-black/55 backdrop-blur flex items-center justify-center text-xl">
            {rider.flag || "🏁"}
          </div>
        </div>
        <div className="absolute bottom-4 left-5 right-5">
          <div className="text-2xl font-black text-white leading-tight drop-shadow">
            {rider.fullName || rider.name}
          </div>
          <div className="mt-1 text-xs text-white/55">
            {offline ? "Offline" : mechanic ? `Mechanic: ${mechanic}` : "No mechanic"}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-2">
        <button
          disabled={!mechanic || offline}
          onClick={onJigUpdate}
          className={`w-full rounded-2xl px-4 py-3 font-black inline-flex items-center justify-between transition ${
            mechanic && !offline
              ? "bg-lime-300 text-black hover:bg-lime-200"
              : "bg-white/5 text-white/20 cursor-not-allowed border border-white/10"
          }`}
        >
          Jig Update <ChevronRight size={18} />
        </button>

        <button
          disabled={!mechanic || offline}
          onClick={onBikeSpec}
          className={`w-full rounded-2xl px-4 py-3 font-black inline-flex items-center justify-between transition ${
            mechanic && !offline
              ? "bg-white/5 text-white/80 border border-white/15 hover:bg-white/10"
              : "bg-white/5 text-white/20 cursor-not-allowed border border-white/10"
          }`}
        >
          Bike Spec <ChevronRight size={18} />
        </button>

        <button
          disabled={!mechanic}
          onClick={onHistory}
          className={`w-full rounded-2xl px-4 py-3 font-black inline-flex items-center justify-between transition ${
            mechanic
              ? "bg-white/5 text-white/80 border border-white/15 hover:bg-white/10"
              : "bg-white/5 text-white/20 cursor-not-allowed border border-white/10"
          }`}
        >
          History <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
