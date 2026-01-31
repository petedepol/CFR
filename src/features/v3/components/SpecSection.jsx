// SpecSection.jsx - Collapsible section for bike spec form
// Supports theme prop: "light" (2026 Livery) or "dark" (Kit Theme)
// Instant expand/collapse - no animations

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function SpecSection({ title, defaultOpen = false, children, theme = "light" }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isDark = theme === "dark";

  // Theme-specific colors
  const colors = isDark
    ? {
        container: "bg-[#1e1e1e] border-[#2a2a2a] ring-[rgba(255,255,255,0.05)]",
        shadow: "shadow-[0_10px_28px_rgba(0,0,0,0.40)]",
        headerActive: "active:bg-[rgba(255,255,255,0.03)]",
        title: "text-[#ff6b2c]",
        chevron: "text-[#666666]",
        contentBg: "bg-[rgba(255,255,255,0.02)]",
      }
    : {
        container: "bg-[rgba(232,228,220,0.75)] border-[rgba(0,0,0,0.08)] ring-[rgba(30,51,49,0.12)]",
        shadow: "shadow-[0_10px_28px_rgba(0,0,0,0.10)]",
        headerActive: "active:bg-[rgba(30,51,49,0.04)]",
        title: "text-[#5A7A70]",
        chevron: "text-[#8A9A94]",
        contentBg: "bg-[rgba(30,51,49,0.03)]",
      };

  return (
    <div
      className={`
        rounded-[26px] overflow-hidden
        backdrop-blur-sm border ring-1
        ${colors.container}
        ${colors.shadow}
      `}
      style={{
        borderLeft: isOpen ? (isDark ? "3px solid #ff6b2c" : "3px solid #e94e1b") : undefined,
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
          className={isOpen ? (isDark ? "text-[#ff6b2c] rotate-180" : "text-[#e94e1b] rotate-180") : colors.chevron}
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
