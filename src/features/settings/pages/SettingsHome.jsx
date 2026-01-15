import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureSession, fetchRiders } from "../../measurements/api/measurementsApi";

export default function SettingsHome() {
  const nav = useNavigate();
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const mounted = useRef(false);

  async function load({ silent = false } = {}) {
    try {
      if (!silent) setLoading(true);
      setErr("");
      await ensureSession();
      const r = await fetchRiders();
      if (!mounted.current) return;
      setRiders(r || []);
    } catch (e) {
      if (!mounted.current) return;
      setErr(e?.message || "Failed to load riders.");
    } finally {
      if (!mounted.current) return;
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    mounted.current = true;
    load();

    const onVis = () => document.visibilityState === "visible" && load({ silent: true });
    const onFocus = () => load({ silent: true });
    const onOnline = () => load({ silent: true });

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    return () => {
      mounted.current = false;
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return (
    <div className="space-y-4">
      {err ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-red-200 text-sm">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonTile key={i} />
          ))}
        </div>
      ) : riders.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-8 text-white/70">
          No riders loaded.
          <div className="text-white/45 text-sm mt-2">Try refreshing, or check Supabase connection.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-4">
          {riders.map((r) => (
            <RiderTile
              key={r.name}
              rider={r}
              onClick={() => nav(`/settings/mtb?rider=${encodeURIComponent(r.name)}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonTile() {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/30 overflow-hidden shadow-lg">
      <div className="relative aspect-[4/3] bg-white/5 animate-pulse" />
      <div className="p-4">
        <div className="h-5 w-2/3 rounded-xl bg-white/5 animate-pulse" />
        <div className="h-4 w-1/3 rounded-xl bg-white/5 animate-pulse mt-2" />
      </div>
    </div>
  );
}

function RiderTile({ rider, onClick }) {
  const bgStyle = rider.photo
    ? { backgroundImage: `url(${rider.photo})` }
    : { backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(0,0,0,0.35))" };

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-3xl border border-lime-300/20 bg-black/30 hover:border-lime-300/30 transition text-left shadow-lg"
      aria-label={`Open settings for ${rider.fullName || rider.name}`}
    >
      <div className="relative aspect-[4/3] bg-cover bg-center" style={bgStyle}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black/85" />

        <div className="absolute top-3 right-3">
          <div className="h-11 w-11 rounded-2xl border border-white/10 bg-black/55 backdrop-blur flex items-center justify-center text-xl">
            {rider.flag || "🏁"}
          </div>
        </div>

        <div className="absolute bottom-3 left-4 right-4">
          <div className="text-xl font-black text-white leading-tight drop-shadow truncate">
            {rider.fullName || rider.name}
          </div>
          <div className="mt-0.5 text-[11px] text-white/55 truncate">{rider.country || ""}</div>
        </div>
      </div>

      <div className="absolute inset-0 ring-0 group-hover:ring-2 group-hover:ring-lime-300/20 rounded-3xl transition" />
    </button>
  );
}
