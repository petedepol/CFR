import { supabase } from "./supabaseClient";

const STORAGE_KEY = "cfr_offline_bike_measurements_queue_v1";
export const QUEUE_EVENT = "cfr:bike_measurements_queue_changed";

// --- storage helpers ---
function readQueue() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

function notify() {
  try {
    window.dispatchEvent(new CustomEvent(QUEUE_EVENT));
  } catch {
    // ignore
  }
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function isOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

// Prevent concurrent flushes across tabs (especially on iOS focus/online storms).
// Uses localStorage so the lock is shared across all tabs (queue is also in localStorage).
const LOCK_KEY = "cfr_offline_queue_lock_v1";
function acquireLock(ttlMs = 15000) {
  const now = Date.now();
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    const cur = raw ? JSON.parse(raw) : null;
    if (cur && cur.expiresAt && cur.expiresAt > now) return false;

    localStorage.setItem(LOCK_KEY, JSON.stringify({ expiresAt: now + ttlMs }));
    return true;
  } catch {
    return true; // if localStorage fails, just run
  }
}

function releaseLock() {
  try {
    localStorage.removeItem(LOCK_KEY);
  } catch {
    // ignore
  }
}

// --- public API ---
export function getBikeMeasurementsQueueCount() {
  return readQueue().length;
}

/**
 * Enqueue a bike_measurements insert payload (single row).
 * `dedupeSig` is used to avoid duplicates when user presses save twice.
 */
export function enqueueBikeMeasurement(payload, dedupeSig = "") {
  const q = readQueue();

  if (dedupeSig) {
    const already = q.some((it) => it?.dedupeSig && it.dedupeSig === dedupeSig);
    if (already) {
      return { queued: true, alreadyQueued: true, size: q.length };
    }
  }

  const item = {
    id: uid(),
    createdAt: new Date().toISOString(),
    dedupeSig: dedupeSig || "",
    payload,
  };

  const next = [...q, item].slice(-200); // hard cap to prevent runaway
  writeQueue(next);
  notify();
  return { queued: true, alreadyQueued: false, size: next.length };
}

/**
 * Flush queued inserts to Supabase (bike_measurements).
 * Sends in FIFO order. Stops on first failure.
 */
export async function flushBikeMeasurementsQueue({ max = 25 } = {}) {
  if (!isOnline()) return { sent: 0, remaining: getBikeMeasurementsQueueCount(), stopped: "offline" };
  if (!acquireLock()) return { sent: 0, remaining: getBikeMeasurementsQueueCount(), stopped: "locked" };

  try {
    let q = readQueue();
    if (q.length === 0) return { sent: 0, remaining: 0 };

    let sent = 0;
    const limit = Math.max(1, Math.min(max, 200));

    while (q.length > 0 && sent < limit) {
      if (!isOnline()) break;

      const item = q[0];
      const payload = item?.payload;

      // If payload is broken, drop it
      if (!payload || typeof payload !== "object") {
        q = q.slice(1);
        writeQueue(q);
        notify();
        continue;
      }

      const { error } = await supabase.from("bike_measurements").insert([payload]);

      if (error) {
        // Do NOT drop on error. Stop and retry later.
        return { sent, remaining: q.length, error };
      }

      // Success: re-read queue (another tab may have enqueued) and drop the sent item by id
      sent += 1;
      q = readQueue().filter((it) => it.id !== item.id);
      writeQueue(q);
      notify();
    }

    return { sent, remaining: q.length };
  } finally {
    releaseLock();
  }
}
