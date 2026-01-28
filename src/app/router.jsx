import React, { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "../components/AppShell";

import RequireAuth from "../features/auth/RequireAuth";
import LoginPage from "../features/auth/LoginPage";

// Eager-load home screens for speed
import MeasurementsHome from "../features/measurements/pages/MeasurementsHome";
import SettingsHome from "../features/settings/pages/SettingsHome";

// Lazy-load heavier pages
const QuickEntryPage = lazy(() => import("../features/measurements/pages/QuickEntryPage"));
const FullSpecPage = lazy(() => import("../features/measurements/pages/FullSpecPage"));
const HistoryPage = lazy(() => import("../features/measurements/pages/HistoryPage"));
const MtbSettingsPage = lazy(() => import("../features/settings/pages/MtbSettingsPage"));

// V3 Design Playground (standalone, no auth required for testing)
const LandingPlayground = lazy(() => import("../features/v3/LandingPlayground"));
const BikeSpecPage = lazy(() => import("../features/v3/pages/BikeSpecPage"));
const JigPage = lazy(() => import("../features/v3/pages/JigPage"));
const SetupPage = lazy(() => import("../features/v3/pages/SetupPage"));
const NeoSettingsPage = lazy(() => import("../features/v3/pages/NeoSettingsPage"));

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },

  // V3 Design Playground - standalone page for testing new UI
  {
    path: "/v3",
    element: (
      <React.Suspense fallback={<div className="min-h-screen bg-black" />}>
        <LandingPlayground />
      </React.Suspense>
    ),
  },

  // V3 Bike Spec Page
  {
    path: "/v3/spec",
    element: (
      <React.Suspense fallback={<div className="min-h-screen bg-black" />}>
        <BikeSpecPage />
      </React.Suspense>
    ),
  },

  // V3 JIG Page
  {
    path: "/v3/jig",
    element: (
      <React.Suspense fallback={<div className="min-h-screen bg-black" />}>
        <JigPage />
      </React.Suspense>
    ),
  },

  // V3 MTB Setup Page
  {
    path: "/v3/setup",
    element: (
      <React.Suspense fallback={<div className="min-h-screen bg-black" />}>
        <SetupPage />
      </React.Suspense>
    ),
  },

  // V3 Neo Settings Page (Fox Live Valve shock tunes)
  {
    path: "/v3/neo",
    element: (
      <React.Suspense fallback={<div className="min-h-screen bg-black" />}>
        <NeoSettingsPage />
      </React.Suspense>
    ),
  },

  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/settings" replace /> },

      // SETTINGS: rider picker first (prevents wrong-rider mistakes)
      { path: "settings", element: <SettingsHome /> },
      { path: "settings/mtb", element: <MtbSettingsPage /> },

      // MEASUREMENTS
      { path: "measurements", element: <MeasurementsHome /> },
      { path: "measurements/quick", element: <QuickEntryPage /> },
      { path: "measurements/full", element: <FullSpecPage /> },
      { path: "measurements/history", element: <HistoryPage /> },

      { path: "*", element: <Navigate to="/settings" replace /> },
    ],
  },
]);
