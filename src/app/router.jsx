import React, { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import RequireAuth from "../features/auth/RequireAuth";
import LoginPage from "../features/auth/LoginPage";

// V3 Pages (main app)
import V3Layout from "../features/v3/V3Layout";
const LandingPlayground = lazy(() => import("../features/v3/LandingPlayground"));
const BikeSpecPage = lazy(() => import("../features/v3/pages/BikeSpecPage"));
const JigPage = lazy(() => import("../features/v3/pages/JigPage"));
const SetupPage = lazy(() => import("../features/v3/pages/SetupPage"));
const NeoSettingsPage = lazy(() => import("../features/v3/pages/NeoSettingsPage"));
const RaceDashboardPage = lazy(() => import("../features/v3/pages/RaceDashboardPage"));
const ServicePage = lazy(() => import("../features/v3/pages/ServicePage"));
const DashboardPage = lazy(() => import("../features/dashboard/pages/DashboardPage"));
const SettingsPage = lazy(() => import("../features/v3/pages/SettingsPage"));

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },

  // Root redirects to /v3
  { path: "/", element: <Navigate to="/v3" replace /> },

  // V3 - All pages require auth
  {
    path: "/v3",
    element: (
      <RequireAuth>
        <V3Layout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <LandingPlayground /> },
      { path: "spec", element: <BikeSpecPage /> },
      { path: "jig", element: <JigPage /> },
      { path: "setup", element: <SetupPage /> },
      { path: "neo", element: <NeoSettingsPage /> },
      { path: "race", element: <RaceDashboardPage /> },
      { path: "service", element: <ServicePage /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },

  // Catch-all redirect to /v3
  { path: "*", element: <Navigate to="/v3" replace /> },
]);
