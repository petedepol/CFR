// src/features/v3/LandingPlayground.jsx
// V3 Landing Page - Figma Design (Light First, Minimal)

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Toaster, toast } from "sonner";
import { Sun, Moon } from "lucide-react";

import { Avatar } from "./components/Avatar.jsx";
import { BottomNav } from "./components/BottomNav.jsx";
import { RidersModal } from "./components/RidersModal.jsx";
import { BikeTypePicker } from "./components/BikeTypePicker.jsx";
import { ActionPicker } from "./components/ActionPicker.jsx";

// Real CFR riders - will be replaced with Supabase data
const RIDERS = [
  { id: "ana", name: "Ana", initial: "A", image: "/riders/ana.jpeg" },
  { id: "charlie", name: "Charlie", initial: "C", image: "/riders/charlie.jpeg" },
  { id: "cole", name: "Cole", initial: "C", image: "/riders/cole.jpeg" },
  { id: "luca", name: "Luca", initial: "L", image: "/riders/luca.jpeg" },
  { id: "jolanda", name: "Jolanda", initial: "J", image: "/riders/jolanda.jpeg" },
];

export default function LandingPlayground() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [isRidersListOpen, setIsRidersListOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Riders tab flow: rider -> bike type -> action
  const [riderForBikeFlow, setRiderForBikeFlow] = useState(null);
  const [selectedBikeType, setSelectedBikeType] = useState(null);

  // Load saved theme preference
  useEffect(() => {
    const saved = localStorage.getItem("cfr_theme");
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    }
  }, []);

  // Toggle theme
  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("cfr_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("cfr_theme", "light");
    }
  };

  // Handle tab changes
  const handleTabChange = (tab) => {
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
      // Navigate to V3 Bike Spec page with direct bike type
      navigate(`/v3/spec?rider=${encodeURIComponent(riderForBikeFlow?.name)}&bike=${selectedBikeType}`);
    } else if (action === "jig") {
      // Navigate to V3 JIG page with rider and bike type
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
    <div
      className="min-h-screen text-foreground font-sans selection:bg-orange-500/30"
      style={{ background: 'var(--background-gradient, var(--background))' }}
    >
      <Toaster position="top-center" />

      {/* Theme Toggle - Top Right */}
      <button
        onClick={toggleTheme}
        className="fixed top-6 right-6 z-50 p-3 rounded-full bg-foreground/5 border border-foreground/10 text-foreground/60 hover:bg-foreground/10 active:scale-95 transition-all"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* Main Content Area */}
      <main className="max-w-lg mx-auto px-6 pt-16 pb-32 min-h-screen flex flex-col">
        {/* Logo Header */}
        <section className="flex flex-col items-center pt-8 pb-6 mb-16">
          <motion.img
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            src={isDark ? "/logos/cfr-logo-light.png" : "/logos/cfr-logo-dark.png"}
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
            animate={{ opacity: 0.4 }}
            transition={{ delay: 1 }}
            className="text-center"
          >
            <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-foreground/40">
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
