import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user?.passwordChangeRequired && location.pathname !== "/admin/restablecer-contrasena") {
    return <Navigate to="/admin/restablecer-contrasena" replace />;
  }

  return children;
}
