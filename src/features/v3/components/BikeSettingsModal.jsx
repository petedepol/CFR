// BikeSettingsModal.jsx - CFR branded bottom sheet form for bike settings

import { Drawer } from "vaul";
import { X, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "motion/react";

// CFR Team Colors
const CFR_LIME = '#4A9B7F';
const CFR_LIME_LIGHT = '#5DB893';

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
        <Drawer.Overlay className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-sm z-50" />
        <Drawer.Content className="bg-[#fffefa] dark:bg-[rgba(12,12,10,0.96)] dark:backdrop-blur-xl flex flex-col rounded-t-[32px] max-h-[92dvh] mt-24 fixed bottom-0 left-0 right-0 z-50 outline-none border-t border-black/[0.06] dark:border-[#4A9B7F]/20">
          {/* Header */}
          <div className="p-4 border-b border-black/10 dark:border-white/[0.08] rounded-t-[32px] flex-none">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-black/10 dark:bg-white/20 mb-6" />
            <div className="flex items-center justify-between px-2">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                {rider.name}&apos;s Settings
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black/5 dark:bg-white/10 text-zinc-500 dark:text-white/60 active:scale-90 transition-transform"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-32">
            {/* Dimensions Section */}
            <section className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-500 dark:text-[#5DB893] px-1">
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
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-500 dark:text-[#5DB893] px-1">
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
              <h3 className="text-xs font-bold uppercase tracking-widest text-orange-500 dark:text-[#5DB893] px-1">
                Notes
              </h3>
              <textarea
                value={settings.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Specific race tweaks, weather considerations..."
                className="w-full h-32 px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-[rgba(25,25,22,0.6)] border border-black/10 dark:border-white/[0.1] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-orange-500/50 dark:focus:ring-[#4A9B7F]/50 resize-none"
              />
            </section>
          </div>

          {/* Save Button */}
          <div className="absolute bottom-0 left-0 right-0 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-[#fffefa] dark:from-[rgba(12,12,10,0.96)] via-[#fffefa] dark:via-[rgba(12,12,10,0.96)] to-transparent pt-10">
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
      <label className="text-[13px] font-medium text-zinc-500 dark:text-white/50 ml-1">
        {label}
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-2xl bg-zinc-100 dark:bg-[rgba(25,25,22,0.6)] border border-black/10 dark:border-white/[0.1] text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-orange-500/50 dark:focus:ring-[#4A9B7F]/50 transition-all"
      />
    </div>
  );
}
