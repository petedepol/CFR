import React, { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import RequireAuth from "../features/auth/RequireAuth";
import LoginPage from "../features/auth/LoginPage";

// V3 Pages (main app) - lazy loaded with preload capability
import V3Layout from "../features/v3/V3Layout";

// Create lazy components with preload functions
const lazyWithPreload = (importFn) => {
  const Component = lazy(importFn);
  Component.preload = importFn;
  return Component;
};

const LandingPlayground = lazyWithPreload(() => import("../features/v3/LandingPlayground"));
const BikeSpecPage = lazyWithPreload(() => import("../features/v3/pages/BikeSpecPage"));
const JigPage = lazyWithPreload(() => import("../features/v3/pages/JigPage"));
const SetupPage = lazyWithPreload(() => import("../features/v3/pages/SetupPage"));
const NeoSettingsPage = lazyWithPreload(() => import("../features/v3/pages/NeoSettingsPage"));
const RaceDashboardPage = lazyWithPreload(() => import("../features/v3/pages/RaceDashboardPage"));
const ServicePage = lazyWithPreload(() => import("../features/v3/pages/ServicePage"));
const DashboardPage = lazyWithPreload(() => import("../features/dashboard/pages/DashboardPage"));
const SettingsPage = lazyWithPreload(() => import("../features/v3/pages/SettingsPage"));

// Preload critical routes after initial render
export function preloadRoutes() {
  // Preload main pages in priority order
  const criticalRoutes = [
    LandingPlayground,
    JigPage,
    BikeSpecPage,
    ServicePage,
    SettingsPage,
  ];

  // Use requestIdleCallback for non-blocking preload
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => {
      criticalRoutes.forEach(route => route.preload?.());
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      criticalRoutes.forEach(route => route.preload?.());
    }, 1000);
  }
}

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
