// src/features/auth/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient.js";

const AuthContext = createContext(null);

// Only used when no user session exists
const DEFAULT_DISPLAY_NAME = "—";

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

function safeRemoveLocalStorage(key) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function makeUserDisplayNameKey(userId) {
  return userId ? `display_name__${userId}` : "display_name__no_user";
}

function fallbackNameFromEmail(email) {
  const e = String(email || "").trim();
  if (!e) return DEFAULT_DISPLAY_NAME;
  const local = e.split("@")[0] || e;
  const cleaned = local.replace(/[._-]+/g, " ").trim();
  return cleaned ? cleaned.replace(/\b\w/g, (c) => c.toUpperCase()) : DEFAULT_DISPLAY_NAME;
}

async function fetchNameFromAllowedUsers(email) {
  const em = String(email || "").trim();
  if (!em) return null;

  // Prefer exact lowercased match (most setups store email lowercased)
  const lower = em.toLowerCase();

  // 1) Try eq on lower (fast path)
  {
    const { data, error } = await supabase
      .from("allowed_users")
      .select("name,email,active")
      .eq("email", lower)
      .maybeSingle();

    if (!error && data?.active && data?.name) return String(data.name).trim();
  }

  // 2) Fallback: case-insensitive match (handles mixed-case emails)
  {
    const { data, error } = await supabase
      .from("allowed_users")
      .select("name,email,active")
      .ilike("email", em) // case-insensitive
      .maybeSingle();

    if (!error && data?.active && data?.name) return String(data.name).trim();
  }

  return null;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);

  // A user-facing display name so the UI doesn’t show user.email.
  const [displayName, setDisplayNameState] = useState(DEFAULT_DISPLAY_NAME);

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

  // ✅ Per-user display name resolution:
  // - Use localStorage key scoped to user id
  // - If missing, pull from public.allowed_users by email (case-insensitive fallback)
  // - If still missing, fallback to email local-part
  useEffect(() => {
    let alive = true;

    async function resolveDisplayName() {
      const user = session?.user ?? null;

      // No session → show placeholder
      if (!user) {
        setDisplayNameState(DEFAULT_DISPLAY_NAME);
        return;
      }

      const userId = user.id;
      const userEmail = user.email || "";
      const key = makeUserDisplayNameKey(userId);

      // If we have a per-user cached name, use it immediately
      const stored = safeGetLocalStorage(key);
      if (stored && stored.trim()) {
        setDisplayNameState(stored.trim());
        return;
      }

      // Otherwise, fetch from allowed_users
      try {
        const name = await fetchNameFromAllowedUsers(userEmail);
        if (!alive) return;

        if (name) {
          safeSetLocalStorage(key, name);
          setDisplayNameState(name);
          return;
        }
      } catch {
        // ignore; fallback below
      }

      // Final fallback: derive from email
      const fallback = fallbackNameFromEmail(userEmail);
      safeSetLocalStorage(key, fallback);
      setDisplayNameState(fallback);

      // Optional: stop using the old global key if it exists (prevents “Pete” leakage)
      // We do NOT read it anymore, but cleaning reduces confusion.
      safeRemoveLocalStorage("display_name");
    }

    resolveDisplayName();

    return () => {
      alive = false;
    };
  }, [session?.user?.id]); // re-run on login user change

  const value = useMemo(() => {
    const user = session?.user ?? null;

    return {
      session,
      user,

      // ✅ Some parts of your app expect `loading`, others `booting`
      booting,
      loading: booting,

      isAuthed: Boolean(user),

      // ✅ Use this everywhere in the UI instead of user.email
      displayName,

      // ✅ Per-user setter
      setDisplayName: (name) => {
        const userId = user?.id;
        const key = makeUserDisplayNameKey(userId);
        const next = (name || "").trim() || fallbackNameFromEmail(user?.email);
        safeSetLocalStorage(key, next);
        setDisplayNameState(next);
      },
    };
  }, [session, booting, displayName]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
