import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider.jsx";
import { Settings, Ruler, WifiOff, Bug, X, Copy, Trash2 } from "lucide-react";
import OfflineSyncManager from "./OfflineSyncManager.jsx";
import PwaUpdateManager from "./PwaUpdateManager.jsx";
import { QUEUE_EVENT, getBikeMeasurementsQueueCount } from "../lib/offlineBikeMeasurementsQueue.js";
import { addDiag, clearDiagLogs, formatDiagDump, getDiagLogs, installGlobalDiagnosticsHandlers } from "../lib/diagnostics.js";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

function SafeArea({ children }) {
  return (
    <div
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      {children}
    </div>
  );
}

function PageFallback() {
  return (
    <div className="space-y-3">
      <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
      <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
      <div className="h-10 bg-white/5 rounded-2xl animate-pulse" />
      <div className="h-28 bg-white/5 rounded-2xl animate-pulse" />
    </div>
  );
}

function copyTextToClipboard(text) {
  // iOS-safe fallback if clipboard API fails
  const tryClipboard = async () => {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  };

  const fallback = () => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      ta.style.left = "-9999px";
      ta.style.top = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  return tryClipboard().catch(() => false).then((ok) => ok || fallback());
}

function DiagnosticsModal({ open, onClose, pending }) {
  const { displayName } = useAuth();
  const [logs, setLogs] = useState([]);
  const [copied, setCopied] = useState(false);

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  useEffect(() => {
    if (!open) return;
    const current = getDiagLogs();
    setLogs(current.slice().reverse()); // newest first
    addDiag("info", "diag.open", { pending, offline });
  }, [open, pending, offline]);

  const summary = useMemo(() => {
    return {
      user: displayName || "—",
      offline,
      pending,
      url: typeof window !== "undefined" ? window.location.href : null,
      ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
      time: new Date().toISOString(),
    };
  }, [displayName, offline, pending]);

  const onCopy = async () => {
    const dump = formatDiagDump(summary);
    const ok = await copyTextToClipboard(dump);
    setCopied(ok);
    setTimeout(() => setCopied(false), 1200);
  };

  const onClear = () => {
    const ok = window.confirm("Clear diagnostics logs on this device?");
    if (!ok) return;
    clearDiagLogs();
    setLogs([]);
    addDiag("info", "diag.cleared");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/12 bg-black/80 backdrop-blur p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Bug size={18} className="text-lime-300" />
              <div className="text-white font-black text-lg">Diagnostics</div>
            </div>
            <div className="text-xs text-white/55 mt-1">
              Local-only logs (this device). Copy and paste into chat when something breaks.
            </div>
          </div>

          <button
            onClick={onClose}
            className="h-10 w-10 rounded-2xl border border-white/12 bg-white/5 hover:bg-white/10 inline-flex items-center justify-center"
            title="Close"
          >
            <X size={18} className="text-white/85" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-white/50 text-xs mb-1">User</div>
            <div className="text-white font-bold truncate">{summary.user}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-white/50 text-xs mb-1">Network</div>
            <div className="text-white font-bold">{offline ? "Offline" : "Online"}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-white/50 text-xs mb-1">Pending queue</div>
            <div className="text-white font-bold">{pending}</div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="text-white/50 text-xs mb-1">URL</div>
            <div className="text-white/80 text-xs break-all">{summary.url || "—"}</div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={onCopy}
            className="rounded-2xl px-4 py-2 font-black bg-lime-300 text-black hover:bg-lime-200 inline-flex items-center gap-2"
          >
            <Copy size={16} />
            {copied ? "Copied" : "Copy dump"}
          </button>

          <button
            onClick={onClear}
            className="rounded-2xl px-4 py-2 font-black bg-red-500/10 text-red-200 border border-red-500/25 hover:bg-red-500/15 inline-flex items-center gap-2"
          >
            <Trash2 size={16} />
            Clear
          </button>

          <div className="ml-auto text-xs text-white/45">
            {logs.length} / 80 entries
          </div>
        </div>

        <div className="mt-4 max-h-[55vh] overflow-auto rounded-2xl border border-white/10 bg-black/40">
          {logs.length === 0 ? (
            <div className="p-4 text-white/60">No logs yet.</div>
          ) : (
            <ul className="divide-y divide-white/10">
              {logs.map((l, i) => (
                <li key={`${l.t}-${i}`} className="p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cx(
                        "text-[11px] px-2 py-0.5 rounded border font-black",
                        l.level === "error"
                          ? "text-red-200 bg-red-500/10 border-red-500/25"
                          : "text-white/70 bg-white/5 border-white/10"
                      )}
                    >
                      {String(l.level).toUpperCase()}
                    </span>
                    <span className="text-xs text-white/45">{l.t}</span>
                  </div>
                  <div className="mt-1 text-white/85 text-sm break-words">{l.msg}</div>
                  {l.meta ? (
                    <pre className="mt-2 text-xs text-white/55 whitespace-pre-wrap break-words bg-black/40 border border-white/10 rounded-xl p-2">
                      {typeof l.meta === "string" ? l.meta : JSON.stringify(l.meta, null, 2)}
                    </pre>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-3 text-xs text-white/45">
          Tip: If something goes wrong, open this panel, hit <span className="text-white/70 font-bold">Copy dump</span>,
          and paste it here.
        </div>
      </div>
    </div>
  );
}

export default function AppShell() {
  const { displayName, isAdmin } = useAuth();

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  const [pending, setPending] = useState(() => getBikeMeasurementsQueueCount());
  const [diagOpen, setDiagOpen] = useState(false);

  // Global error capture (local-only)
  useEffect(() => {
    const uninstall = installGlobalDiagnosticsHandlers();

    // A couple of useful app lifecycle markers
    const onOnline = () => addDiag("info", "net.online");
    const onOffline = () => addDiag("info", "net.offline");
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      uninstall?.();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    const update = () => setPending(getBikeMeasurementsQueueCount());
    update();
    window.addEventListener(QUEUE_EVENT, update);
    window.addEventListener("online", update);
    window.addEventListener("focus", update);
    return () => {
      window.removeEventListener(QUEUE_EVENT, update);
      window.removeEventListener("online", update);
      window.removeEventListener("focus", update);
    };
  }, []);

  const tabClass = ({ isActive }) =>
    cx(
      "flex-1 rounded-2xl px-4 py-3 font-black text-sm inline-flex items-center justify-center gap-2 transition border",
      isActive
        ? "bg-lime-300 text-black border-lime-200"
        : "bg-white/5 text-white/75 border-white/10 hover:bg-white/10"
    );

  // Admin-only hidden long-press on name pill to open diagnostics
  const longPressTimerRef = useRef(null);
  const startLongPress = () => {
    if (!isAdmin) return;
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setDiagOpen(true);
    }, 650);
  };
  const cancelLongPress = () => {
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  return (
    <div className="min-h-[100dvh] bg-black">
      <SafeArea>
        <OfflineSyncManager />
        <PwaUpdateManager />

        <DiagnosticsModal open={diagOpen} onClose={() => setDiagOpen(false)} pending={pending} />

        {/* Top Bar */}
        <div className="sticky top-0 z-40">
          <div className="bg-black/55 backdrop-blur-xl border-b border-white/10">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-end gap-2">
              {offline ? (
                <div className="inline-flex items-center gap-2 text-xs text-yellow-200/90 bg-yellow-400/10 border border-yellow-400/20 px-3 py-2 rounded-2xl">
                  <WifiOff size={14} />
                  Offline
                  {pending > 0 ? <span className="ml-1 text-yellow-100/80">({pending})</span> : null}
                </div>
              ) : pending > 0 ? (
                <div className="text-xs text-white/70 bg-white/5 border border-white/10 px-3 py-2 rounded-2xl">
                  Pending: <span className="font-black text-white">{pending}</span>
                </div>
              ) : (
                <div className="text-xs text-white/50 bg-white/5 border border-white/10 px-3 py-2 rounded-2xl">
                  Online
                </div>
              )}

              {/* Name pill: long-press to open diagnostics (admin only) */}
              <div
                onMouseDown={startLongPress}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={startLongPress}
                onTouchEnd={cancelLongPress}
                onTouchCancel={cancelLongPress}
                className={cx(
                  "text-xs bg-white/5 border border-white/10 px-3 py-2 rounded-2xl max-w-[160px] truncate select-none",
                  isAdmin ? "text-white/80" : "text-white/70"
                )}
                title={isAdmin ? "Long-press for Diagnostics" : undefined}
              >
                {displayName || "—"}
              </div>

              {/* Tiny hint icon for admins (non-intrusive) */}
              {isAdmin ? (
                <button
                  onClick={() => setDiagOpen(true)}
                  className="h-9 w-9 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 inline-flex items-center justify-center"
                  title="Diagnostics"
                >
                  <Bug size={16} className="text-white/70" />
                </button>
              ) : null}
            </div>

            {/* Primary Tabs */}
            <div className="max-w-6xl mx-auto px-4 pb-3">
              <div className="grid grid-cols-2 gap-2">
                <NavLink to="/settings" className={tabClass}>
                  <Settings size={16} /> Settings
                </NavLink>

                <NavLink to="/measurements" className={tabClass}>
                  <Ruler size={16} /> Measurements
                </NavLink>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="max-w-6xl mx-auto px-4 py-5 pb-24">
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </SafeArea>
    </div>
  );
}
