// PickerSheet.jsx - Shared bottom sheet wrapper for picker modals
// Dark glass or light ceramic background with vaul drawer

import { Drawer } from "vaul";

export function PickerSheet({ isOpen, onClose, instruction, theme = "light", children }) {
  const isDark = theme === "dark";

  const colors = isDark
    ? {
        overlay: "bg-overlay-scrim",
        container: "border-glass-border",
        handle: "bg-text-muted",
        headerText: "text-brand-orange",
      }
    : {
        overlay: "bg-black/40",
        container: "border-[rgba(0,0,0,0.08)]",
        handle: "bg-[rgba(30,51,49,0.15)]",
        headerText: "text-text-accent-light opacity-70",
      };

  const containerStyle = isDark
    ? {
        background: "var(--glass-sheet)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      }
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
          {/* Drag handle */}
          <div className="p-4 rounded-t-[20px] flex-none">
            <div className={`mx-auto w-12 h-1.5 flex-shrink-0 rounded-full ${colors.handle}`} />
          </div>

          {/* Instruction text */}
          {instruction && (
            <div className="text-center pb-4">
              <p className={`text-xs uppercase font-semibold tracking-[0.2em] ${colors.headerText}`}>
                {instruction}
              </p>
            </div>
          )}

          {/* Content */}
          {children}

          {/* Bottom safe area padding */}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
