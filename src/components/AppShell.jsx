import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthProvider.jsx";
import { Settings, Ruler, WifiOff } from "lucide-react";
import OfflineSyncManager from "./OfflineSyncManager.jsx";
import { QUEUE_EVENT, getBikeMeasurementsQueueCount } from "../lib/offlineBikeMeasurementsQueue.js";

function cx(...a) {
  return a.filter(Boolean).join(" ");
}

function usePageMeta() {
  const { pathname } = useLocation();

  return useMemo(() => {
    if (pathname.startsWith("/settings/mtb")) return { title: "MTB Settings" };
    if (pathname.startsWith("/settings")) return { title: "Settings" };

    if (pathname.startsWith("/measurements/quick")) return { title: "Jig Update" };
    if (pathname.startsWith("/measurements/full")) return { title: "Bike Spec" };
    if (pathname.startsWith("/measurements/history")) return { title: "History" };
    if (pathname.startsWith("/measurements")) return { title: "Measurements" };

    return { title: "CFR Tools" };
  }, [pathname]);
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

export default function AppShell() {
  const { displayName } = useAuth();
  const { title } = usePageMeta();

  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  const [pending, setPending] = useState(() => getBikeMeasurementsQueueCount());

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

  return (
    <div className="min-h-[100dvh] bg-black">
      <SafeArea>
        {/* Background auto-sync */}
        <OfflineSyncManager />

        {/* Top Bar */}
        <div className="sticky top-0 z-40">
          <div className="bg-black/55 backdrop-blur-xl border-b border-white/10">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
              {/* LEFT: keep empty spacer (removes CFR/Tools text, keeps layout balanced) */}
              <div className="min-w-[72px]" />

              {/* CENTER: title only (removes "Current") */}
              <div className="min-w-0 flex-1 text-center">
                <div className="text-white font-black truncate">{title}</div>
              </div>

              {/* RIGHT: status + user */}
              <div className="flex items-center gap-2 min-w-[190px] justify-end">
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

                <div className="text-xs text-white/70 bg-white/5 border border-white/10 px-3 py-2 rounded-2xl max-w-[140px] truncate">
                  {displayName || "—"}
                </div>
              </div>
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
          <Outlet />
        </main>
      </SafeArea>
    </div>
  );
}
