import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation, Navigate } from "react-router-dom"; // <-- added Navigate

export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user?.role !== role) {
    const redirectPath = user.role === "admin" ? "/dashboard" : "/";
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}
