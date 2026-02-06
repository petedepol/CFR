// BikeTypePicker.jsx - CFR Foundation styled bottom sheet for bike selection
// Supports theme prop: "light" (2026 Livery) or "dark" (Kit Theme)
// Pyramid layout (3 + 2) - no scroll on iPhone

import { Drawer } from "vaul";

const BIKE_TYPES = [
  { id: "race", label: "Race", image: "/bikes/race.png" },
  { id: "training", label: "Training", image: "/bikes/training.png" },
  { id: "road", label: "Road", image: "/bikes/road.png" },
  { id: "ebike", label: "E-Bike", image: "/bikes/ebike.png" },
  { id: "cx", label: "CX", image: "/bikes/cx.png" },
];

export function BikeTypePicker({ rider, isOpen, onClose, onSelectBike, theme = "light" }) {
  if (!rider) return null;

  const isDark = theme === "dark";

  // Split into pyramid rows
  const topRow = BIKE_TYPES.slice(0, 3);
  const bottomRow = BIKE_TYPES.slice(3);

  // Theme-specific colors — mapped to tokens.css values
  const colors = isDark
    ? {
        overlay: "bg-overlay-scrim",
        container: "bg-app-surface border-chrome-strong",
        handle: "bg-text-muted",
        headerText: "text-brand-orange",
        cardOuter: "bg-app-elevated border-b-2 border-b-brand-orange",
        cardBorder: "border border-chrome-strong",
        cardRing: "ring-1 ring-chrome-subtle",
        cardActiveRing: "group-active:ring-brand-orange group-active:ring-2",
        cardShadow: "shadow-[0_10px_28px_rgba(0,0,0,0.50)]",
        labelColor: "text-text-primary",
        labelHover: "group-hover:text-brand-orange",
      }
    : {
        overlay: "bg-black/40",
        container: "border-[rgba(0,0,0,0.08)]",
        handle: "bg-[rgba(30,51,49,0.15)]",
        headerText: "text-text-accent-light opacity-70",
        cardOuter: "bg-[rgba(30,51,49,0.12)]",
        cardBorder: "border border-[rgba(0,0,0,0.08)] group-hover:border-[rgba(0,0,0,0.15)]",
        cardRing: "ring-1 ring-[rgba(30,51,49,0.20)]",
        cardActiveRing: "group-active:ring-ring-active",
        cardShadow: "shadow-[0_10px_28px_rgba(0,0,0,0.18)]",
        labelColor: "text-brand-green",
        labelHover: "group-hover:text-brand-orange",
      };

  // Container background style
  const containerStyle = isDark
    ? { background: "var(--bg-surface)" }
    : {
        background:
          "radial-gradient(400px 300px at 50% 100%, rgba(30,51,49,0.15), transparent 70%)," +
          "rgba(232,228,220,0.98)",
      };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className={`fixed inset-0 backdrop-blur-sm z-50 ${colors.overlay}`} />
        <Drawer.Content
          className={`flex flex-col rounded-t-[20px] fixed bottom-0 left-0 right-0 z-50 outline-none border-t ${colors.container}`}
          style={containerStyle}
        >
          {/* Header */}
          <div className="p-4 rounded-t-[20px] flex-none">
            <div className={`mx-auto w-12 h-1.5 flex-shrink-0 rounded-full ${colors.handle}`} />
          </div>

          {/* Instruction text */}
          <div className="text-center pb-4">
            <p className={`text-[10px] uppercase font-semibold tracking-[0.3em] ${colors.headerText}`}>
              Tap Bike &rarr; Choose Action
            </p>
          </div>

          {/* Bike Type Grid - Pyramid Layout */}
          <div className="px-4 pb-6">
            {/* Top row - 3 bikes */}
            <div className="flex justify-center gap-4 mb-4">
              {topRow.map((bike) => (
                <button
                  key={bike.id}
                  onClick={() => onSelectBike(bike.id)}
                  className="group flex flex-col items-center gap-2 transition-transform active:scale-95"
                >
                  {/* Card container */}
                  <div className={`
                    relative p-[2px] rounded-2xl
                    ${colors.cardOuter}
                    backdrop-blur-sm
                    ${colors.cardBorder}
                    ${colors.cardRing}
                    ${colors.cardActiveRing}
                    ${colors.cardShadow}
                    transition-all
                  `}>
                    <div className={`w-[88px] h-[58px] rounded-xl overflow-hidden flex items-center justify-center ${isDark ? "bg-app-surface" : ""}`}>
                      <img
                        src={bike.image}
                        alt={bike.label}
                        className={`w-full h-full object-contain ${isDark ? "brightness-110" : ""}`}
                      />
                    </div>
                  </div>
                  <span className={`text-sm font-semibold transition-colors ${colors.labelColor} ${colors.labelHover}`}>
                    {bike.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Bottom row - 2 bikes, centered */}
            <div className="flex justify-center gap-4">
              {bottomRow.map((bike) => (
                <button
                  key={bike.id}
                  onClick={() => onSelectBike(bike.id)}
                  className="group flex flex-col items-center gap-2 transition-transform active:scale-95"
                >
                  {/* Card container */}
                  <div className={`
                    relative p-[2px] rounded-2xl
                    ${colors.cardOuter}
                    backdrop-blur-sm
                    ${colors.cardBorder}
                    ${colors.cardRing}
                    ${colors.cardActiveRing}
                    ${colors.cardShadow}
                    transition-all
                  `}>
                    <div className={`w-[88px] h-[58px] rounded-xl overflow-hidden flex items-center justify-center ${isDark ? "bg-app-surface" : ""}`}>
                      <img
                        src={bike.image}
                        alt={bike.label}
                        className={`w-full h-full object-contain ${isDark ? "brightness-110" : ""}`}
                      />
                    </div>
                  </div>
                  <span className={`text-sm font-semibold transition-colors ${colors.labelColor} ${colors.labelHover}`}>
                    {bike.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom safe area padding */}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
