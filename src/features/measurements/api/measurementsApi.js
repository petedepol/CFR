import { supabase } from "../../../lib/supabaseClient";

// ---------- small helpers ----------
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
  if (msg.includes("tempor")) return true;
  return false;
}

// Hard timeout so requests can’t hang forever
async function withTimeout(promise, ms = 15000) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error("Request timed out. Please try again.")), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(t);
  }
}

async function withRetry(fn, { retries = 1, baseDelayMs = 250, timeoutMs = 15000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        const e = new Error("You appear to be offline. Reconnect and try again.");
        e.code = "OFFLINE";
        throw e;
      }
      return await withTimeout(fn(), timeoutMs);
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isRetryableError(err)) throw err;
      await sleep(baseDelayMs * (attempt + 1));
    }
  }
  throw lastErr;
}

export async function ensureSession() {
  try {
    await supabase.auth.getSession();
  } catch {
    // ignore
  }
}

function quickTypeForBikeType(bikeType) {
  const k = String(bikeType || "mtb").toLowerCase();
  if (k === "road") return "quick_road";
  if (k === "cx") return "quick_cx";
  return "quick"; // MTB + legacy default
}

// ---------- API ----------
export async function fetchRiders() {
  return withRetry(async () => {
    const { data, error } = await supabase.from("riders").select("*").order("name");
    if (error) throw error;

    return (data ?? []).map((r) => ({
      name: r.name,
      fullName: r.full_name ?? r.name,
      flag: r.flag ?? "🏁",
      country: r.country ?? "",
      photo: r.photo ?? "",
    }));
  });
}

export async function fetchLatestQuick(rider, bikeType = "mtb") {
  const t = quickTypeForBikeType(bikeType);

  return withRetry(async () => {
    const { data, error } = await supabase
      .from("bike_measurements")
      .select("*")
      .eq("rider", rider)
      .eq("type", t)
      .order("timestamp", { ascending: false })
      .limit(1);

    if (error) throw error;
    return data?.[0] ?? null;
  });
}

export async function fetchLatestFull(rider) {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from("bike_measurements")
      .select("*")
      .eq("rider", rider)
      .eq("type", "full")
      .order("timestamp", { ascending: false })
      .limit(1);

    if (error) throw error;
    return data?.[0] ?? null;
  });
}

export async function fetchHistory(rider, limit = 50) {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from("bike_measurements")
      .select("*")
      .eq("rider", rider)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data ?? [];
  });
}

// Used by the riders grid: keep MTB baseline (type="quick") to avoid mixing in rare Road/CX
export async function fetchLatestQuickMap(riderNames) {
  if (!Array.isArray(riderNames) || riderNames.length === 0) return {};

  return withRetry(async () => {
    const { data, error } = await supabase
      .from("bike_measurements")
      .select("rider,type,timestamp,saddle_setback,height_4cm,height_15cm,location,notes")
      .in("rider", riderNames)
      .eq("type", "quick")
      .order("timestamp", { ascending: false });

    if (error) throw error;

    const map = {};
    for (const name of riderNames) map[name] = null;

    for (const row of data ?? []) {
      if (!map[row.rider]) map[row.rider] = row;
    }
    return map;
  });
}

export async function insertQuick({
  rider,
  mechanic,
  saddleSetback,
  height4cm,
  height15cm,
  notes,
  location,
  bikeType = "mtb",
}) {
  const type = quickTypeForBikeType(bikeType);

  return withRetry(async () => {
    const payload = {
      rider,
      mechanic,
      saddle_setback: saddleSetback,
      height_4cm: height4cm,
      height_15cm: height15cm,
      notes,
      location,
      timestamp: new Date().toISOString(),
      type,
    };

    const { error } = await supabase.from("bike_measurements").insert([payload]);
    if (error) throw error;
  });
}

export async function insertFull({ rider, mechanic, fullSpec }) {
  return withRetry(async () => {
    const payload = {
      rider,
      mechanic,
      type: "full",
      full_spec: fullSpec,
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabase.from("bike_measurements").insert([payload]);
    if (error) throw error;
  });
}

// --- ADMIN tools (RLS must allow admin update/delete) ---
export async function updateMeasurement(id, patch) {
  if (!id) throw new Error("Missing measurement id.");
  return withRetry(async () => {
    const { error } = await supabase.from("bike_measurements").update(patch).eq("id", id);
    if (error) throw error;
  });
}

export async function deleteMeasurement(id) {
  if (!id) throw new Error("Missing measurement id.");
  return withRetry(async () => {
    const { error } = await supabase.from("bike_measurements").delete().eq("id", id);
    if (error) throw error;
  });
}
