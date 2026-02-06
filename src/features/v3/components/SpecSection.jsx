// SpecSection.jsx - Collapsible section for bike spec form
// Supports theme prop: "light" (2026 Livery) or "dark" (Kit Theme)
// Spring-animated expand/collapse with height transition

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const spring = { type: "spring", stiffness: 400, damping: 30 };

export function SpecSection({ title, defaultOpen = false, children, theme = "light" }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const isDark = theme === "dark";

  // Theme-specific colors — mapped to tokens.css values
  const colors = isDark
    ? {
        container: "border-glass-border ring-chrome-subtle",
        shadow: "shadow-[0_10px_28px_rgba(0,0,0,0.40)]",
        glass: {
          background: "var(--glass-tile)",
          backdropFilter: "blur(12px) saturate(150%)",
          WebkitBackdropFilter: "blur(12px) saturate(150%)",
        },
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
        border ring-1
        ${colors.container}
        ${colors.shadow}
      `}
      style={{
        ...(isDark ? colors.glass : {}),
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
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={spring}
        >
          <ChevronDown
            size={16}
            className={isOpen ? "text-brand-orange" : colors.chevron}
          />
        </motion.div>
      </button>

      {/* Content - spring animated expand/collapse */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">
              <div className={`p-3 rounded-xl ${colors.contentBg}`}>
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
