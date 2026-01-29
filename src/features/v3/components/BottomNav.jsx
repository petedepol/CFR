// BottomNav.jsx - CFR Foundation Dock Navigation
// Double glass effect: outer rail + inner tiles

import { LayoutDashboard, Home, Users, Settings } from "lucide-react";

const tabs = [
  { id: "dashboard", icon: LayoutDashboard },
  { id: "home", icon: Home },
  { id: "riders", icon: Users },
  { id: "admin", icon: Settings, disabled: true },
];

export function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-auto max-w-lg px-4 py-4">
        {/* Outer rail - glass container */}
        <div
          className="
            relative rounded-2xl px-3 py-2
            bg-glass-rail backdrop-blur-xl
            border border-glass-border
            shadow-[var(--shadow-rail)]
          "
        >
          {/* Navigation buttons */}
          <div className="flex items-center justify-between gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  disabled={tab.disabled}
                  onClick={() => !tab.disabled && onTabChange(tab.id)}
                  className={`
                    flex items-center justify-center
                    w-12 h-12 rounded-xl
                    transition-all duration-150
                    bg-glass-tile border
                    ${isActive
                      ? 'border-ring-active text-brand-orange'
                      : 'border-glass-border text-text-muted'
                    }
                    ${tab.disabled
                      ? 'opacity-30 cursor-not-allowed'
                      : 'active:scale-95 active:bg-black/20 hover:bg-white/5'
                    }
                  `}
                >
                  <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
