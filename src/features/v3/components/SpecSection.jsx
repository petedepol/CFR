// SpecSection.jsx - Collapsible section for bike spec form
// Supports theme prop: "light" (2026 Livery) or "dark" (Kit Theme)
// Instant expand/collapse - no animations

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function SpecSection({ title, defaultOpen = false, children, theme = "light" }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isDark = theme === "dark";

  // Theme-specific colors — mapped to tokens.css values
  const colors = isDark
    ? {
        container: "bg-app-surface border-chrome-strong ring-chrome-subtle",
        shadow: "shadow-[0_10px_28px_rgba(0,0,0,0.40)]",
        headerActive: "active:bg-overlay-hover",
        title: "text-brand-orange",
        chevron: "text-text-muted",
        contentBg: "bg-overlay-hover",
      }
    : {
        container: "bg-light-surface border-[rgba(0,0,0,0.08)] ring-[rgba(30,51,49,0.12)]",
        shadow: "shadow-[0_10px_28px_rgba(0,0,0,0.10)]",
        headerActive: "active:bg-[rgba(30,51,49,0.04)]",
        title: "text-text-accent-light",
        chevron: "text-text-muted",
        contentBg: "bg-[rgba(30,51,49,0.03)]",
      };

  return (
    <div
      className={`
        rounded-2xl overflow-hidden
        backdrop-blur-sm border ring-1
        ${colors.container}
        ${colors.shadow}
      `}
      style={{
        borderLeft: isOpen ? `3px solid var(--brand-orange)` : undefined,
      }}
    >
      {/* Header - tap to toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-5 py-3 flex items-center justify-between gap-3 ${colors.headerActive}`}
      >
        <span className={`text-xs font-semibold tracking-[0.15em] uppercase ${colors.title}`}>
          {title}
        </span>
        <ChevronDown
          size={16}
          className={isOpen ? "text-brand-orange rotate-180" : colors.chevron}
        />
      </button>

      {/* Content - instant show/hide */}
      {isOpen && (
        <div className="px-4 pb-4 pt-1">
          <div className={`p-3 rounded-xl ${colors.contentBg}`}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
