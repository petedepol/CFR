// ActionPicker.jsx - Bottom sheet to select JIG or SPEC action

import { Drawer } from "vaul";
import { X, Ruler, FileText } from "lucide-react";

const BIKE_TYPE_LABELS = {
  training: "Training",
  road: "Road",
  ebike: "E-Bike",
  cx: "CX",
};

export function ActionPicker({ rider, bikeType, isOpen, onClose, onSelectAction }) {
  if (!rider || !bikeType) return null;

  const bikeLabel = BIKE_TYPE_LABELS[bikeType] || bikeType;

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Drawer.Content className="bg-background dark:bg-zinc-900 flex flex-col rounded-t-[32px] h-[45%] fixed bottom-0 left-0 right-0 z-50 outline-none">
          {/* Header */}
          <div className="p-4 bg-background dark:bg-zinc-900 border-b border-border dark:border-white/10 rounded-t-[32px] flex-none">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-foreground/10 dark:bg-white/20 mb-6" />
            <div className="flex items-center justify-between px-2">
              <div>
                <h2 className="text-xl font-bold text-foreground dark:text-white">
                  {rider.name} &middot; {bikeLabel}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-foreground/5 dark:bg-white/10 text-foreground/50 dark:text-white/60 active:scale-90 transition-transform"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex-1 flex items-center justify-center p-6 gap-4">
            <button
              onClick={() => onSelectAction("jig")}
              className="flex-1 flex flex-col items-center gap-3 p-8 rounded-2xl bg-foreground/5 dark:bg-white/10 active:bg-foreground/10 dark:active:bg-white/15 active:scale-[0.98] transition-all border-2 border-transparent hover:border-orange-500/30"
            >
              <Ruler size={48} className="text-orange-500" />
              <span className="text-xl font-bold text-foreground dark:text-white">JIG</span>
            </button>

            <button
              onClick={() => onSelectAction("spec")}
              className="flex-1 flex flex-col items-center gap-3 p-8 rounded-2xl bg-foreground/5 dark:bg-white/10 active:bg-foreground/10 dark:active:bg-white/15 active:scale-[0.98] transition-all border-2 border-transparent hover:border-orange-500/30"
            >
              <FileText size={48} className="text-orange-500" />
              <span className="text-xl font-bold text-foreground dark:text-white">SPEC</span>
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
