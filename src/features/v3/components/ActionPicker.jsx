// ActionPicker.jsx - Action selection bottom sheet (JIG / SPEC / SERVICE)
// Uses shared PickerSheet for consistent glass treatment

import { Ruler, FileText, Wrench } from "lucide-react";
import { PickerSheet } from "./PickerSheet.jsx";

const ACTIONS = [
  { id: "jig", label: "JIG", icon: Ruler },
  { id: "spec", label: "SPEC", icon: FileText },
  { id: "service", label: "SERVICE", icon: Wrench },
];

export function ActionPicker({ rider, bikeType, isOpen, onClose, onSelectAction, theme = "light" }) {
  // No early return - let vaul animate the close transition via isOpen prop
  const isDark = theme === "dark";

  // Theme-specific card colors
  const colors = isDark
    ? {
        cardOuter: "bg-app-elevated border-b-2 border-b-brand-orange",
        cardBorder: "border border-chrome-strong",
        cardRing: "ring-1 ring-chrome-subtle",
        cardActiveRing: "group-active:ring-brand-orange group-active:ring-2",
        cardShadow: "shadow-[0_10px_28px_rgba(0,0,0,0.50)]",
        iconColor: "text-brand-orange",
        labelColor: "text-text-primary",
        labelHover: "group-hover:text-brand-orange",
      }
    : {
        cardOuter: "bg-[rgba(30,51,49,0.12)]",
        cardBorder: "border border-[rgba(0,0,0,0.08)] group-hover:border-[rgba(0,0,0,0.15)]",
        cardRing: "ring-1 ring-[rgba(30,51,49,0.20)]",
        cardActiveRing: "group-active:ring-ring-active",
        cardShadow: "shadow-[0_10px_28px_rgba(0,0,0,0.18)]",
        iconColor: "text-brand-orange",
        labelColor: "text-brand-green",
        labelHover: "group-hover:text-brand-orange",
      };

  return (
    <PickerSheet isOpen={isOpen} onClose={onClose} theme={theme}>
      <div className="px-4 py-6 flex justify-center gap-6">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => onSelectAction(action.id)}
              className="group flex flex-col items-center gap-2 transition-transform active:scale-95"
            >
              <div className={`
                relative p-[2px] rounded-2xl backdrop-blur-sm transition-all
                ${colors.cardOuter} ${colors.cardBorder} ${colors.cardRing} ${colors.cardActiveRing} ${colors.cardShadow}
              `}>
                <div className="w-[100px] h-[100px] rounded-xl flex items-center justify-center">
                  <Icon size={48} className={colors.iconColor} />
                </div>
              </div>
              <span className={`text-sm font-semibold transition-colors ${colors.labelColor} ${colors.labelHover}`}>
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </PickerSheet>
  );
}
