// src/ui/styles.js
// Tiny “design tokens” file to unify the look across the app (dark, modern 2026).

export const UI = {
  // Page / containers
  page: "min-h-[100dvh] bg-black text-white",

  // Glass surfaces
  headerGlass: "bg-black/55 backdrop-blur-xl border-b border-white/10",
  card: "rounded-3xl border border-white/12 bg-white/[0.06] backdrop-blur",
  section: "rounded-3xl border border-white/10 bg-black/25",

  // Pills / chips
  pillBase:
    "text-xs px-3 py-2 rounded-2xl border select-none max-w-[180px] truncate",
  pillNeutral: "bg-white/5 border-white/10 text-white/70",
  pillInfo: "bg-white/5 border-white/10 text-white/75",
  pillWarn: "bg-yellow-400/10 border-yellow-400/20 text-yellow-200/90",

  // Buttons
  btnIcon:
    "h-9 w-9 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 inline-flex items-center justify-center transition active:scale-[0.99]",
  btnSecondary:
    "rounded-2xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] px-4 py-3 font-black text-white/90 transition active:scale-[0.99]",
  btnDanger:
    "rounded-2xl px-4 py-2 font-black bg-red-500/10 text-red-200 border border-red-500/25 hover:bg-red-500/15 inline-flex items-center gap-2 transition active:scale-[0.99]",
  btnPrimary:
    "rounded-2xl px-4 py-2 font-black bg-lime-300 text-black hover:bg-lime-200 inline-flex items-center gap-2 transition active:scale-[0.99]",

  // Tabs
  tabBase:
    "flex-1 rounded-2xl px-4 py-3 font-black text-sm inline-flex items-center justify-center gap-2 transition border active:scale-[0.99]",
  tabActive: "bg-lime-300 text-black border-lime-200",
  tabInactive: "bg-white/5 text-white/75 border-white/10 hover:bg-white/10",

  // Text
  label: "text-sm font-bold text-white/80",
  helper: "text-xs text-white/50",
};
