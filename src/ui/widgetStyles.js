// src/ui/widgetStyles.js
// iOS-style widget design system with light/dark mode support

// Base widget card - glass effect (matches V3.glass pattern)
export const widgetCard = (isDark = true) => isDark
  ? `bg-black/55 backdrop-blur-xl rounded-[28px] border border-white/[0.08] p-4 transition-all duration-300`
  : `bg-white/80 backdrop-blur-xl rounded-[28px] border border-black/[0.06] p-4 shadow-lg shadow-black/5 transition-all duration-300`;

// Widget card when expanded
export const widgetCardExpanded = (isDark = true) => isDark
  ? `bg-black/60`
  : `bg-white/90`;

// Big number display (FlipClock style)
export const bigNumber = (isDark = true) => isDark
  ? `text-5xl font-bold text-white tracking-tight tabular-nums`
  : `text-5xl font-bold text-slate-900 tracking-tight tabular-nums`;

// Medium number display
export const mediumNumber = (isDark = true) => isDark
  ? `text-3xl font-bold text-white tracking-tight tabular-nums`
  : `text-3xl font-bold text-slate-900 tracking-tight tabular-nums`;

// Small number display
export const smallNumber = (isDark = true) => isDark
  ? `text-lg font-semibold text-white tracking-tight tabular-nums`
  : `text-lg font-semibold text-slate-800 tracking-tight tabular-nums`;

// Widget title/header
export const widgetTitle = (isDark = true) => isDark
  ? `text-sm font-semibold text-white/90`
  : `text-sm font-semibold text-slate-800`;

// Widget subtitle/secondary text
export const widgetSubtitle = (isDark = true) => isDark
  ? `text-xs text-white/50`
  : `text-xs text-slate-500`;

// Widget label (below card)
export const widgetLabel = (isDark = true) => isDark
  ? `text-xs text-white/40 text-center mt-2`
  : `text-xs text-slate-400 text-center mt-2`;

// List item with checkbox
export const listItem = (isDark = true) => isDark
  ? `flex items-center gap-3 py-2.5 text-white/90 text-sm`
  : `flex items-center gap-3 py-2.5 text-slate-800 text-sm`;

// List item text (primary)
export const listItemText = (isDark = true) => isDark
  ? `text-sm text-white/90`
  : `text-sm text-slate-800`;

// List item text (completed/muted)
export const listItemTextMuted = (isDark = true) => isDark
  ? `text-sm text-white/50 line-through`
  : `text-sm text-slate-400 line-through`;

// Checkbox circle (unchecked)
export const checkbox = (isDark = true) => isDark
  ? `w-5 h-5 rounded-full border-2 border-white/30 flex items-center justify-center transition-colors hover:border-white/50`
  : `w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center transition-colors hover:border-slate-400`;

// Checkbox circle (checked)
export const checkboxChecked = `
  w-5 h-5 rounded-full
  bg-green-500 border-2 border-green-500
  flex items-center justify-center
`;

// Pin button
export const pinButton = (isDark = true, isPinned = false) => {
  const base = `p-1 rounded-full transition-colors`;
  if (isPinned) return `${base} text-orange-400`;
  return isDark
    ? `${base} text-white/20 hover:text-white/40`
    : `${base} text-slate-300 hover:text-slate-400`;
};

// Add button (blue circle with +)
export const addButton = `
  w-7 h-7 rounded-full
  bg-blue-500 text-white
  flex items-center justify-center
  hover:bg-blue-600 active:scale-95
  transition-all
`;

// Count badge
export const countBadge = (isDark = true) => isDark
  ? `text-sm text-white/50 font-medium`
  : `text-sm text-slate-400 font-medium`;

// Header row (icon + title + count/badge)
export const headerRow = `
  flex items-center justify-between mb-3
`;

// Icon container (colored background)
export const iconContainer = `
  w-7 h-7 rounded-lg
  flex items-center justify-center
`;

// Hourly forecast item
export const hourlyItem = (isDark = true) => isDark
  ? `flex flex-col items-center gap-1 text-white/70 text-xs`
  : `flex flex-col items-center gap-1 text-slate-600 text-xs`;

// Time display
export const timeText = (isDark = true) => isDark
  ? `text-xs text-white/50 tabular-nums`
  : `text-xs text-slate-400 tabular-nums`;

// Divider
export const divider = (isDark = true) => isDark
  ? `border-t border-white/10`
  : `border-t border-slate-200`;

// Colors (same for both modes)
export const colors = {
  orange: '#FF9500',
  blue: '#007AFF',
  green: '#34C759',
  red: '#FF3B30',
  purple: '#AF52DE',
  gray: '#8E8E93',
};

// Widget icon backgrounds (same for both modes - bold colors)
export const iconBg = {
  schedule: 'bg-red-500',
  tasks: 'bg-orange-500',
  weather: 'bg-blue-500',
  clock: 'bg-zinc-700',
  countdown: 'bg-purple-500',
};

// Clock digit box
export const clockDigit = (isDark = true) => isDark
  ? `bg-white/[0.08] rounded-xl px-3 py-2`
  : `bg-slate-100 rounded-xl px-3 py-2`;

// Expanded/collapsed item hover
export const itemHover = (isDark = true) => isDark
  ? `hover:bg-white/5`
  : `hover:bg-slate-50`;

// Page background
export const pageBg = (isDark = true) => isDark
  ? `min-h-screen bg-zinc-900`
  : `min-h-screen bg-slate-50`;

// Header bar
export const headerBar = (isDark = true) => isDark
  ? `sticky top-0 z-40 backdrop-blur-xl bg-zinc-900/80 border-b border-white/5`
  : `sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-slate-200`;

// Nav button
export const navButton = (isDark = true) => isDark
  ? `p-2 rounded-full hover:bg-white/5 active:scale-95 transition-all`
  : `p-2 rounded-full hover:bg-slate-100 active:scale-95 transition-all`;

// Nav icon
export const navIcon = (isDark = true) => isDark
  ? `text-white/60`
  : `text-slate-500`;

// Date button
export const dateButton = (isDark = true) => isDark
  ? `px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-all`
  : `px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-all`;

// Date text
export const dateText = (isDark = true) => isDark
  ? `text-sm font-medium text-white/90`
  : `text-sm font-medium text-slate-700`;

// Event text
export const eventText = (isDark = true) => isDark
  ? `text-xs text-white/40`
  : `text-xs text-slate-400`;

// Clear/Delete button
export const clearButton = (isDark = true) => isDark
  ? `text-xs text-white/30 hover:text-red-400 transition-colors px-2`
  : `text-xs text-slate-400 hover:text-red-500 transition-colors px-2`;

// Import button (floating)
export const importButton = `
  flex items-center gap-2 px-6 py-3 rounded-full
  bg-orange-500 text-white font-semibold
  shadow-lg shadow-orange-500/30
  active:scale-95 transition-all
`;
