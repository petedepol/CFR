import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let alive = true;

    async function boot() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!alive) return;
        setSession(data?.session ?? null);
      } catch {
        if (!alive) return;
        setSession(null);
      } finally {
        if (!alive) return;
        setBooting(false);
      }
    }

    boot();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!alive) return;
      setSession(nextSession ?? null);
    });

    // Important for mobile / tab-sleep reliability:
    // when app becomes visible again, refresh session so requests don’t hang on stale auth.
    const onResume = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        // some versions expose these; safe to call if present
        if (supabase.auth.startAutoRefresh) supabase.auth.startAutoRefresh();
        await supabase.auth.refreshSession();
      } catch {
        // ignore
      }
    };

    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("focus", onResume);

    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("focus", onResume);

      if (supabase.auth.stopAutoRefresh) supabase.auth.stopAutoRefresh();
    };
  }, []);

  const value = useMemo(() => {
    const user = session?.user ?? null;
    return {
      session,
      user,
      booting,
      isAuthed: Boolean(user),
    };
  }, [session, booting]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
