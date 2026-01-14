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
        <div className="text-white/60 py-10">Loading riders…</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3">
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

function RiderTile({ rider, onClick }) {
  const bgStyle = rider.photo
    ? { backgroundImage: `url(${rider.photo})` }
    : { backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.10), rgba(0,0,0,0.35))" };

  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/30 hover:border-lime-300/30 transition text-left"
      aria-label={`Open settings for ${rider.fullName || rider.name}`}
    >
      <div className="h-[140px] sm:h-[150px] md:h-[160px] bg-cover bg-center" style={bgStyle}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/20 to-black/85" />
      </div>

      <div className="absolute top-2 left-2">
        <div className="h-9 w-9 rounded-xl border border-white/10 bg-black/55 backdrop-blur flex items-center justify-center text-lg">
          {rider.flag || "🏁"}
        </div>
      </div>

      <div className="absolute bottom-2 left-3 right-3">
        <div className="text-white font-black text-sm leading-tight truncate drop-shadow">
          {rider.fullName || rider.name}
        </div>
        <div className="text-[10px] text-white/60 truncate">{rider.country || ""}</div>
      </div>

      <div className="absolute inset-0 ring-0 group-hover:ring-2 group-hover:ring-lime-300/20 rounded-2xl transition" />
    </button>
  );
}
