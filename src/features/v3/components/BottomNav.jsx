// BottomNav.jsx - Dark glass dock navigation
// Floating glass pill with spring-animated active indicator

import { LayoutDashboard, Home, Users, Settings } from "lucide-react";
import { motion } from "motion/react";

const tabs = [
  { id: "race", icon: LayoutDashboard },
  { id: "home", icon: Home },
  { id: "riders", icon: Users },
  { id: "admin", icon: Settings },
];

const spring = { type: "spring", stiffness: 500, damping: 32 };

export function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="fixed bottom-6 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto w-fit">
        {/* Glass pill */}
        <div
          className="
            relative overflow-hidden rounded-2xl px-2 py-2
            border border-glass-border ring-1 ring-chrome-subtle
          "
          style={{
            background: "var(--glass-rail)",
            backdropFilter: "blur(16px) saturate(180%)",
            WebkitBackdropFilter: "blur(16px) saturate(180%)",
            boxShadow: "var(--shadow-rail)",
          }}
        >
          <div className="flex items-center justify-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  whileTap={{ scale: 0.92 }}
                  className="relative flex items-center justify-center w-12 h-10 rounded-xl"
                >
                  {/* Spring-animated active pill */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-brand-green ring-1 ring-ring-active"
                      style={{ boxShadow: "0 0 12px rgba(233,78,27,0.20)" }}
                      transition={spring}
                    />
                  )}
                  {/* Icon */}
                  <motion.div
                    animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.05 : 1 }}
                    transition={spring}
                    className="relative z-10"
                  >
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className={isActive ? "text-brand-orange" : "text-text-muted"}
                    />
                  </motion.div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
