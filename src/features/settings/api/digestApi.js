import { supabase } from "../../../lib/supabaseClient";

// Fixed UUID for the single team settings row
const SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

// ---------- helpers ----------
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

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        const e = new Error("Offline");
        e.code = "OFFLINE";
        throw e;
      }

      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetryableError(err) || i === tries) break;
      await sleep(250 * (i + 1));
    }
  }
  throw lastErr;
}

// ---------- API ----------

/**
 * Fetch current digest settings
 */
export async function fetchDigestSettings() {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from("digest_settings")
      .select("*")
      .eq("id", SETTINGS_ID)
      .single();

    if (error) {
      // If table doesn't exist yet, return defaults
      if (error.code === "PGRST116") {
        return {
          enabled: false,
          frequency: "weekly",
          day: "Sunday",
          day_of_month: 1,
          time: "20:00",
          coach_emails: [],
          mechanic_emails: [],
          rider_emails: [],
        };
      }
      throw error;
    }

    return data;
  });
}

/**
 * Update digest settings
 */
export async function updateDigestSettings({
  enabled,
  frequency,
  day,
  dayOfMonth,
  time,
  coachEmails,
  mechanicEmails,
  riderEmails,
  updatedBy,
}) {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from("digest_settings")
      .upsert({
        id: SETTINGS_ID,
        enabled,
        frequency: frequency || "weekly",
        day,
        day_of_month: dayOfMonth || 1,
        time,
        coach_emails: coachEmails || [],
        mechanic_emails: mechanicEmails || [],
        rider_emails: riderEmails || [],
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}
