// src/features/v3/LandingPlayground.jsx
// V3 Landing Page - 2026 CFR Race Frame Design (Dark Only)

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Toaster } from "sonner";

import { Avatar } from "./components/Avatar.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { RidersModal } from "./components/RidersModal.jsx";
import { BikeTypePicker } from "./components/BikeTypePicker.jsx";
import { ActionPicker } from "./components/ActionPicker.jsx";

// Real CFR riders
const RIDERS = [
  { id: "ana", name: "Ana", initial: "A", image: "/riders/ana.png" },
  { id: "charlie", name: "Charlie", initial: "C", image: "/riders/charlie.png" },
  { id: "cole", name: "Cole", initial: "C", image: "/riders/cole.png" },
  { id: "luca", name: "Luca", initial: "L", image: "/riders/luca.png" },
  { id: "jolanda", name: "Jolanda", initial: "J", image: "/riders/jolanda.png" },
];

// CFR Foundation Colors (from docs/design/tokens.css)
const CFR = {
  bgPrimary: '#132823',
  bgSurface: '#1F3D36',
  bgElevated: '#2A4B43',
  brandOrange: '#D24A1F',
  brandOrangeHi: '#E56A3A',
  textPrimary: '#F4F6F5',
  textSecondary: '#B8C2BE',
  textMuted: '#8A9A94',
};

export default function LandingPlayground() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [isRidersListOpen, setIsRidersListOpen] = useState(false);

  // Riders tab flow: rider -> bike type -> action
  const [riderForBikeFlow, setRiderForBikeFlow] = useState(null);
  const [selectedBikeType, setSelectedBikeType] = useState(null);

  // Handle tab changes
  const handleTabChange = (tab) => {
    if (tab === "dashboard") {
      navigate("/v3/dashboard");
      return;
    }
    if (tab === "riders") {
      setIsRidersListOpen(true);
      return;
    }
    setActiveTab(tab);
  };

  // Riders tab flow handlers
  const handleRiderForBikeFlow = (rider) => {
    setIsRidersListOpen(false);
    setRiderForBikeFlow(rider);
  };

  const handleSelectBikeType = (bikeType) => {
    setSelectedBikeType(bikeType);
  };

  const handleSelectAction = (action) => {
    if (action === "spec") {
      navigate(`/v3/spec?rider=${encodeURIComponent(riderForBikeFlow?.name)}&bike=${selectedBikeType}`);
    } else if (action === "jig") {
      navigate(`/v3/jig?rider=${encodeURIComponent(riderForBikeFlow?.name)}&bike=${selectedBikeType}`);
    }

    // Reset the flow
    setSelectedBikeType(null);
    setRiderForBikeFlow(null);
  };

  const handleCloseBikeTypePicker = () => {
    setRiderForBikeFlow(null);
  };

  const handleCloseActionPicker = () => {
    setSelectedBikeType(null);
  };

  return (
    <div className="min-h-screen font-sans selection:bg-brand-orange/30">
      <Toaster position="top-center" />

      {/* Main Content Area */}
      <main className="max-w-lg mx-auto px-6 pt-16 pb-32 min-h-screen flex flex-col">
        {/* Logo Header */}
        <section className="flex flex-col items-center pt-8 pb-6 mb-16">
          <motion.img
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            src="/logos/cfr-logo-light.png"
            alt="Cannondale Factory Racing"
            className="h-14 w-auto"
          />
        </section>

        {/* Rider Grid - Pyramid Layout */}
        <div className="flex-1 flex flex-col items-center">
          {/* Top row - 3 riders */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center gap-6 mb-10"
          >
            {RIDERS.slice(0, 3).map((rider, index) => (
              <motion.div
                key={rider.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index + 0.4 }}
              >
                <Avatar
                  name={rider.name}
                  initial={rider.initial}
                  image={rider.image}
                  onClick={() => navigate(`/v3/setup?rider=${encodeURIComponent(rider.name)}`)}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom row - 2 riders, centered */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center gap-6 mb-12"
          >
            {RIDERS.slice(3).map((rider, index) => (
              <motion.div
                key={rider.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * index + 0.7 }}
              >
                <Avatar
                  name={rider.name}
                  initial={rider.initial}
                  image={rider.image}
                  onClick={() => navigate(`/v3/setup?rider=${encodeURIComponent(rider.name)}`)}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* Instruction text */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 1 }}
            className="text-center"
          >
            <p className="text-[10px] uppercase font-semibold tracking-[0.3em] text-text-muted">
              Tap Rider &rarr; MTB Setup
            </p>
          </motion.div>
        </div>
      </main>

      {/* Modals */}
      <RidersModal
        riders={RIDERS}
        isOpen={isRidersListOpen}
        onClose={() => setIsRidersListOpen(false)}
        onSelectRider={handleRiderForBikeFlow}
      />

      <BikeTypePicker
        rider={riderForBikeFlow}
        isOpen={!!riderForBikeFlow}
        onClose={handleCloseBikeTypePicker}
        onSelectBike={handleSelectBikeType}
      />

      <ActionPicker
        rider={riderForBikeFlow}
        bikeType={selectedBikeType}
        isOpen={!!selectedBikeType}
        onClose={handleCloseActionPicker}
        onSelectAction={handleSelectAction}
      />

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
