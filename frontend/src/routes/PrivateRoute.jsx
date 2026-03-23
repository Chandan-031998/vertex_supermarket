import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ permission, children }) {
  const { user, loading, hasPermission, canAny } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (permission) {
    const permitted = Array.isArray(permission) ? canAny(permission) : hasPermission(permission);
    if (!permitted) {
      return <Navigate to="/" replace />;
    }
  }

  return children ?? <Outlet />;
}
