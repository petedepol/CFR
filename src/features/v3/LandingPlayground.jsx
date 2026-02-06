// src/features/v3/LandingPlayground.jsx
// V3 Landing Page - Dark theme (CFR Kit colors)
// Clean static layout without entrance animations for faster perceived load

import { useNavigate } from "react-router-dom";
import { Toaster } from "sonner";

import { Avatar } from "./components/Avatar.jsx";

// Real CFR riders
const RIDERS = [
  { id: "ana", name: "Ana", initial: "A", image: "/riders/ana.png" },
  { id: "charlie", name: "Charlie", initial: "C", image: "/riders/charlie.png" },
  { id: "cole", name: "Cole", initial: "C", image: "/riders/cole.png" },
  { id: "luca", name: "Luca", initial: "L", image: "/riders/luca.png" },
  { id: "jolanda", name: "Jolanda", initial: "J", image: "/riders/jolanda.png" },
];

export default function LandingPlayground() {
  const navigate = useNavigate();

  // Dark theme background
  const pageBackground = "radial-gradient(ellipse at 50% 30%, var(--bg-app) 0%, #0d0d0d 70%)";

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
            <p className="text-xs uppercase font-semibold tracking-[0.2em] text-brand-orange opacity-80">
              Tap Rider &rarr; MTB Setup
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
