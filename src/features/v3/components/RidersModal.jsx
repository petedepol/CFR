// RidersModal.jsx - CFR Foundation styled bottom sheet rider grid
// Supports theme prop: "light" (2026 Livery) or "dark" (Kit Theme)

import { Drawer } from "vaul";

export function RidersModal({ riders, isOpen, onClose, onSelectRider, theme = "light" }) {
  const isDark = theme === "dark";

  // Split riders into pyramid rows
  const topRow = riders.slice(0, 3);
  const bottomRow = riders.slice(3);

  // Theme-specific colors — mapped to tokens.css values
  const colors = isDark
    ? {
        overlay: "bg-overlay-scrim",
        container: "bg-app-surface border-chrome-strong",
        handle: "bg-text-muted",
        headerText: "text-brand-orange",
        cardOuter: "bg-app-elevated border-b-2 border-b-brand-orange",
        cardRing: "ring-1 ring-chrome-subtle",
        cardActiveRing: "group-active:ring-brand-orange group-active:ring-2",
        cardInner: "bg-app-surface border-chrome-subtle",
        cardShadow: "shadow-[0_10px_28px_rgba(0,0,0,0.50)]",
        nameColor: "text-text-primary",
        nameHover: "group-hover:text-brand-orange",
      }
    : {
        overlay: "bg-black/40",
        container: "border-[rgba(0,0,0,0.08)]",
        handle: "bg-[rgba(30,51,49,0.15)]",
        headerText: "text-text-accent-light opacity-70",
        cardOuter: "bg-[rgba(30,51,49,0.12)]",
        cardRing: "ring-1 ring-[rgba(30,51,49,0.20)]",
        cardActiveRing: "group-active:ring-ring-active",
        cardInner: "bg-brand-green border-chrome-subtle",
        cardShadow: "shadow-[0_10px_28px_rgba(0,0,0,0.18)]",
        nameColor: "text-brand-green",
        nameHover: "group-hover:text-brand-orange",
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
              Tap Rider &rarr; Choose Bike
            </p>
          </div>

          {/* Rider Grid - Pyramid Layout */}
          <div className="px-4 pb-6">
            {/* Top row - 3 riders */}
            <div className="flex justify-center gap-4 mb-4">
              {topRow.map((rider) => (
                <button
                  key={rider.id}
                  onClick={() => onSelectRider(rider)}
                  className="group flex flex-col items-center gap-2 transition-transform active:scale-95"
                >
                  {/* Card container */}
                  <div className={`
                    relative p-[2px] rounded-2xl
                    ${colors.cardOuter}
                    backdrop-blur-sm
                    border border-transparent
                    ${colors.cardRing}
                    ${colors.cardActiveRing}
                    ${colors.cardShadow}
                    transition-all
                  `}>
                    <div className={`w-[72px] h-[72px] rounded-xl overflow-hidden border ${colors.cardInner}`}>
                      {rider.image ? (
                        <img
                          src={rider.image}
                          alt={rider.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${
                          "bg-[linear-gradient(180deg,var(--brand-orange-hi)_0%,var(--brand-orange)_100%)]"
                        }`}>
                          <span className="text-lg font-bold text-white">
                            {rider.initial}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`text-sm font-semibold transition-colors ${colors.nameColor} ${colors.nameHover}`}>
                    {rider.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Bottom row - 2 riders, centered */}
            <div className="flex justify-center gap-4">
              {bottomRow.map((rider) => (
                <button
                  key={rider.id}
                  onClick={() => onSelectRider(rider)}
                  className="group flex flex-col items-center gap-2 transition-transform active:scale-95"
                >
                  {/* Card container */}
                  <div className={`
                    relative p-[2px] rounded-2xl
                    ${colors.cardOuter}
                    backdrop-blur-sm
                    border border-transparent
                    ${colors.cardRing}
                    ${colors.cardActiveRing}
                    ${colors.cardShadow}
                    transition-all
                  `}>
                    <div className={`w-[72px] h-[72px] rounded-xl overflow-hidden border ${colors.cardInner}`}>
                      {rider.image ? (
                        <img
                          src={rider.image}
                          alt={rider.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${
                          "bg-[linear-gradient(180deg,var(--brand-orange-hi)_0%,var(--brand-orange)_100%)]"
                        }`}>
                          <span className="text-lg font-bold text-white">
                            {rider.initial}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`text-sm font-semibold transition-colors ${colors.nameColor} ${colors.nameHover}`}>
                    {rider.name}
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
