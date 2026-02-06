// BikeTypePicker.jsx - Bike type selection bottom sheet
// Uses shared PickerSheet for consistent glass treatment

import { PickerSheet } from "./PickerSheet.jsx";

const BIKE_TYPES = [
  { id: "race", label: "Race", image: "/bikes/race.png" },
  { id: "training", label: "Training", image: "/bikes/training.png" },
  { id: "road", label: "Road", image: "/bikes/road.png" },
  { id: "ebike", label: "E-Bike", image: "/bikes/ebike.png" },
  { id: "cx", label: "CX", image: "/bikes/cx.png" },
];

export function BikeTypePicker({ rider, isOpen, onClose, onSelectBike, theme = "light" }) {
  // No early return - let vaul animate the close transition via isOpen prop
  const isDark = theme === "dark";

  // Split into pyramid rows
  const topRow = BIKE_TYPES.slice(0, 3);
  const bottomRow = BIKE_TYPES.slice(3);

  // Theme-specific card colors
  const colors = isDark
    ? {
        cardOuter: "bg-app-elevated border-b-2 border-b-brand-orange",
        cardBorder: "border border-chrome-strong",
        cardRing: "ring-1 ring-chrome-subtle",
        cardActiveRing: "group-active:ring-brand-orange group-active:ring-2",
        cardShadow: "shadow-[0_10px_28px_rgba(0,0,0,0.50)]",
        labelColor: "text-text-primary",
        labelHover: "group-hover:text-brand-orange",
      }
    : {
        cardOuter: "bg-[rgba(30,51,49,0.12)]",
        cardBorder: "border border-[rgba(0,0,0,0.08)] group-hover:border-[rgba(0,0,0,0.15)]",
        cardRing: "ring-1 ring-[rgba(30,51,49,0.20)]",
        cardActiveRing: "group-active:ring-ring-active",
        cardShadow: "shadow-[0_10px_28px_rgba(0,0,0,0.18)]",
        labelColor: "text-brand-green",
        labelHover: "group-hover:text-brand-orange",
      };

  const renderRow = (row) =>
    row.map((bike) => (
      <button
        key={bike.id}
        onClick={() => onSelectBike(bike.id)}
        className="group flex flex-col items-center gap-2 transition-transform active:scale-95"
      >
        <div className={`
          relative p-[2px] rounded-2xl backdrop-blur-sm transition-all
          ${colors.cardOuter} ${colors.cardBorder} ${colors.cardRing} ${colors.cardActiveRing} ${colors.cardShadow}
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
    ));

  return (
    <PickerSheet
      isOpen={isOpen}
      onClose={onClose}
      instruction="Tap Bike &rarr; Choose Action"
      theme={theme}
    >
      <div className="px-4 pb-6">
        <div className="flex justify-center gap-4 mb-4">{renderRow(topRow)}</div>
        <div className="flex justify-center gap-4">{renderRow(bottomRow)}</div>
      </div>
    </PickerSheet>
  );
}
