import { supabase } from "../../../lib/supabaseClient";
import { enqueueBikeMeasurement, flushBikeMeasurementsQueue } from "../../../lib/offlineBikeMeasurementsQueue.js";
import {
  setCachedRiders,
  getCachedRiders,
  setCachedJigLatest,
  getCachedJigLatest,
  setCachedJigHistory,
  getCachedJigHistory,
  setCachedSpecLatest,
  getCachedSpecLatest,
  setCachedSpecHistory,
  getCachedSpecHistory,
  invalidateCache,
} from "../../../lib/offlineCache.js";

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

  // Handle prefixed formats
  if (k === "quick_race" || k === "quick") return "quick"; // Race uses legacy "quick"
  if (k.startsWith("quick_")) return k;

  // Handle short names - Race uses legacy "quick" for backwards compatibility
  if (k === "race" || k === "mtb") return "quick";
  if (k === "training") return "quick_training";
  if (k === "ebike") return "quick_ebike";
  if (k === "road") return "quick_road";
  if (k === "cx") return "quick_cx";

  return "quick"; // Legacy default
}

function fullTypeForBikeType(bikeType) {
  const k = String(bikeType || "race").toLowerCase();
  if (k === "training") return "full_training";
  if (k === "ebike") return "full_ebike";
  if (k === "road") return "full_road";
  if (k === "cx") return "full_cx";
  return "full"; // race + legacy (mtb) default
}

// ---------- API ----------
export async function fetchRiders() {
  return withRetry(async () => {
    const { data, error } = await supabase.from("riders").select("*").order("name");
    if (error) throw error;

    const riders = (data ?? []).map((r) => ({
      name: r.name,
      fullName: r.full_name ?? r.name,
      flag: r.flag ?? "🏁",
      country: r.country ?? "",
      photo: r.photo ?? "",
    }));
    setCachedRiders(riders);
    return riders;
  });
}

export async function fetchRidersWithCache({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = getCachedRiders();
    if (cached !== undefined) {
      fetchRiders().catch(() => {});
      return { data: cached, fromCache: true };
    }
  }
  const data = await fetchRiders();
  return { data, fromCache: false };
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
    const result = data?.[0] ?? null;
    setCachedJigLatest(rider, bikeType, result);
    return result;
  });
}

export async function fetchLatestQuickWithCache(rider, bikeType = "mtb", { forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = getCachedJigLatest(rider, bikeType);
    if (cached !== undefined) {
      fetchLatestQuick(rider, bikeType).catch(() => {});
      return { data: cached, fromCache: true };
    }
  }
  const data = await fetchLatestQuick(rider, bikeType);
  return { data, fromCache: false };
}

export async function fetchLatestFull(rider, bikeType = "mtb") {
  const t = fullTypeForBikeType(bikeType);
  return withRetry(async () => {
    const { data, error } = await supabase
      .from("bike_measurements")
      .select("*")
      .eq("rider", rider)
      .eq("type", t)
      .order("timestamp", { ascending: false })
      .limit(1);

    if (error) throw error;
    const result = data?.[0] ?? null;
    setCachedSpecLatest(rider, bikeType, result);
    return result;
  });
}

export async function fetchLatestFullWithCache(rider, bikeType = "mtb", { forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = getCachedSpecLatest(rider, bikeType);
    if (cached !== undefined) {
      fetchLatestFull(rider, bikeType).catch(() => {});
      return { data: cached, fromCache: true };
    }
  }
  const data = await fetchLatestFull(rider, bikeType);
  return { data, fromCache: false };
}

export async function fetchQuickHistory(rider, bikeType = "mtb", limit = 10) {
  const t = quickTypeForBikeType(bikeType);

  return withRetry(async () => {
    const { data, error } = await supabase
      .from("bike_measurements")
      .select("*")
      .eq("rider", rider)
      .eq("type", t)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) throw error;
    const result = data ?? [];
    setCachedJigHistory(rider, bikeType, result, 20);
    return result;
  });
}

export async function fetchQuickHistoryWithCache(rider, bikeType = "mtb", limit = 20, { forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = getCachedJigHistory(rider, bikeType);
    if (cached !== undefined) {
      fetchQuickHistory(rider, bikeType, limit).catch(() => {});
      return { data: cached, fromCache: true };
    }
  }
  const data = await fetchQuickHistory(rider, bikeType, limit);
  return { data, fromCache: false };
}

export async function fetchFullHistory(rider, bikeType = "mtb", limit = 10) {
  const t = fullTypeForBikeType(bikeType);

  return withRetry(async () => {
    const { data, error } = await supabase
      .from("bike_measurements")
      .select("*")
      .eq("rider", rider)
      .eq("type", t)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (error) throw error;
    const result = data ?? [];
    setCachedSpecHistory(rider, bikeType, result, 10);
    return result;
  });
}

export async function fetchFullHistoryWithCache(rider, bikeType = "mtb", limit = 10, { forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = getCachedSpecHistory(rider, bikeType);
    if (cached !== undefined) {
      fetchFullHistory(rider, bikeType, limit).catch(() => {});
      return { data: cached, fromCache: true };
    }
  }
  const data = await fetchFullHistory(rider, bikeType, limit);
  return { data, fromCache: false };
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
  dedupeSig = "",
}) {
  const type = quickTypeForBikeType(bikeType);

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

  try {
    await withRetry(async () => {
      const { error } = await supabase.from("bike_measurements").insert([payload]);
      if (error) throw error;
    });

    // If we just saved successfully, try to flush any older queued entries too.
    try {
      await flushBikeMeasurementsQueue({ max: 10 });
    } catch {
      // ignore
    }

    // Invalidate cache for this rider after successful save
    invalidateCache(`rider:${rider}`);

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

export async function insertFull({ rider, mechanic, fullSpec, bikeType = "mtb", dedupeSig = "" }) {
  const type = fullTypeForBikeType(bikeType);
  const payload = {
    rider,
    mechanic,
    type,
    full_spec: fullSpec,
    timestamp: new Date().toISOString(),
  };

  try {
    await withRetry(async () => {
      const { error } = await supabase.from("bike_measurements").insert([payload]);
      if (error) throw error;
    });

    try {
      await flushBikeMeasurementsQueue({ max: 10 });
    } catch {
      // ignore
    }

    // Invalidate cache for this rider after successful save
    invalidateCache(`rider:${rider}`);

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


export async function fetchMeasurementById(id) {
  if (!id) throw new Error("Missing measurement id.");
  return withRetry(async () => {
    const { data, error } = await supabase.from("bike_measurements").select("*").eq("id", id).limit(1);
    if (error) throw error;
    return data?.[0] ?? null;
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
