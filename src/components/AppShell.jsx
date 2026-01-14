import React, { useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

async function pingRiders() {
  // tiny query to verify DB is reachable + auth is valid
  const { error } = await supabase.from("riders").select("name").limit(1);
  if (error) throw error;
}

export default function AppShell() {
  const checkingRef = useRef(false);
  const lastResumeAtRef = useRef(0);

  useEffect(() => {
    async function recoverOnResume() {
      if (checkingRef.current) return;
      checkingRef.current = true;

      try {
        // Don’t do anything if offline
        if (typeof navigator !== "undefined" && navigator.onLine === false) return;

        // Prevent hammering recovery (some browsers fire focus/vis multiple times)
        const now = Date.now();
        if (now - lastResumeAtRef.current < 1500) return;
        lastResumeAtRef.current = now;

        // 1) Try ping directly
        try {
          await pingRiders();
          return;
        } catch {
          // ignore and try refresh
        }

        // 2) Force refresh token after tab sleep
        await supabase.auth.refreshSession();

        // 3) Ping again
        await pingRiders();
      } catch (e) {
        // If we STILL can't talk to Supabase while online, full reload is the cleanest recovery.
        // This preserves the URL, so you return to the same view.
        window.location.reload();
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
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-neutral-950 to-black" />
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[520px] rounded-full bg-lime-300/10 blur-3xl" />
        <div className="absolute -bottom-56 right-[-120px] h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl" />

        <div className="pointer-events-none absolute inset-0 opacity-[0.06] select-none">
          <div className="absolute -rotate-12 top-16 left-[-18%] text-[140px] md:text-[180px] font-black tracking-tight">
            CANNONDALE
          </div>
          <div className="absolute rotate-6 bottom-10 right-[-10%] text-[96px] md:text-[130px] font-black tracking-tight">
            CFR
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 py-6">
        <Outlet />
      </div>
    </div>
  );
}
