// BikeTypePicker.jsx - Bottom sheet to select bike type

import { Drawer } from "vaul";
import { X, Bike, Mountain, Zap, TreePine, Trophy } from "lucide-react";

const BIKE_TYPES = [
  { id: "race", label: "Race", icon: Trophy, description: "Race MTB" },
  { id: "training", label: "Training", icon: Mountain, description: "Training MTB" },
  { id: "road", label: "Road", icon: Bike, description: "Road bike" },
  { id: "ebike", label: "E-Bike", icon: Zap, description: "Electric MTB" },
  { id: "cx", label: "CX", icon: TreePine, description: "Cyclocross" },
];

export function BikeTypePicker({ rider, isOpen, onClose, onSelectBike }) {
  if (!rider) return null;

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Drawer.Content className="bg-background dark:bg-zinc-900 flex flex-col rounded-t-[32px] h-[50%] fixed bottom-0 left-0 right-0 z-50 outline-none">
          {/* Header */}
          <div className="p-4 bg-background dark:bg-zinc-900 border-b border-border dark:border-white/10 rounded-t-[32px] flex-none">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-foreground/10 dark:bg-white/20 mb-6" />
            <div className="flex items-center justify-between px-2">
              <div>
                <h2 className="text-xl font-bold text-foreground dark:text-white">{rider.name}'s Bikes</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-foreground/5 dark:bg-white/10 text-foreground/50 dark:text-white/60 active:scale-90 transition-transform"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Bike Type Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-3">
              {BIKE_TYPES.map((bike) => {
                const Icon = bike.icon;
                return (
                  <button
                    key={bike.id}
                    onClick={() => {
                      onSelectBike(bike.id);
                    }}
                    className="flex flex-col items-center gap-2 p-6 rounded-2xl bg-foreground/5 dark:bg-white/10 active:bg-foreground/10 dark:active:bg-white/15 active:scale-[0.98] transition-all"
                  >
                    <Icon size={32} className="text-orange-500" />
                    <span className="text-lg font-semibold text-foreground dark:text-white">
                      {bike.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
