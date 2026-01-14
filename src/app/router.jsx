import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "../components/AppShell";

import RequireAuth from "../features/auth/RequireAuth";
import LoginPage from "../features/auth/LoginPage";

import MeasurementsHome from "../features/measurements/pages/MeasurementsHome";
import QuickEntryPage from "../features/measurements/pages/QuickEntryPage";
import FullSpecPage from "../features/measurements/pages/FullSpecPage";
import HistoryPage from "../features/measurements/pages/HistoryPage";

import SettingsHome from "../features/settings/pages/SettingsHome";
import MtbSettingsPage from "../features/settings/pages/MtbSettingsPage";

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
      // ✅ Default module: Settings
      { index: true, element: <Navigate to="/settings" replace /> },

      // Settings (MTB only)
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
