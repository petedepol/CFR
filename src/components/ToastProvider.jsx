import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Default TTLs per type
const DEFAULT_TTL = {
  info: 2200,
  success: 2200,
  warning: 3000,
  error: 4000, // Longer for errors
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const tm = timersRef.current.get(id);
    if (tm) clearTimeout(tm);
    timersRef.current.delete(id);
  }, []);

  const push = useCallback(
    (type, message, opts = {}) => {
      const id = uid();
      const ttl = typeof opts.ttl === "number" ? opts.ttl : DEFAULT_TTL[type] || 2200;

      setToasts((prev) => {
        const next = [...prev, { id, type, message, action: opts.action, actionLabel: opts.actionLabel }];
        return next.slice(-4);
      });

      const tm = setTimeout(() => remove(id), ttl);
      timersRef.current.set(id, tm);

      return id;
    },
    [remove]
  );

  const api = useMemo(
    () => ({
      show: (msg, opts) => push("info", msg, opts),
      success: (msg, opts) => push("success", msg, opts),
      error: (msg, opts) => push("error", msg, opts),
      warning: (msg, opts) => push("warning", msg, opts),
      dismiss: remove,
      dismissAll: () => setToasts([]),
    }),
    [push, remove]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[min(520px,calc(100vw-24px))] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-xl",
              "flex items-start gap-3",
              t.type === "success"
                ? "bg-lime-400/10 border-lime-400/25 text-lime-100"
                : t.type === "error"
                ? "bg-red-500/10 border-l-4 border-l-red-500 border-t-red-400/25 border-r-red-400/25 border-b-red-400/25 text-red-100"
                : t.type === "warning"
                ? "bg-yellow-400/10 border-yellow-300/25 text-yellow-100"
                : "bg-white/10 border-white/15 text-white/90",
            ].join(" ")}
            role="status"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold leading-snug">{t.message}</div>
              {t.action && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    t.action();
                    api.dismiss(t.id);
                  }}
                  className="mt-2 text-xs font-semibold px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition"
                >
                  {t.actionLabel || "Retry"}
                </button>
              )}
            </div>
            <button
              onClick={() => api.dismiss(t.id)}
              className="text-xs text-white/60 hover:text-white/90 font-black px-2 -mr-2"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
