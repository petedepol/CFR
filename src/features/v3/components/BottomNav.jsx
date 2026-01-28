// BottomNav.jsx - Floating pill navigation

import { LayoutDashboard, Home, Users, Settings } from "lucide-react";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, disabled: true },
  { id: "home", label: "Home", icon: Home },
  { id: "riders", label: "Riders", icon: Users },
  { id: "admin", label: "Admin", icon: Settings, disabled: true },
];

export function BottomNav({ activeTab, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-auto max-w-lg px-6 py-3">
        <div className="flex items-center justify-around rounded-full bg-background/80 backdrop-blur-xl border border-white/10 dark:border-white/10 px-2 py-1 shadow-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                disabled={tab.disabled}
                onClick={() => !tab.disabled && onTabChange(tab.id)}
                className={`
                  flex flex-col items-center gap-1 px-4 py-1 rounded-full transition-all duration-200
                  ${isActive ? "text-orange-500" : "text-foreground/40"}
                  ${tab.disabled ? "opacity-30 cursor-not-allowed" : "active:scale-90"}
                `}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
