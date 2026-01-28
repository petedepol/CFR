// SpecSection.jsx - Collapsible section for bike spec form

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function SpecSection({ title, defaultOpen = false, children }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-[26px] border border-black/10 dark:border-white/[0.10] bg-white/[0.62] dark:bg-white/[0.06] backdrop-blur-[14px] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
      {/* Header - tap to toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-5 flex items-center justify-between gap-3 active:bg-black/[0.02] dark:active:bg-white/[0.02] transition-colors"
      >
        <span
          className="text-xs font-semibold tracking-[0.15em] uppercase dark:text-white/50"
          style={{ color: "#71717a" }}
        >
          {title}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-200 dark:text-white/30 ${isOpen ? "rotate-180" : ""}`}
          style={{ color: "#a1a1aa" }}
        />
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 pt-2">
              <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02]">
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
