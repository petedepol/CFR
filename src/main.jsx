import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";

import { router } from "./app/router.jsx";
import { AuthProvider } from "./features/auth/AuthProvider.jsx";
import { ToastProvider } from "./components/ToastProvider.jsx";

// PWA: auto-update service worker when you redeploy
import { registerSW } from "virtual:pwa-register";
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
