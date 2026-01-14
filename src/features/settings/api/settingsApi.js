import { supabase } from "../../../lib/supabaseClient";

// ---------- small helpers (kept local so Settings is self-contained) ----------
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function isRetryableError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  const status = err?.status;

  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  if (status && status >= 500) return true;
  if (msg.includes("failed to fetch")) return true;
  if (msg.includes("network")) return true;
  if (msg.includes("timeout")) return true;
  if (msg.includes("abort")) return true;

  return false;
}

async function kickAuth() {
  try {
    await supabase.auth.getSession();
  } catch {
    // ignore
  }
}

async function withRetry(fn, { tries = 2 } = {}) {
  let lastErr = null;
  for (let i = 0; i <= tries; i++) {
    try {
      await kickAuth();
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryableError(err) || i === tries) break;
      await sleep(250 * (i + 1));
    }
  }
  throw lastErr;
}

const SETTINGS_TYPE = "settings_mtb";

// ---------- API ----------
export async function fetchLatestMtbSettings(rider) {
  if (!rider) return null;

  return withRetry(async () => {
    const { data, error } = await supabase
      .from("bike_measurements")
      .select("*")
      .eq("rider", rider)
      .eq("type", SETTINGS_TYPE)
      .order("timestamp", { ascending: false })
      .limit(1);

    if (error) throw error;
    return (data ?? [])[0] ?? null;
  });
}

export async function fetchMtbSettingsHistory(rider, limit = 50) {
  if (!rider) return [];

  return withRetry(async () => {
    const { data, error } = await supabase
      .from("bike_measurements")
      .select("*")
      .eq("rider", rider)
      .eq("type", SETTINGS_TYPE)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  });
}

export async function insertMtbSettings({ rider, mechanic, eventContext, setup }) {
  if (!rider) throw new Error("Missing rider");
  if (!mechanic) throw new Error("Missing mechanic");

  const payload = {
    rider,
    mechanic,
    type: SETTINGS_TYPE,
    // Store everything in JSON so we don't need schema changes:
    full_spec: {
      kind: SETTINGS_TYPE,
      event_context: eventContext || "",
      setup: setup || {},
    },
    // Optional mirror for quick scanning/searching:
    notes: setup?.notes || "",
    timestamp: new Date().toISOString(),
  };

  return withRetry(async () => {
    const { error } = await supabase.from("bike_measurements").insert([payload]);
    if (error) throw error;
  });
}
