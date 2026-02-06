// src/ui/v3Theme.js
// Theme detection hook for components that need OS color scheme preference.
// Source of truth for colors is styles/tokens.css — do NOT add color tokens here.

import { useEffect, useState } from "react";

export function useTheme() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setIsDark(e.matches);

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isDark;
}
