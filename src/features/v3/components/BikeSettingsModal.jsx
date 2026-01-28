// BikeSettingsModal.jsx - Bottom sheet form for bike settings

import { Drawer } from "vaul";
import { X, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "motion/react";

export function BikeSettingsModal({
  rider,
  isOpen,
  onClose,
  onSave,
  initialSettings,
}) {
  const [settings, setSettings] = useState(initialSettings);

  useEffect(() => {
    if (isOpen) {
      setSettings(initialSettings);
    }
  }, [isOpen, initialSettings]);

  if (!rider) return null;

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
        <Drawer.Content className="bg-background dark:bg-zinc-900 flex flex-col rounded-t-[32px] h-[92%] mt-24 fixed bottom-0 left-0 right-0 z-50 outline-none">
          {/* Header */}
          <div className="p-4 bg-background dark:bg-zinc-900 border-b border-border dark:border-white/10 rounded-t-[32px] flex-none">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-foreground/10 dark:bg-white/20 mb-6" />
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold text-foreground dark:text-white">
                {rider.name}&apos;s Settings
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-foreground/5 dark:bg-white/10 text-foreground/50 dark:text-white/60 active:scale-90 transition-transform"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
            {/* Dimensions Section */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-500/80 px-1">
                Dimensions (mm)
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <InputGroup
                  label="Saddle Height"
                  value={settings.saddleHeight}
                  onChange={(v) => handleChange("saddleHeight", v)}
                  placeholder="e.g. 745"
                />
                <div className="grid grid-cols-2 gap-4">
                  <InputGroup
                    label="Reach"
                    value={settings.reach}
                    onChange={(v) => handleChange("reach", v)}
                    placeholder="e.g. 520"
                  />
                  <InputGroup
                    label="Drop"
                    value={settings.drop}
                    onChange={(v) => handleChange("drop", v)}
                    placeholder="e.g. 95"
                  />
                </div>
              </div>
            </section>

            {/* Tires Section */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-500/80 px-1">
                Tire Pressure (PSI)
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <InputGroup
                  label="Front"
                  value={settings.tirePressureFront}
                  onChange={(v) => handleChange("tirePressureFront", v)}
                  placeholder="e.g. 58"
                />
                <InputGroup
                  label="Rear"
                  value={settings.tirePressureRear}
                  onChange={(v) => handleChange("tirePressureRear", v)}
                  placeholder="e.g. 62"
                />
              </div>
            </section>

            {/* Notes Section */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-500/80 px-1">
                Notes
              </h3>
              <textarea
                value={settings.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Specific race tweaks, weather considerations..."
                className="w-full h-32 px-4 py-3 rounded-2xl bg-input-background dark:bg-white/[0.08] border border-border dark:border-white/[0.12] text-foreground dark:text-white placeholder:text-foreground/30 dark:placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-orange-500/50 resize-none"
              />
            </section>
          </div>

          {/* Save Button */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background dark:from-zinc-900 via-background dark:via-zinc-900 to-transparent pt-10">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onSave(settings)}
              className="w-full py-4 rounded-2xl bg-orange-500 text-white font-bold text-lg flex items-center justify-center gap-2 shadow-[0_8px_30px_rgb(249,115,22,0.3)] active:shadow-none transition-shadow"
            >
              <Save size={20} />
              Save Settings
            </motion.button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function InputGroup({ label, value, onChange, placeholder }) {
  return (
    <div className="space-y-2">
      <label className="text-[13px] font-medium text-foreground/50 dark:text-white/50 ml-1">
        {label}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-2xl bg-input-background dark:bg-white/[0.08] border border-border dark:border-white/[0.12] text-foreground dark:text-white placeholder:text-foreground/20 dark:placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-orange-500/50 transition-all"
      />
    </div>
  );
}
