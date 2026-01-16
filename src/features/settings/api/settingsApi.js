import { supabase } from "../../../lib/supabaseClient";
import { enqueueBikeMeasurement, flushBikeMeasurementsQueue } from "../../../lib/offlineBikeMeasurementsQueue.js";

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

async function withRetry(fn, { tries = 2, allowOffline = false } = {}) {
  let lastErr = null;
  for (let i = 0; i <= tries; i++) {
    try {
      await kickAuth();

      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        const e = new Error("Offline");
        e.code = "OFFLINE";
        if (allowOffline) throw e;
        throw new Error("You’re offline. Reconnect and try again.");
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

export async function fetchMtbSettingsHistory(rider, limit = 200) {
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

export async function insertMtbSettings({ rider, mechanic, eventContext, setup, dedupeSig = "" }) {
  if (!rider) throw new Error("Missing rider");
  if (!mechanic) throw new Error("Missing mechanic");

  const payload = {
    rider,
    mechanic,
    type: SETTINGS_TYPE,
    full_spec: {
      kind: SETTINGS_TYPE,
      event_context: eventContext || "",
      setup: setup || {},
      // NOTE: race flag is set from history later (full_spec.is_race)
    },
    notes: setup?.notes || "",
    timestamp: new Date().toISOString(),
  };

  try {
    await withRetry(
      async () => {
        const { error } = await supabase.from("bike_measurements").insert([payload]);
        if (error) throw error;
      },
      { tries: 1, allowOffline: true }
    );

    try {
      await flushBikeMeasurementsQueue({ max: 10 });
    } catch {
      // ignore
    }

    return { queued: false };
  } catch (err) {
    const offline = err?.code === "OFFLINE" || (typeof navigator !== "undefined" && navigator.onLine === false);
    const queueable = offline || isRetryableError(err);

    if (queueable) {
      enqueueBikeMeasurement(payload, dedupeSig);
      return { queued: true, reason: offline ? "offline" : "retryable" };
    }

    throw err;
  }
}

/**
 * Mark/unmark a settings entry as a "Race" setup by updating its JSON full_spec.
 * (No DB schema changes; relies on RLS allowing UPDATE.)
 */
export async function setMtbSettingsRaceMark({ id, isRace }) {
  if (!id) throw new Error("Missing id");
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const e = new Error("Offline");
    e.code = "OFFLINE";
    throw e;
  }

  return withRetry(async () => {
    // 1) Read current full_spec so we don't accidentally wipe data
    const { data: row, error: readErr } = await supabase
      .from("bike_measurements")
      .select("id, full_spec")
      .eq("id", id)
      .limit(1)
      .maybeSingle();

    if (readErr) throw readErr;

    const cur = row?.full_spec && typeof row.full_spec === "object" ? row.full_spec : {};
    const next = {
      ...cur,
      is_race: !!isRace,
      race_marked_at: new Date().toISOString(),
    };

    const { error: updErr } = await supabase
      .from("bike_measurements")
      .update({ full_spec: next })
      .eq("id", id);

    if (updErr) throw updErr;

    return { ok: true, full_spec: next };
  });
}

/**
 * Admin edit: update event context + setup for a settings entry.
 * Updates both JSON full_spec and the top-level notes column.
 */
export async function updateMtbSettingsEntry({ id, eventContext, setup }) {
  if (!id) throw new Error("Missing id");
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const e = new Error("Offline");
    e.code = "OFFLINE";
    throw e;
  }

  return withRetry(async () => {
    // 1) Read current full_spec so we don't accidentally wipe data
    const { data: row, error: readErr } = await supabase
      .from("bike_measurements")
      .select("id, full_spec")
      .eq("id", id)
      .limit(1)
      .maybeSingle();

    if (readErr) throw readErr;

    const cur = row?.full_spec && typeof row.full_spec === "object" ? row.full_spec : {};
    const next = {
      ...cur,
      event_context: String(eventContext ?? ""),
      setup: setup && typeof setup === "object" ? setup : {},
      edited_at: new Date().toISOString(),
    };

    const notes = String((setup && setup.notes) || "");

    const { error: updErr } = await supabase
      .from("bike_measurements")
      .update({ full_spec: next, notes })
      .eq("id", id);

    if (updErr) throw updErr;

    return { ok: true, full_spec: next };
  });
}

/**
 * Admin delete: remove a settings entry.
 */
export async function deleteMtbSettingsEntry(id) {
  if (!id) throw new Error("Missing id");
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const e = new Error("Offline");
    e.code = "OFFLINE";
    throw e;
  }

  return withRetry(async () => {
    const { error } = await supabase.from("bike_measurements").delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  });
}
