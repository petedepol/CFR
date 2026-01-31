import { supabase } from "../../../lib/supabaseClient";

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
        throw new Error("You're offline. Reconnect and try again.");
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
 * Log a service action
 */
export async function logServiceAction({
  riderName,
  bikeType,
  category,
  item,
  price,
  mechanicName,
  mechanicEmail,
}) {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from("service_logs")
      .insert([
        {
          rider_name: riderName,
          bike_type: bikeType,
          category,
          item,
          price,
          mechanic_name: mechanicName,
          mechanic_email: mechanicEmail,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}

/**
 * Fetch service history for a rider/bike
 */
export async function fetchServiceHistory(riderName, { bikeType, category, limit = 50 } = {}) {
  return withRetry(async () => {
    let query = supabase
      .from("service_logs")
      .select("*")
      .eq("rider_name", riderName)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (bikeType) {
      query = query.eq("bike_type", bikeType);
    }
    if (category) {
      query = query.eq("category", category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  });
}

/**
 * Fetch recent service history for preview (last N items)
 */
export async function fetchRecentHistory(riderName, bikeType, limit = 5) {
  return fetchServiceHistory(riderName, { bikeType, limit });
}

/**
 * Get spend totals per rider/bike for leaderboard
 */
export async function fetchRiderSpend(riderName) {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from("service_logs")
      .select("bike_type, price")
      .eq("rider_name", riderName);

    if (error) throw error;

    // Aggregate by bike type
    const byBike = {};
    let total = 0;
    for (const row of data ?? []) {
      const bt = row.bike_type || "unknown";
      byBike[bt] = (byBike[bt] || 0) + Number(row.price || 0);
      total += Number(row.price || 0);
    }

    return { total, byBike };
  });
}

/**
 * Get spend totals per mechanic for leaderboard
 */
export async function fetchMechanicSpend() {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from("service_logs")
      .select("mechanic_name, mechanic_email, price");

    if (error) throw error;

    // Aggregate by mechanic
    const byMechanic = {};
    let total = 0;
    for (const row of data ?? []) {
      const key = row.mechanic_name || row.mechanic_email || "Unknown";
      byMechanic[key] = (byMechanic[key] || 0) + Number(row.price || 0);
      total += Number(row.price || 0);
    }

    return { total, byMechanic };
  });
}

/**
 * Get all spend data for leaderboard
 */
export async function fetchLeaderboardData() {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from("service_logs")
      .select("rider_name, bike_type, mechanic_name, price");

    if (error) throw error;

    // Aggregate by rider/bike
    const byRiderBike = {};
    const byMechanic = {};
    let seasonTotal = 0;

    for (const row of data ?? []) {
      const price = Number(row.price || 0);
      seasonTotal += price;

      // By rider/bike
      const riderKey = `${row.rider_name} ${row.bike_type}`;
      byRiderBike[riderKey] = (byRiderBike[riderKey] || 0) + price;

      // By mechanic
      const mechKey = row.mechanic_name || "Unknown";
      byMechanic[mechKey] = (byMechanic[mechKey] || 0) + price;
    }

    return { seasonTotal, byRiderBike, byMechanic };
  });
}

/**
 * Admin: delete a service log entry
 */
export async function deleteServiceLog(id) {
  return withRetry(async () => {
    const { error } = await supabase
      .from("service_logs")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  });
}
