// src/ui/v3Theme.js
// V3 Design System - Orange/Amber accent with auto dark/light theme

import { useEffect, useState } from "react";

// ============================================================================
// Theme Detection Hook
// ============================================================================
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

// ============================================================================
// Color Tokens
// ============================================================================
export const colors = {
  // Primary accent (orange/amber)
  primary: {
    DEFAULT: "#f97316", // orange-500
    light: "#fbbf24",   // amber-400
    dark: "#ea580c",    // orange-600
  },

  // Danger
  danger: "#ef4444", // red-500

  // Warning
  warning: "#facc15", // yellow-400

  // Dark mode
  dark: {
    bg: "#000000",
    surface: "rgba(255, 255, 255, 0.08)",
    surfaceHover: "rgba(255, 255, 255, 0.12)",
    border: "rgba(255, 255, 255, 0.12)",
    borderSubtle: "rgba(255, 255, 255, 0.08)",
    textHigh: "rgba(255, 255, 255, 0.90)",
    textMedium: "rgba(255, 255, 255, 0.70)",
    textLow: "rgba(255, 255, 255, 0.50)",
  },

  // Light mode
  light: {
    bg: "#f8fafc",      // slate-50
    surface: "#ffffff",
    surfaceHover: "#f1f5f9", // slate-100
    border: "#e2e8f0",  // slate-200
    borderSubtle: "#f1f5f9", // slate-100
    textHigh: "#0f172a",    // slate-900
    textMedium: "#475569",  // slate-600
    textLow: "#94a3b8",     // slate-400
  },
};

