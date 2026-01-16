// src/lib/diagnostics.js
//
// Lightweight, local-only diagnostics (no backend).
// Stores last N events in localStorage and exposes helpers + global error capture.

const LS_KEY = "cfr_diag_logs_v1";
const MAX_LOGS = 80;

function nowIso() {
  return new Date().toISOString();
}

function safeStringify(obj) {
  try {
    return JSON.stringify(obj);
  } catch {
    return String(obj);
  }
}

function readAll() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(arr) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  } catch {
    // ignore (storage could be full/private)
  }
}

export function addDiag(level, message, meta = null) {
  const entry = {
    t: nowIso(),
    level: String(level || "info"),
    msg: String(message || ""),
    meta: meta == null ? null : meta,
  };

  const existing = readAll();
  existing.push(entry);

  // ring buffer
  const trimmed = existing.length > MAX_LOGS ? existing.slice(existing.length - MAX_LOGS) : existing;
  writeAll(trimmed);

  return entry;
}

export function getDiagLogs() {
  return readAll();
}

export function clearDiagLogs() {
  writeAll([]);
}

export function formatDiagDump(extra = {}) {
  const logs = getDiagLogs();

  const env = {
    mode: import.meta?.env?.MODE,
    dev: !!import.meta?.env?.DEV,
    prod: !!import.meta?.env?.PROD,
    // Optional values if you ever add them in Vercel later:
    // VITE_APP_VERSION / VITE_GIT_SHA / VITE_BUILD_TIME etc.
    appVersion: import.meta?.env?.VITE_APP_VERSION || null,
    gitSha: import.meta?.env?.VITE_GIT_SHA || null,
    buildTime: import.meta?.env?.VITE_BUILD_TIME || null,
  };

  const payload = {
    generated_at: nowIso(),
    env,
    extra,
    logs,
  };

  return safeStringify(payload);
}

export function installGlobalDiagnosticsHandlers() {
  // Avoid double-install
  if (typeof window === "undefined") return () => {};

  const onError = (event) => {
    // event.error can be undefined for some script errors
    const err = event?.error;
    const message = err?.message || event?.message || "window.error";
    addDiag("error", message, {
      type: "window.error",
      filename: event?.filename,
      lineno: event?.lineno,
      colno: event?.colno,
      stack: err?.stack || null,
    });
  };

  const onRejection = (event) => {
    const reason = event?.reason;
    let msg = "unhandledrejection";
    let meta = { type: "unhandledrejection" };

    if (reason instanceof Error) {
      msg = reason.message || msg;
      meta = { ...meta, stack: reason.stack || null, name: reason.name || null };
    } else if (typeof reason === "string") {
      msg = reason;
    } else if (reason && typeof reason === "object") {
      msg = reason.message || msg;
      meta = { ...meta, reason };
    }

    addDiag("error", msg, meta);
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  // Some useful session markers
  addDiag("info", "session.start", {
    userAgent: navigator?.userAgent || null,
    language: navigator?.language || null,
    platform: navigator?.platform || null,
  });

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
