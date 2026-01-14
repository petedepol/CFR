import React, { useEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const HARD_RELOAD_KEY = "cfr_last_hard_reload_at_ms";
const HARD_RELOAD_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes

async function pingRiders() {
  const { error } = await supabase.from("riders").select("name").limit(1);
  if (error) throw error;
}

function fmtTime(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function navPillClass(isActive) {
  return [
    "rounded-2xl px-4 py-2 text-xs font-black tracking-wide border transition",
    isActive
      ? "bg-lime-300 text-black border-lime-200"
      : "bg-black/40 text-white/75 border-white/10 hover:border-white/20 hover:bg-black/55",
  ].join(" ");
}

export default function AppShell() {
  const checkingRef = useRef(false);
  const lastResumeAtRef = useRef(0);

  const [health, setHealth] = useState({
    net: typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "online",
    phase: "ok", // ok|checking|error
    msg: "",
    lastOkAt: null,
  });

  useEffect(() => {
    const onNet = () => {
      const online = typeof navigator === "undefined" ? true : navigator.onLine !== false;
      setHealth((h) => ({ ...h, net: online ? "online" : "offline" }));
    };
    window.addEventListener("online", onNet);
    window.addEventListener("offline", onNet);
    return () => {
      window.removeEventListener("online", onNet);
      window.removeEventListener("offline", onNet);
    };
  }, []);

  useEffect(() => {
    async function recoverOnResume() {
      if (checkingRef.current) return;
      checkingRef.current = true;

      try {
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          setHealth((h) => ({ ...h, net: "offline", phase: "ok", msg: "" }));
          return;
        }

        const now = Date.now();
        if (now - lastResumeAtRef.current < 1500) return;
        lastResumeAtRef.current = now;

        setHealth((h) => ({ ...h, net: "online", phase: "checking", msg: "Reconnecting…" }));

        try {
          await pingRiders();
          setHealth((h) => ({ ...h, phase: "ok", msg: "", lastOkAt: Date.now() }));
          return;
        } catch {
          // ignore and try refresh
        }

        await supabase.auth.refreshSession();
        await pingRiders();
        setHealth((h) => ({ ...h, phase: "ok", msg: "", lastOkAt: Date.now() }));
      } catch {
        const now = Date.now();
        const last = Number(localStorage.getItem(HARD_RELOAD_KEY) || "0");
        const canReload = !Number.isFinite(last) || now - last > HARD_RELOAD_COOLDOWN_MS;

        if (canReload) {
          localStorage.setItem(HARD_RELOAD_KEY, String(now));
          window.location.reload();
          return;
        }

        setHealth((h) => ({
          ...h,
          net: "online",
          phase: "error",
          msg: "Connection issue. Auto-retry runs on refocus / when signal returns.",
        }));
      } finally {
        checkingRef.current = false;
      }
    }

    const onVis = () => {
      if (document.visibilityState === "visible") void recoverOnResume();
    };
    const onFocus = () => void recoverOnResume();
    const onOnline = () => void recoverOnResume();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="absolute -rotate-12 top-16 left-[-18%] text-[140px] md:text-[180px] font-black tracking-tight">
            CANNONDALE
          </div>
          <div className="absolute rotate-6 bottom-10 right-[-10%] text-[96px] md:text-[130px] font-black tracking-tight">
            CFR
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="fixed top-3 right-3 z-50">
        <div className="rounded-2xl border border-white/10 bg-black/55 backdrop-blur px-3 py-2 text-[11px] font-semibold text-white/75">
          <div className="flex items-center gap-2">
            <span className={health.net === "online" ? "text-lime-200" : "text-red-200"}>
              {health.net === "online" ? "Online" : "Offline"}
            </span>
            <span className="text-white/35">•</span>
            <span
              className={
                health.phase === "error"
                  ? "text-red-200"
                  : health.phase === "checking"
                  ? "text-white/80"
                  : "text-white/70"
              }
            >
              {health.phase === "checking" ? "Checking" : health.phase === "error" ? "Issue" : "OK"}
            </span>
            {health.lastOkAt ? (
              <>
                <span className="text-white/35">•</span>
                <span className="text-white/55">{fmtTime(health.lastOkAt)}</span>
              </>
            ) : null}
          </div>
          {health.msg ? <div className="mt-1 text-[10px] text-white/50">{health.msg}</div> : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        {/* Top nav (module switch) */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* ✅ Settings first (default workflow) */}
            <NavLink to="/settings" className={({ isActive }) => navPillClass(isActive)}>
              Settings
            </NavLink>
            <NavLink to="/measurements" className={({ isActive }) => navPillClass(isActive)}>
              Measurements
            </NavLink>
          </div>

          <div className="text-[11px] text-white/45 font-semibold">Default: Settings</div>
        </div>

        <Outlet />
      </div>
    </div>
  );
}
