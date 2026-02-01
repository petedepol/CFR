// V3Layout.jsx - Foundation layout wrapper for V3 pages
// Shared BottomNav + RidersModal across all V3 routes

import { Suspense, useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { BottomNav } from "./components/BottomNav";
import { RidersModal } from "./components/RidersModal";
import { BikeTypePicker } from "./components/BikeTypePicker";
import { ActionPicker } from "./components/ActionPicker";

// Real CFR riders
const RIDERS = [
  { id: "ana", name: "Ana", initial: "A", image: "/riders/ana.png" },
  { id: "charlie", name: "Charlie", initial: "C", image: "/riders/charlie.png" },
  { id: "cole", name: "Cole", initial: "C", image: "/riders/cole.png" },
  { id: "luca", name: "Luca", initial: "L", image: "/riders/luca.png" },
  { id: "jolanda", name: "Jolanda", initial: "J", image: "/riders/jolanda.png" },
];

function LoadingFallback() {
  return (
    <div className="min-h-dvh bg-[#121f1e] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#e94e1b]/30 border-t-[#e94e1b] rounded-full animate-spin" />
    </div>
  );
}

export default function V3Layout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Theme state - dark mode only (light mode removed)
  const isDark = true;

  // Riders modal state
  const [isRidersModalOpen, setIsRidersModalOpen] = useState(false);

  // Riders tab flow: rider -> bike type -> action
  const [riderForBikeFlow, setRiderForBikeFlow] = useState(null);
  const [selectedBikeType, setSelectedBikeType] = useState(null);

  // Scroll to top on route change (fixes mobile scroll position after login)
  // Also close all modals to prevent hanging during swipe-back navigation
  useEffect(() => {
    window.scrollTo(0, 0);
    // Close all modals when route changes
    setIsRidersModalOpen(false);
    setRiderForBikeFlow(null);
    setSelectedBikeType(null);
  }, [location.pathname]);

  // Derive active tab from current path or modal state
  const getActiveTab = () => {
    if (isRidersModalOpen || riderForBikeFlow || selectedBikeType) return "riders";
    if (location.pathname.startsWith("/v3/spec")) return "riders";
    if (location.pathname.startsWith("/v3/jig")) return "riders";
    if (location.pathname.startsWith("/v3/service")) return "riders";
    if (location.pathname.startsWith("/v3/settings")) return "admin";
    if (location.pathname === "/v3" || location.pathname === "/v3/") return "home";
    if (location.pathname.startsWith("/v3/race")) return "race";
    if (location.pathname.startsWith("/v3/dashboard")) return "dashboard";
    return "home";
  };

  // Handle tab changes
  const handleTabChange = (tab) => {
    if (tab === "admin") {
      navigate("/v3/settings");
      return;
    }
    if (tab === "race") {
      navigate("/v3/race");
      return;
    }
    if (tab === "dashboard") {
      navigate("/v3/dashboard");
      return;
    }
    if (tab === "riders") {
      setIsRidersModalOpen(true);
      return;
    }
    if (tab === "home") {
      navigate("/v3");
      return;
    }
  };

  // Riders tab flow handlers
  const handleRiderForBikeFlow = (rider) => {
    setIsRidersModalOpen(false);
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
    } else if (action === "service") {
      navigate(`/v3/service?rider=${encodeURIComponent(riderForBikeFlow?.name)}&bike=${selectedBikeType}`);
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

  const handleCloseRidersModal = () => {
    setIsRidersModalOpen(false);
  };

  return (
    <div className="min-h-dvh">
      {/* Main content with bottom padding for nav */}
      <Suspense fallback={<LoadingFallback />}>
        <Outlet context={{ onNavTabChange: handleTabChange, isDark }} />
      </Suspense>

      {/* Global Modals */}
      <RidersModal
        riders={RIDERS}
        isOpen={isRidersModalOpen}
        onClose={handleCloseRidersModal}
        onSelectRider={handleRiderForBikeFlow}
        theme={isDark ? "dark" : "light"}
      />

      <BikeTypePicker
        rider={riderForBikeFlow}
        isOpen={!!riderForBikeFlow}
        onClose={handleCloseBikeTypePicker}
        onSelectBike={handleSelectBikeType}
        theme={isDark ? "dark" : "light"}
      />

      <ActionPicker
        rider={riderForBikeFlow}
        bikeType={selectedBikeType}
        isOpen={!!selectedBikeType}
        onClose={handleCloseActionPicker}
        onSelectAction={handleSelectAction}
        theme={isDark ? "dark" : "light"}
      />

      {/* Bottom Navigation disabled - using inline nav in LandingPlayground for dark theme testing */}
      {/* {(location.pathname === "/v3" || location.pathname === "/v3/") && (
        <BottomNav activeTab={getActiveTab()} onTabChange={handleTabChange} />
      )} */}
    </div>
  );
}
