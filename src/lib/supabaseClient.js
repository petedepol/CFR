import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function fetchWithTimeout(timeoutMs = 15000) {
  return async (input, init = {}) => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(input, {
        ...init,
        signal: init.signal ?? controller.signal,
      });
      return res;
    } finally {
      clearTimeout(t);
    }
  };
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "cfr-bike-app-v2-auth", // 👈 stable across reloads on the SAME domain
  },
  global: {
    fetch: fetchWithTimeout(15000),
  },
});
