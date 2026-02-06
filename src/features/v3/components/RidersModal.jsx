// RidersModal.jsx - Rider selection bottom sheet
// Uses shared PickerSheet for consistent glass treatment

import { PickerSheet } from "./PickerSheet.jsx";

export function RidersModal({ riders, isOpen, onClose, onSelectRider, theme = "light" }) {
  const isDark = theme === "dark";

  // Split riders into pyramid rows
  const topRow = riders.slice(0, 3);
  const bottomRow = riders.slice(3);

  // Theme-specific card colors
  const colors = isDark
    ? {
        cardOuter: "bg-app-elevated border-b-2 border-b-brand-orange",
        cardRing: "ring-1 ring-chrome-subtle",
        cardActiveRing: "group-active:ring-brand-orange group-active:ring-2",
        cardInner: "bg-app-surface border-chrome-subtle",
        cardShadow: "shadow-[0_10px_28px_rgba(0,0,0,0.50)]",
        nameColor: "text-text-primary",
        nameHover: "group-hover:text-brand-orange",
      }
    : {
        cardOuter: "bg-[rgba(30,51,49,0.12)]",
        cardRing: "ring-1 ring-[rgba(30,51,49,0.20)]",
        cardActiveRing: "group-active:ring-ring-active",
        cardInner: "bg-brand-green border-chrome-subtle",
        cardShadow: "shadow-[0_10px_28px_rgba(0,0,0,0.18)]",
        nameColor: "text-brand-green",
        nameHover: "group-hover:text-brand-orange",
      };

  const renderRow = (row) =>
    row.map((rider) => (
      <button
        key={rider.id}
        onClick={() => onSelectRider(rider)}
        className="group flex flex-col items-center gap-2 transition-transform active:scale-95"
      >
        <div className={`
          relative p-[2px] rounded-2xl backdrop-blur-sm border border-transparent transition-all
          ${colors.cardOuter} ${colors.cardRing} ${colors.cardActiveRing} ${colors.cardShadow}
        `}>
          <div className={`w-[72px] h-[72px] rounded-xl overflow-hidden border ${colors.cardInner}`}>
            {rider.image ? (
              <img src={rider.image} alt={rider.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[linear-gradient(180deg,var(--brand-orange-hi)_0%,var(--brand-orange)_100%)]">
                <span className="text-lg font-bold text-white">{rider.initial}</span>
              </div>
            )}
          </div>
        </div>
        <span className={`text-sm font-semibold transition-colors ${colors.nameColor} ${colors.nameHover}`}>
          {rider.name}
        </span>
      </button>
    ));

  return (
    <PickerSheet
      isOpen={isOpen}
      onClose={onClose}
      instruction="Tap Rider &rarr; Choose Bike"
      theme={theme}
    >
      <div className="px-4 pb-6">
        <div className="flex justify-center gap-4 mb-4">{renderRow(topRow)}</div>
        <div className="flex justify-center gap-4">{renderRow(bottomRow)}</div>
      </div>
    </PickerSheet>
  );
}
