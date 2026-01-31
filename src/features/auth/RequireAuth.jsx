import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function RequireAuth({ children }) {
  const auth = useAuth();
  const loc = useLocation();

  // Support both naming styles (older code used loading, new AuthProvider uses booting)
  const isLoading = Boolean(auth.booting ?? auth.loading);
  const session = auth.session ?? null;

  if (isLoading) {
    return (
      <div
        className="min-h-dvh flex items-center justify-center text-[#888888]"
        style={{ background: "radial-gradient(ellipse at 50% 30%, #1a1a1a 0%, #0d0d0d 70%)" }}
      >
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  }

  return children;
}
