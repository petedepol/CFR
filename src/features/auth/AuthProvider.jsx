// src/features/auth/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";

const AuthContext = createContext(null);

// Default mechanic display name shown in the UI
const DEFAULT_DISPLAY_NAME = "Pete";

function safeGetLocalStorage(key) {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorage(key, value) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);

  // User-facing display name so the UI doesn’t show user.email.
  const [displayName, setDisplayNameState] = useState(() => {
    return safeGetLocalStorage("display_name") || DEFAULT_DISPLAY_NAME;
  });

  // Role from allowed_users (optional)
  const [role, setRole] = useState(null);

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

    // Helps with tab sleep / mobile backgrounding: refresh session on resume
    const onResume = async () => {
      if (document.visibilityState && document.visibilityState !== "visible") return;
      try {
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

  // Pull allowed_users info (name/role) for the logged-in email
  useEffect(() => {
    let alive = true;

    async function loadAllowedUser() {
      const email = session?.user?.email ? String(session.user.email).toLowerCase() : "";
      if (!email) {
        if (!alive) return;
        setRole(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("allowed_users")
          .select("name, role, active")
          .eq("email", email)
          .limit(1)
          .maybeSingle();

        if (!alive) return;

        if (error) {
          // If RLS blocks this, the app still works (just no admin UI)
          setRole(null);
          return;
        }

        const au = data || null;
        const nextRole = au?.active ? au?.role || null : null;
        setRole(nextRole);

        // If allowed_users has a name, use it for displayName
        const auName = (au?.active ? au?.name : "") || "";
        if (auName.trim()) {
          safeSetLocalStorage("display_name", auName.trim());
          setDisplayNameState(auName.trim());
          return;
        }
      } catch {
        if (!alive) return;
        setRole(null);
      }
    }

    loadAllowedUser();

    return () => {
      alive = false;
    };
  }, [session?.user?.email]);

  // Ensure a stable display name exists (fallback)
  useEffect(() => {
    const stored = safeGetLocalStorage("display_name");
    if (!stored) {
      safeSetLocalStorage("display_name", DEFAULT_DISPLAY_NAME);
      setDisplayNameState(DEFAULT_DISPLAY_NAME);
      return;
    }
    if (stored !== displayName) setDisplayNameState(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const value = useMemo(() => {
    const user = session?.user ?? null;
    const email = user?.email ? String(user.email).toLowerCase() : "";

    return {
      session,
      user,
      email,

      booting,
      loading: booting,

      isAuthed: Boolean(user),

      displayName,
      role,
      isAdmin: role === "admin",

      setDisplayName: (name) => {
        const next = (name || "").trim() || DEFAULT_DISPLAY_NAME;
        safeSetLocalStorage("display_name", next);
        setDisplayNameState(next);
      },
    };
  }, [session, booting, displayName, role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
