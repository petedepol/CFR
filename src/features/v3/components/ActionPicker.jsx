// ActionPicker.jsx - CFR Foundation styled bottom sheet
// Supports theme prop: "light" (2026 Livery) or "dark" (Kit Theme)

import { Drawer } from "vaul";
import { Ruler, FileText, Wrench } from "lucide-react";

export function ActionPicker({ rider, bikeType, isOpen, onClose, onSelectAction, theme = "light" }) {
  if (!rider || !bikeType) return null;

  const isDark = theme === "dark";

  // Theme-specific colors
  const colors = isDark
    ? {
        // Dark Kit Theme
        overlay: "bg-black/60",
        container: "bg-[#1e1e1e] border-[#2a2a2a]",
        handle: "bg-[#444444]",
        cardOuter: "bg-[#252525] border-b-2 border-b-[#ff6b2c]",
        cardBorder: "border border-[#333333]",
        cardRing: "ring-1 ring-[rgba(255,255,255,0.05)]",
        cardActiveRing: "group-active:ring-[#ff6b2c] group-active:ring-2",
        cardShadow: "shadow-[0_10px_28px_rgba(0,0,0,0.50)]",
        iconColor: "text-[#ff6b2c]",
        labelColor: "text-white",
        labelHover: "group-hover:text-[#ff6b2c]",
      }
    : {
        // Light 2026 Livery Theme
        overlay: "bg-black/40",
        container: "border-[rgba(0,0,0,0.08)]",
        handle: "bg-[rgba(30,51,49,0.15)]",
        cardOuter: "bg-[rgba(30,51,49,0.12)]",
        cardBorder: "border border-[rgba(0,0,0,0.08)] group-hover:border-[rgba(0,0,0,0.15)]",
        cardRing: "ring-1 ring-[rgba(30,51,49,0.20)]",
        cardActiveRing: "group-active:ring-[rgba(233,78,27,0.50)]",
        cardShadow: "shadow-[0_10px_28px_rgba(0,0,0,0.18)]",
        iconColor: "text-[#e94e1b]",
        labelColor: "text-[#1e3331]",
        labelHover: "group-hover:text-[#e94e1b]",
      };

  // Container background style
  const containerStyle = isDark
    ? { background: "#1e1e1e" }
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

          {/* Action Buttons */}
          <div className="px-4 py-6 flex justify-center gap-6">
            <button
              onClick={() => onSelectAction("jig")}
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
                <div className="w-[100px] h-[100px] rounded-xl flex items-center justify-center">
                  <Ruler size={48} className={colors.iconColor} />
                </div>
              </div>
              <span className={`text-sm font-semibold transition-colors ${colors.labelColor} ${colors.labelHover}`}>
                JIG
              </span>
            </button>

            <button
              onClick={() => onSelectAction("spec")}
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
                <div className="w-[100px] h-[100px] rounded-xl flex items-center justify-center">
                  <FileText size={48} className={colors.iconColor} />
                </div>
              </div>
              <span className={`text-sm font-semibold transition-colors ${colors.labelColor} ${colors.labelHover}`}>
                SPEC
              </span>
            </button>

            <button
              onClick={() => onSelectAction("service")}
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
                <div className="w-[100px] h-[100px] rounded-xl flex items-center justify-center">
                  <Wrench size={48} className={colors.iconColor} />
                </div>
              </div>
              <span className={`text-sm font-semibold transition-colors ${colors.labelColor} ${colors.labelHover}`}>
                SERVICE
              </span>
            </button>
          </div>

          {/* Bottom safe area padding */}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
