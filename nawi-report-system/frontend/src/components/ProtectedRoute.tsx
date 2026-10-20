import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import type { Role } from "../types";
import NotAuthorised from "../pages/NotAuthorised";

interface Props {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

/**
 * ProtectedRoute — redirects to /login if not authenticated.
 * If allowedRoles is provided and user role does not match, renders NotAuthorised.
 */
export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Wait for auth check before deciding to redirect
  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <NotAuthorised />;
  }

  return <>{children}</>;
}
