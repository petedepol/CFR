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
        {err ? <div className="text-sm text-red-200/90">{err}</div> : null}

        {loading ? (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRiderCard key={i} />
            ))}
          </div>
        ) : riders.length === 0 ? (
          <div className="py-10 text-white/60">No riders loaded.</div>
        ) : (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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

function SkeletonRiderCard() {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 overflow-hidden">
      {/* Photo block (fixed aspect like Settings tiles) */}
      <div className="aspect-[4/3] bg-white/5 animate-pulse" />
      {/* Button strip (fixed height) */}
      <div className="p-4 space-y-2">
        <div className="h-12 rounded-2xl bg-white/5 animate-pulse" />
        <div className="h-12 rounded-2xl bg-white/5 animate-pulse" />
        <div className="h-12 rounded-2xl bg-white/5 animate-pulse" />
      </div>
    </div>
  );
}

function RiderCard({ rider, mechanic, offline, onJigUpdate, onBikeSpec, onHistory }) {
  const bgStyle = rider.photo
    ? { backgroundImage: `url(${rider.photo})` }
    : { backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(0,0,0,0.35))" };

  const disabledAll = !mechanic;
  const disabledSaves = !mechanic || offline;

  return (
    <div className="rounded-3xl border border-lime-300/20 bg-black/30 overflow-hidden shadow-lg">
      {/* Photo block: consistent size like Settings */}
      <div className="relative aspect-[4/3] bg-cover bg-center" style={bgStyle}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/85" />

        <div className="absolute top-3 right-3">
          <div className="h-11 w-11 rounded-2xl border border-white/10 bg-black/55 backdrop-blur flex items-center justify-center text-xl">
            {rider.flag || "🏁"}
          </div>
        </div>

        <div className="absolute bottom-3 left-4 right-4">
          <div className="text-xl font-black text-white leading-tight drop-shadow">
            {rider.fullName || rider.name}
          </div>
          <div className="mt-0.5 text-[11px] text-white/55">
            {offline ? "Offline" : mechanic ? `Mechanic: ${mechanic}` : "No mechanic"}
          </div>
        </div>
      </div>

      {/* Button strip: big tap targets for iPhone */}
      <div className="p-4 space-y-2">
        <ActionButton
          disabled={disabledSaves}
          primary
          label="Jig Update"
          onClick={onJigUpdate}
        />
        <ActionButton
          disabled={disabledSaves}
          label="Bike Spec"
          onClick={onBikeSpec}
        />
        <ActionButton
          disabled={disabledAll}
          label="History"
          onClick={onHistory}
        />
      </div>
    </div>
  );
}

function ActionButton({ label, onClick, disabled, primary }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={[
        "w-full rounded-2xl px-4 h-12 font-black inline-flex items-center justify-between transition select-none",
        primary
          ? disabled
            ? "bg-white/5 text-white/20 cursor-not-allowed border border-white/10"
            : "bg-lime-300 text-black hover:bg-lime-200"
          : disabled
          ? "bg-white/5 text-white/20 cursor-not-allowed border border-white/10"
          : "bg-white/5 text-white/80 border border-white/15 hover:bg-white/10",
      ].join(" ")}
    >
      {label} <ChevronRight size={18} />
    </button>
  );
}
