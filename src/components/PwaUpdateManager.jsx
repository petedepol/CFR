import React, { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { useToast } from "./ToastProvider.jsx";

export default function PwaUpdateManager() {
  const toast = useToast();
  const [updateAvailable, setUpdateAvailable] = useState(false);

  const updateFnRef = useRef(null);
  const shownOfflineReadyRef = useRef(false);
  const lastCheckRef = useRef(0);

  useEffect(() => {
    const update = registerSW({
      immediate: true,

      // This should fire when the new SW is installed and waiting to activate
      onNeedRefresh() {
        updateFnRef.current = update;
        setUpdateAvailable(true);
      },

      onOfflineReady() {
        if (shownOfflineReadyRef.current) return;
        shownOfflineReadyRef.current = true;
        // optional: comment this out if you don’t want the toast
        toast.success("Ready for offline use");
      },

      onRegisterError(e) {
        console.warn("PWA SW register error:", e);
      },
    });

    updateFnRef.current = update;

    const checkNow = async () => {
      const now = Date.now();

      // throttle: don’t hammer checks if user tabs quickly
      if (now - lastCheckRef.current < 10_000) return;
      lastCheckRef.current = now;

      try {
        // Calling update() triggers a check for a newer SW.
        // If one is found, onNeedRefresh() will fire.
        await update();
      } catch {
        // ignore
      }
    };

    // Check when app becomes visible again (common on iPhone)
    const onVis = () => {
      if (document.visibilityState === "visible") checkNow();
    };

    // Check on focus too (desktop/laptop)
    const onFocus = () => checkNow();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);

    // Periodic checks while app is kept open (30 minutes)
    const interval = setInterval(checkNow, 30 * 60 * 1000);

    // Initial check after a short delay (lets the app finish booting)
    const t = setTimeout(checkNow, 2000);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
      clearTimeout(t);
    };
  }, [toast]);

  const doRefresh = async () => {
    try {
      const fn = updateFnRef.current;
      if (typeof fn === "function") {
        // true = activate new SW + reload
        await fn(true);
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed left-4 right-4 bottom-4 z-50">
      <button
        onClick={doRefresh}
        className="w-full rounded-2xl px-4 py-4 font-black text-base border border-lime-300/30 bg-black/80 backdrop-blur text-white hover:bg-black/90 transition shadow-2xl"
      >
        Update available — Tap to refresh
      </button>
    </div>
  );
}
