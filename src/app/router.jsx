import React, { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "../components/AppShell";

import RequireAuth from "../features/auth/RequireAuth";
import LoginPage from "../features/auth/LoginPage";

// Eager-load the home screens for fastest first paint
import MeasurementsHome from "../features/measurements/pages/MeasurementsHome";
import SettingsHome from "../features/settings/pages/SettingsHome";

// Lazy-load heavier/less frequent pages
const QuickEntryPage = lazy(() => import("../features/measurements/pages/QuickEntryPage"));
const FullSpecPage = lazy(() => import("../features/measurements/pages/FullSpecPage"));
const HistoryPage = lazy(() => import("../features/measurements/pages/HistoryPage"));
const MtbSettingsPage = lazy(() => import("../features/settings/pages/MtbSettingsPage"));

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },

  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/settings" replace /> },

      // Settings
      { path: "settings", element: <SettingsHome /> },
      { path: "settings/mtb", element: <MtbSettingsPage /> },

      // Measurements
      { path: "measurements", element: <MeasurementsHome /> },
      { path: "measurements/quick", element: <QuickEntryPage /> },
      { path: "measurements/full", element: <FullSpecPage /> },
      { path: "measurements/history", element: <HistoryPage /> },

      { path: "*", element: <Navigate to="/settings" replace /> },
    ],
  },
]);
