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
      <div className="min-h-[60vh] flex items-center justify-center text-white/70">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  }

  return children;
}
