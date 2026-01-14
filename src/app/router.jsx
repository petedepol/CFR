import React from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import AppShell from "../components/AppShell";

import RequireAuth from "../features/auth/RequireAuth";
import LoginPage from "../features/auth/LoginPage";

import MeasurementsHome from "../features/measurements/pages/MeasurementsHome";
import QuickEntryPage from "../features/measurements/pages/QuickEntryPage";
import FullSpecPage from "../features/measurements/pages/FullSpecPage";
import HistoryPage from "../features/measurements/pages/HistoryPage";

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
      { index: true, element: <Navigate to="/measurements" replace /> },
      { path: "measurements", element: <MeasurementsHome /> },
      { path: "measurements/quick", element: <QuickEntryPage /> },
      { path: "measurements/full", element: <FullSpecPage /> },
      { path: "measurements/history", element: <HistoryPage /> },
      { path: "*", element: <Navigate to="/measurements" replace /> },
    ],
  },
]);