// ============================================================================
// V3 Style Tokens (Tailwind classes)
// ============================================================================
export const V3 = {
  // Page containers
  page: (isDark) => isDark
    ? "min-h-[100dvh] bg-black text-white transition-colors duration-300"
    : "min-h-[100dvh] bg-slate-50 text-slate-900 transition-colors duration-300",

  // Glass morphism cards
  glass: (isDark) => isDark
    ? "bg-white/[0.08] backdrop-blur-xl border border-white/12 rounded-3xl"
    : "bg-white/70 backdrop-blur-xl border border-black/5 rounded-3xl shadow-lg shadow-black/5",

  // Glass card hover
  glassHover: (isDark) => isDark
    ? "hover:bg-white/[0.12] hover:border-white/15"
    : "hover:bg-white/80 hover:shadow-xl",

  // Section container
  section: (isDark) => isDark
    ? "rounded-3xl border border-white/10 bg-black/25"
    : "rounded-3xl border border-slate-200 bg-white",

  // Primary button (orange)
  btnPrimary: "rounded-2xl px-5 py-3 font-black bg-orange-500 text-white hover:bg-orange-400 inline-flex items-center justify-center gap-2 transition-all active:scale-[0.97]",

  // Secondary button (glass)
  btnSecondary: (isDark) => isDark
    ? "rounded-2xl px-5 py-3 font-black bg-white/[0.08] text-white/90 border border-white/12 hover:bg-white/[0.12] inline-flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
    : "rounded-2xl px-5 py-3 font-black bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-sm inline-flex items-center justify-center gap-2 transition-all active:scale-[0.97]",

  // Icon button
  btnIcon: (isDark) => isDark
    ? "h-10 w-10 rounded-2xl bg-white/[0.08] border border-white/12 hover:bg-white/[0.12] inline-flex items-center justify-center transition-all active:scale-[0.97]"
    : "h-10 w-10 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 shadow-sm inline-flex items-center justify-center transition-all active:scale-[0.97]",

  // Danger button
  btnDanger: "rounded-2xl px-4 py-2 font-black bg-red-500/10 text-red-400 border border-red-500/25 hover:bg-red-500/20 inline-flex items-center gap-2 transition-all active:scale-[0.97]",

  // Bottom nav
  navBar: (isDark) => isDark
    ? "bg-black/80 backdrop-blur-xl border-t border-white/10"
    : "bg-white/80 backdrop-blur-xl border-t border-slate-200",

  // Nav tab
  navTab: (isDark, isActive) => {
    const base = "flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-2xl transition-all min-w-[72px]";
    if (isActive) {
      return isDark
        ? `${base} bg-orange-500/15`
        : `${base} bg-orange-500/10`;
    }
    return base;
  },

  navTabIcon: (isDark, isActive) => {
    if (isActive) return "text-orange-500";
    return isDark ? "text-white/60" : "text-slate-400";
  },

  navTabLabel: (isDark, isActive) => {
    const base = "text-[11px] font-bold";
    if (isActive) return `${base} text-orange-500`;
    return isDark ? `${base} text-white/50` : `${base} text-slate-400`;
  },

  // Circular avatar
  avatar: (isDark) => isDark
    ? "w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/30 to-amber-400/10 border-2 border-orange-500/30 flex items-center justify-center"
    : "w-16 h-16 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-400/10 border-2 border-orange-500/20 flex items-center justify-center",

  avatarText: (isDark) => isDark
    ? "text-2xl font-black text-white/90"
    : "text-2xl font-black text-slate-700",

  // Card for rider selector
  riderCard: (isDark) => isDark
    ? "flex flex-col items-center gap-2 p-3 transition-all rounded-2xl hover:bg-white/[0.06] active:scale-[0.97]"
    : "flex flex-col items-center gap-2 p-3 transition-all rounded-2xl hover:bg-slate-100 active:scale-[0.97]",

  // Typography
  heroTitle: (isDark) => isDark
    ? "text-4xl font-black text-white"
    : "text-4xl font-black text-slate-900",

  heroSubtitle: (isDark) => isDark
    ? "text-base font-normal text-white/50"
    : "text-base font-normal text-slate-500",

  sectionTitle: (isDark) => isDark
    ? "text-xl font-bold text-white/90"
    : "text-xl font-bold text-slate-800",

  label: (isDark) => isDark
    ? "text-sm font-bold text-white/80"
    : "text-sm font-bold text-slate-700",

  helper: (isDark) => isDark
    ? "text-xs text-white/50"
    : "text-xs text-slate-400",

  // Modal/Sheet
  sheetBackdrop: (isDark) => isDark
    ? "bg-black/60 backdrop-blur-sm"
    : "bg-black/30 backdrop-blur-sm",

  sheet: (isDark) => isDark
    ? "bg-[#1c1c1e] rounded-t-[32px]"
    : "bg-white rounded-t-[32px] shadow-2xl",

  sheetHandle: (isDark) => isDark
    ? "w-10 h-1 rounded-full bg-white/20"
    : "w-10 h-1 rounded-full bg-slate-300",

  // Bento grid cards
  bentoCard: (isDark, size = "normal") => {
    const base = isDark
      ? "bg-white/[0.08] backdrop-blur border border-white/12 rounded-3xl p-5 transition-all hover:bg-white/[0.10] active:scale-[0.98]"
      : "bg-white border border-slate-200 rounded-3xl p-5 shadow-sm transition-all hover:shadow-md active:scale-[0.98]";

    if (size === "hero") return `${base} col-span-2 row-span-2`;
    if (size === "wide") return `${base} col-span-2`;
    if (size === "tall") return `${base} row-span-2`;
    return base;
  },

  // Action card (JIG/SPEC)
  actionCard: (isDark) => isDark
    ? "p-6 rounded-3xl border border-white/12 bg-white/[0.06] hover:bg-orange-500/10 hover:border-orange-500/25 active:scale-[0.97] transition-all flex flex-col items-center gap-3"
    : "p-6 rounded-3xl border border-slate-200 bg-white hover:bg-orange-50 hover:border-orange-200 active:scale-[0.97] transition-all shadow-sm flex flex-col items-center gap-3",

  // Bike card
  bikeCard: (isDark) => isDark
    ? "p-5 rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] hover:border-white/15 active:scale-[0.97] transition-all text-left"
    : "p-5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.97] transition-all shadow-sm text-left",
};

// ============================================================================
// CSS Variables (for inline styles where Tailwind doesn't reach)
// ============================================================================
export function getThemeVars(isDark) {
  return isDark ? {
    "--bg": colors.dark.bg,
    "--surface": colors.dark.surface,
    "--border": colors.dark.border,
    "--text-high": colors.dark.textHigh,
    "--text-medium": colors.dark.textMedium,
    "--text-low": colors.dark.textLow,
    "--primary": colors.primary.DEFAULT,
    "--primary-light": colors.primary.light,
  } : {
    "--bg": colors.light.bg,
    "--surface": colors.light.surface,
    "--border": colors.light.border,
    "--text-high": colors.light.textHigh,
    "--text-medium": colors.light.textMedium,
    "--text-low": colors.light.textLow,
    "--primary": colors.primary.DEFAULT,
    "--primary-light": colors.primary.light,
  };
}
