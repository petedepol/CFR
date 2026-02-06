// offlineCache.js - localStorage-based cache for offline data viewing

const CACHE_VERSION = 1;
const CACHE_PREFIX = "cfr_cache_v1__";
export const CACHE_EVENT = "cfr:cache_updated";

// ─────────────────────────────────────────────
// Storage helpers
// ─────────────────────────────────────────────

function cacheKey(...parts) {
  return CACHE_PREFIX + parts.map((p) => encodeURIComponent(String(p || ""))).join("__");
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== CACHE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    const entry = {
      version: CACHE_VERSION,
      fetchedAt: new Date().toISOString(),
      data,
    };
    localStorage.setItem(key, JSON.stringify(entry));
    notifyCacheUpdate(key);
    return true;
  } catch (e) {
    console.warn("[cache] Write failed:", e);
    return false;
  }
}

function notifyCacheUpdate(key) {
  try {
    window.dispatchEvent(new CustomEvent(CACHE_EVENT, { detail: { key } }));
  } catch {}
}

// ─────────────────────────────────────────────
// Public API - Riders
// ─────────────────────────────────────────────

export function getCachedRiders() {
  const entry = readCache(cacheKey("riders"));
  if (!entry) return undefined;
  return entry.data;
}

export function setCachedRiders(riders) {
  writeCache(cacheKey("riders"), riders);
}

export function getCachedRidersMeta() {
  const entry = readCache(cacheKey("riders"));
  return entry ? { fetchedAt: entry.fetchedAt } : null;
}

// ─────────────────────────────────────────────
// Public API - MTB Settings
// ─────────────────────────────────────────────

export function getCachedSettingsLatest(rider) {
  if (!rider) return null;
  const entry = readCache(cacheKey("settings_latest", rider));
  if (!entry) return undefined;
  return entry.data;
}

export function setCachedSettingsLatest(rider, data) {
  if (!rider) return;
  writeCache(cacheKey("settings_latest", rider), data);
}

export function getCachedSettingsHistory(rider) {
  if (!rider) return null;
  const entry = readCache(cacheKey("settings_history", rider));
  if (!entry) return undefined;
  return entry.data;
}

export function setCachedSettingsHistory(rider, data, maxItems = 50) {
  if (!rider) return;
  const trimmed = Array.isArray(data) ? data.slice(0, maxItems) : data;
  writeCache(cacheKey("settings_history", rider), trimmed);
}

export function getCachedSettingsMeta(rider) {
  const entry = readCache(cacheKey("settings_history", rider));
  return entry ? { fetchedAt: entry.fetchedAt, count: entry.data?.length ?? 0 } : null;
}

// ─────────────────────────────────────────────
// Public API - JIG (Quick) Measurements
// ─────────────────────────────────────────────

export function getCachedJigLatest(rider, bikeType) {
  if (!rider) return null;
  const entry = readCache(cacheKey("jig_latest", rider, bikeType || "race"));
  if (!entry) return undefined;
  return entry.data;
}

export function setCachedJigLatest(rider, bikeType, data) {
  if (!rider) return;
  writeCache(cacheKey("jig_latest", rider, bikeType || "race"), data);
}

export function getCachedJigHistory(rider, bikeType) {
  if (!rider) return null;
  const entry = readCache(cacheKey("jig_history", rider, bikeType || "race"));
  if (!entry) return undefined;
  return entry.data;
}

export function setCachedJigHistory(rider, bikeType, data, maxItems = 20) {
  if (!rider) return;
  const trimmed = Array.isArray(data) ? data.slice(0, maxItems) : data;
  writeCache(cacheKey("jig_history", rider, bikeType || "race"), trimmed);
}

export function getCachedJigMeta(rider, bikeType) {
  const entry = readCache(cacheKey("jig_history", rider, bikeType || "race"));
  return entry ? { fetchedAt: entry.fetchedAt, count: entry.data?.length ?? 0 } : null;
}

// ─────────────────────────────────────────────
// Public API - Bike Spec (Full)
// ─────────────────────────────────────────────

export function getCachedSpecLatest(rider, bikeType) {
  if (!rider) return null;
  const entry = readCache(cacheKey("spec_latest", rider, bikeType || "race"));
  if (!entry) return undefined;
  return entry.data;
}

export function setCachedSpecLatest(rider, bikeType, data) {
  if (!rider) return;
  writeCache(cacheKey("spec_latest", rider, bikeType || "race"), data);
}

export function getCachedSpecHistory(rider, bikeType) {
  if (!rider) return null;
  const entry = readCache(cacheKey("spec_history", rider, bikeType || "race"));
  if (!entry) return undefined;
  return entry.data;
}

export function setCachedSpecHistory(rider, bikeType, data, maxItems = 10) {
  if (!rider) return;
  const trimmed = Array.isArray(data) ? data.slice(0, maxItems) : data;
  writeCache(cacheKey("spec_history", rider, bikeType || "race"), trimmed);
}

export function getCachedSpecMeta(rider, bikeType) {
  const entry = readCache(cacheKey("spec_history", rider, bikeType || "race"));
  return entry ? { fetchedAt: entry.fetchedAt, count: entry.data?.length ?? 0 } : null;
}

// ─────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────

/**
 * Invalidate cache entries matching a pattern.
 * @param {string} pattern - "all" | "rider:Ana" | "settings" | "jig" | "spec"
 */
export function invalidateCache(pattern) {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));

  for (const key of keys) {
    let shouldRemove = false;

    if (pattern === "all") {
      shouldRemove = true;
    } else if (pattern.startsWith("rider:")) {
      const rider = pattern.slice(6);
      const encodedRider = encodeURIComponent(rider);
      shouldRemove = key.includes(`__${encodedRider}`) || key.includes(`__${encodedRider}__`);
    } else if (pattern === "settings") {
      shouldRemove = key.includes("__settings_");
    } else if (pattern === "jig") {
      shouldRemove = key.includes("__jig_");
    } else if (pattern === "spec") {
      shouldRemove = key.includes("__spec_");
    } else if (pattern === "riders") {
      shouldRemove = key.includes("__riders");
    }

    if (shouldRemove) {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
  }

  notifyCacheUpdate("invalidated:" + pattern);
}

/**
 * Get cache statistics for debugging/diagnostics.
 */
export function getCacheStats() {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(CACHE_PREFIX));
  let totalBytes = 0;
  const breakdown = {};

  for (const key of keys) {
    const size = localStorage.getItem(key)?.length || 0;
    totalBytes += size;

    // Extract type (settings, jig, spec, riders)
    const parts = key.replace(CACHE_PREFIX, "").split("__");
    const type = parts[0] || "other";
    breakdown[type] = (breakdown[type] || 0) + size;
  }

  return { totalBytes, keyCount: keys.length, breakdown };
}

/**
 * Check if cached data is stale.
 * @param {string} fetchedAt - ISO timestamp
 * @param {number} maxAgeMs - Maximum age in milliseconds (default 5 minutes)
 */
export function isCacheStale(fetchedAt, maxAgeMs = 5 * 60 * 1000) {
  if (!fetchedAt) return true;
  const age = Date.now() - new Date(fetchedAt).getTime();
  return age > maxAgeMs;
}

/**
 * Format cache age for display.
 * @param {string} fetchedAt - ISO timestamp
 * @returns {string} Human-readable age like "5m ago", "2h ago"
 */
export function formatCacheAge(fetchedAt) {
  if (!fetchedAt) return "unknown";
  const ms = Date.now() - new Date(fetchedAt).getTime();
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}
