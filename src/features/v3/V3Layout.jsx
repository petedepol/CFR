// V3Layout.jsx - Foundation layout wrapper for V3 pages
// Shared BottomNav + RidersModal across all V3 routes

import { Suspense, useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { BottomNav } from "./components/BottomNav";
import { RidersModal } from "./components/RidersModal";
import { BikeTypePicker } from "./components/BikeTypePicker";
import { ActionPicker } from "./components/ActionPicker";
import { useAuth } from "../auth/AuthProvider.jsx";

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
    <div className="min-h-dvh bg-brand-green-lo flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
    </div>
  );
}

export default function V3Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isRider } = useAuth();

  // Theme state - dark mode only (light mode removed)
  const isDark = true;

  // Redirect riders to their dedicated portal
  useEffect(() => {
    if (isRider && location.pathname !== "/v3/rider") {
      navigate("/v3/rider", { replace: true });
    }
  }, [isRider, location.pathname, navigate]);

  // Modal open/close state (separate from data so vaul can animate close)
  const [isRidersModalOpen, setIsRidersModalOpen] = useState(false);
  const [isBikePickerOpen, setIsBikePickerOpen] = useState(false);
  const [isActionPickerOpen, setIsActionPickerOpen] = useState(false);

  // Riders tab flow data: rider -> bike type -> action
  const [riderForBikeFlow, setRiderForBikeFlow] = useState(null);
  const [selectedBikeType, setSelectedBikeType] = useState(null);

  // Scroll to top on route change (fixes mobile scroll position after login)
  // Also close all modals to prevent hanging during swipe-back navigation
  useEffect(() => {
    window.scrollTo(0, 0);
    // Close all modals when route changes
    setIsRidersModalOpen(false);
    setIsBikePickerOpen(false);
    setIsActionPickerOpen(false);
    setRiderForBikeFlow(null);
    setSelectedBikeType(null);
    // Remove navigating class after route change completes
    document.body.classList.remove('navigating-back');
  }, [location.pathname]);

  // Instantly hide modals on iOS swipe-back gesture via CSS
  useEffect(() => {
    const hideModals = () => {
      // Add class immediately to hide modals via CSS (faster than React state)
      document.body.classList.add('navigating-back');
      // Also close modal state
      setIsRidersModalOpen(false);
      setIsBikePickerOpen(false);
      setIsActionPickerOpen(false);
      setRiderForBikeFlow(null);
      setSelectedBikeType(null);
    };

    // Try multiple events to catch iOS swipe-back as early as possible
    const handlePopState = () => hideModals();
    const handlePageHide = () => hideModals();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') hideModals();
    };

    // iOS swipe-back starts from left edge - hide modals on edge touch
    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      // If touch starts within 20px of left edge, likely a swipe-back gesture
      if (touch && touch.clientX < 20) {
        hideModals();
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  // Derive active tab from current path or modal state
  const getActiveTab = () => {
    if (isRidersModalOpen || isBikePickerOpen || isActionPickerOpen) return "riders";
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
    // Clear any stale swipe-back CSS hiding class before opening modals
    document.body.classList.remove('navigating-back');
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
    setIsBikePickerOpen(true);
  };

  const handleSelectBikeType = (bikeType) => {
    setSelectedBikeType(bikeType);
    setIsActionPickerOpen(true);
  };

  const handleSelectAction = (action) => {
    if (action === "spec") {
      navigate(`/v3/spec?rider=${encodeURIComponent(riderForBikeFlow?.name)}&bike=${selectedBikeType}`);
    } else if (action === "jig") {
      navigate(`/v3/jig?rider=${encodeURIComponent(riderForBikeFlow?.name)}&bike=${selectedBikeType}`);
    } else if (action === "service") {
      navigate(`/v3/service?rider=${encodeURIComponent(riderForBikeFlow?.name)}&bike=${selectedBikeType}`);
    }

    // Close drawers first, then clear data after animation
    setIsActionPickerOpen(false);
    setIsBikePickerOpen(false);
    setTimeout(() => {
      setSelectedBikeType(null);
      setRiderForBikeFlow(null);
    }, 300);
  };

  const handleCloseBikeTypePicker = () => {
    setIsBikePickerOpen(false);
    // Clear data after vaul close animation completes
    setTimeout(() => setRiderForBikeFlow(null), 300);
  };

  const handleCloseActionPicker = () => {
    setIsActionPickerOpen(false);
    // Clear data after vaul close animation completes
    setTimeout(() => setSelectedBikeType(null), 300);
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

      {/* Global Modals - hidden for riders (they use the portal) */}
      {!isRider && (
        <>
          <RidersModal
            riders={RIDERS}
            isOpen={isRidersModalOpen}
            onClose={handleCloseRidersModal}
            onSelectRider={handleRiderForBikeFlow}
            theme={isDark ? "dark" : "light"}
          />

          <BikeTypePicker
            rider={riderForBikeFlow}
            isOpen={isBikePickerOpen}
            onClose={handleCloseBikeTypePicker}
            onSelectBike={handleSelectBikeType}
            theme={isDark ? "dark" : "light"}
          />

          <ActionPicker
            rider={riderForBikeFlow}
            bikeType={selectedBikeType}
            isOpen={isActionPickerOpen}
            onClose={handleCloseActionPicker}
            onSelectAction={handleSelectAction}
            theme={isDark ? "dark" : "light"}
          />
        </>
      )}

      {/* Glass dock navigation - only on landing page, hidden for riders */}
      {!isRider && (location.pathname === "/v3" || location.pathname === "/v3/") && (
        <BottomNav activeTab={getActiveTab()} onTabChange={handleTabChange} />
      )}
    </div>
  );
}
