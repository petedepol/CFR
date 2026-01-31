// BottomNav.jsx - CFR Foundation Dock Navigation (2026 CFR Livery)
// Sand ceramic glass + dark green contrast buttons

import { LayoutDashboard, Home, Users, Settings } from "lucide-react";
import { motion } from "motion/react";

const tabs = [
  { id: "dashboard", icon: LayoutDashboard },
  { id: "home", icon: Home },
  { id: "riders", icon: Users },
  { id: "admin", icon: Settings, disabled: true },
];

const spring = { type: "spring", stiffness: 520, damping: 34 };

export function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto w-fit pb-3">
        {/* Outer rail - sand ceramic glass, compact, with dark green top border */}
        <div
          className="
            relative overflow-hidden rounded-xl px-1.5 py-1.5
            bg-[rgba(232,228,220,0.85)] backdrop-blur-sm
            border-t border-[#1e3331]
            border-x border-b border-[rgba(0,0,0,0.10)]
            ring-1 ring-[rgba(0,0,0,0.08)]
            shadow-[0_10px_28px_rgba(0,0,0,0.18)]
          "
        >
          {/* Navigation buttons */}
          <div className="flex items-center justify-center gap-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <motion.button
                  key={tab.id}
                  disabled={tab.disabled}
                  onClick={() => !tab.disabled && onTabChange(tab.id)}
                  whileTap={!tab.disabled ? { scale: 0.95 } : undefined}
                  className={`
                    relative flex items-center justify-center
                    w-12 h-12 rounded-xl
                    ${tab.disabled
                      ? 'opacity-30 cursor-not-allowed'
                      : ''
                    }
                  `}
                >
                  {/* Active pill - dark green with orange ring */}
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="
                        absolute inset-0 rounded-xl
                        bg-[rgba(30,51,49,0.92)]
                        ring-1 ring-[rgba(233,78,27,0.55)]
                        shadow-[0_8px_20px_rgba(0,0,0,0.35)]
                      "
                      transition={spring}
                    />
                  )}
                  {/* Icon with micro-motion */}
                  <motion.div
                    animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.02 : 1 }}
                    transition={spring}
                    className="relative z-10"
                  >
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2 : 1.5}
                      className={
                        isActive
                          ? 'text-[#e94e1b]'
                          : 'text-[#1a1a1a] opacity-70'
                      }
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
