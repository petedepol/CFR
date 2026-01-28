// RidersModal.jsx - Bottom sheet rider grid

import { Drawer } from "vaul";
import { X } from "lucide-react";

export function RidersModal({ riders, isOpen, onClose, onSelectRider }) {
  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Drawer.Content className="bg-background dark:bg-zinc-900 flex flex-col rounded-t-[32px] h-[50%] fixed bottom-0 left-0 right-0 z-50 outline-none">
          {/* Header */}
          <div className="p-4 bg-background dark:bg-zinc-900 border-b border-border dark:border-white/10 rounded-t-[32px] flex-none">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-foreground/10 dark:bg-white/20 mb-6" />
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold text-foreground dark:text-white">Team Riders</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-foreground/5 dark:bg-white/10 text-foreground/50 dark:text-white/60 active:scale-90 transition-transform"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Rider Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-2">
              {riders.map((rider) => (
                <button
                  key={rider.id}
                  onClick={() => {
                    onSelectRider(rider);
                    onClose();
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-foreground/5 dark:bg-white/10 active:bg-foreground/10 dark:active:bg-white/15 active:scale-[0.98] transition-all"
                >
                  {/* Rider avatar - image or initial fallback */}
                  <div className="w-16 h-16 rounded-full overflow-hidden">
                    {rider.image ? (
                      <img
                        src={rider.image}
                        alt={rider.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 p-[2px]">
                        <div className="w-full h-full rounded-full bg-background dark:bg-zinc-900 flex items-center justify-center">
                          <span className="text-lg font-bold text-foreground dark:text-white">
                            {rider.initial}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  <span className="text-lg font-semibold text-foreground dark:text-white">
                    {rider.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
