// src/features/v3/LandingPlayground.jsx
// V3 Landing Page - Dark theme (CFR Kit colors)
// Clean static layout without entrance animations for faster perceived load

import { useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { motion } from "motion/react";
import { Toaster } from "sonner";
import { Home, Users, Settings, LayoutDashboard } from "lucide-react";

import { Avatar } from "./components/Avatar.jsx";

// Real CFR riders
const RIDERS = [
  { id: "ana", name: "Ana", initial: "A", image: "/riders/ana.png" },
  { id: "charlie", name: "Charlie", initial: "C", image: "/riders/charlie.png" },
  { id: "cole", name: "Cole", initial: "C", image: "/riders/cole.png" },
  { id: "luca", name: "Luca", initial: "L", image: "/riders/luca.png" },
  { id: "jolanda", name: "Jolanda", initial: "J", image: "/riders/jolanda.png" },
];

// Dark theme nav tabs - matches light mode BottomNav
const NAV_TABS = [
  { id: "race", icon: LayoutDashboard, path: "/v3/race" },
  { id: "home", icon: Home, path: "/v3" },
  { id: "riders", icon: Users, path: "/v3/setup" },
  { id: "admin", icon: Settings, path: "/v3/settings", disabled: false },
];

export default function LandingPlayground() {
  const navigate = useNavigate();
  const location = useLocation();
  const { onNavTabChange } = useOutletContext();

  // Dark theme background
  const pageBackground = "radial-gradient(ellipse at 50% 30%, var(--bg-app) 0%, #0d0d0d 70%)";

  // Determine active tab from current path
  const activeTab = NAV_TABS.find((tab) => location.pathname === tab.path)?.id || "home";

  return (
    <div
      className="min-h-dvh font-sans selection:bg-brand-orange/30"
      style={{ background: pageBackground }}
    >
      <Toaster position="top-center" />

      {/* Main Content Area */}
      <main className="max-w-lg mx-auto px-6 pt-16 pb-32 min-h-dvh flex flex-col">
        {/* Logo Header */}
        <section className="flex flex-col items-center pt-0 pb-8 mb-14">
          <img
            src="/logos/cfr-logo-light.png"
            alt="Cannondale Factory Racing"
            className="h-[62px] w-auto brightness-0 invert drop-shadow-[0_4px_12px_rgba(255,255,255,0.10)]"
          />
        </section>

        {/* Rider Grid - Pyramid Layout */}
        <div className="flex-1 flex flex-col items-center">
          {/* Top row - 3 riders */}
          <div className="flex justify-center gap-6 mb-10">
            {RIDERS.slice(0, 3).map((rider) => (
              <div key={rider.id}>
                <Avatar
                  name={rider.name}
                  initial={rider.initial}
                  image={rider.image}
                  theme="dark"
                  onClick={() => navigate(`/v3/setup?rider=${encodeURIComponent(rider.name)}`)}
                />
              </div>
            ))}
          </div>

          {/* Bottom row - 2 riders, centered */}
          <div className="flex justify-center gap-6 mb-12">
            {RIDERS.slice(3).map((rider) => (
              <div key={rider.id}>
                <Avatar
                  name={rider.name}
                  initial={rider.initial}
                  image={rider.image}
                  theme="dark"
                  onClick={() => navigate(`/v3/setup?rider=${encodeURIComponent(rider.name)}`)}
                />
              </div>
            ))}
          </div>

          {/* Instruction text */}
          <div className="text-center">
            <p className="text-[10px] uppercase font-semibold tracking-[0.3em] text-brand-orange opacity-80">
              Tap Rider &rarr; MTB Setup
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Navigation - floating icons */}
      <nav
          className="fixed bottom-6 left-0 right-0 z-50 pb-[env(safe-area-inset-bottom)]"
          style={{
            // Subtle top shadow for depth
            boxShadow: "0 -8px 24px rgba(0, 0, 0, 0.25)",
          }}
        >
          {/* Floating icons - no bar */}
          <div className="flex items-center justify-center gap-8 max-w-md mx-auto">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <motion.button
                  key={tab.id}
                  disabled={tab.disabled}
                  onClick={() => !tab.disabled && onNavTabChange(tab.id)}
                  whileTap={!tab.disabled ? { scale: 0.9 } : undefined}
                  className={`
                    relative flex flex-col items-center gap-1.5 p-2 transition-all
                    ${tab.disabled ? "opacity-30 cursor-not-allowed" : ""}
                  `}
                >
                  {/* Active glow behind icon */}
                  {isActive && !tab.disabled && (
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: "radial-gradient(circle, rgba(233,78,27,0.25) 0%, transparent 70%)",
                        filter: "blur(8px)",
                      }}
                    />
                  )}
                  <Icon
                    size={24}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={`relative z-10 ${isActive && !tab.disabled ? "text-brand-orange" : "text-text-muted"}`}
                  />
                  {/* Active dot indicator */}
                  {isActive && !tab.disabled && (
                    <div className="relative z-10 w-1 h-1 rounded-full bg-brand-orange" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </nav>
    </div>
  );
}
