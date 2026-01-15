import React, { useEffect } from "react";
import { flushBikeMeasurementsQueue, getBikeMeasurementsQueueCount } from "../lib/offlineBikeMeasurementsQueue.js";
import { useToast } from "./ToastProvider.jsx";

export default function OfflineSyncManager() {
  const toast = useToast();

  useEffect(() => {
    let alive = true;

    async function tryFlush(reason = "") {
      if (!alive) return;

      const pending = getBikeMeasurementsQueueCount();
      if (pending <= 0) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;

      const res = await flushBikeMeasurementsQueue({ max: 50 });

      // If we actually synced something, tell the user once.
      if (!alive) return;
      if (res?.sent > 0) {
        toast.success(`Synced ${res.sent} offline save${res.sent === 1 ? "" : "s"}`);
      }
    }

    const onOnline = () => tryFlush("online");
    const onFocus = () => tryFlush("focus");
    const onVis = () => {
      if (document.visibilityState === "visible") tryFlush("visible");
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    // Small interval: catches cases where iOS doesn’t fire events reliably
    const interval = setInterval(() => tryFlush("interval"), 15000);

    // initial attempt
    tryFlush("mount");

    return () => {
      alive = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(interval);
    };
  }, [toast]);

  return null;
}
