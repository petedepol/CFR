import React, { useEffect, useRef, useState } from "react";
import { registerSW } from "virtual:pwa-register";
import { useToast } from "./ToastProvider.jsx";

export default function PwaUpdateManager() {
  const toast = useToast();
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const updateFnRef = useRef(null);
  const shownOfflineReadyRef = useRef(false);

  useEffect(() => {
    // registerSW returns an update() function
    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateFnRef.current = update;
        setUpdateAvailable(true);
        toast.warning("Update available");
      },
      onOfflineReady() {
        if (shownOfflineReadyRef.current) return;
        shownOfflineReadyRef.current = true;
        toast.success("Ready for offline use");
      },
      onRegisterError(e) {
        // not fatal; just helpful for debugging
        console.warn("PWA SW register error:", e);
      },
    });

    updateFnRef.current = update;
  }, [toast]);

  const doRefresh = async () => {
    try {
      const fn = updateFnRef.current;
      if (typeof fn === "function") {
        // true = reload the page after the new SW takes control
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
