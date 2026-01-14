import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function RequireAuth({ children }) {
  const { loading, session } = useAuth();
  const loc = useLocation();

  if (loading) {
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
