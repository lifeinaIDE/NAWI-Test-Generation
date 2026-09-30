import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./hooks/useAuth";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";

import LoginPage      from "./pages/LoginPage";
import DashboardPage  from "./pages/DashboardPage";
import RepositoryPage from "./pages/RepositoryPage";
import ReviewPage     from "./pages/ReviewPage";
import RuleAdmin      from "./pages/RuleAdmin";
import WizardPage     from "./pages/WizardPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Global toast notifications (error-handling convention — 10_API_CONTRACT.md) */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: "#1e293b", color: "#f1f5f9", border: "1px solid #334155" },
            error:   { iconTheme: { primary: "#ef4444", secondary: "#fef2f2" } },
            success: { iconTheme: { primary: "#22c55e", secondary: "#f0fdf4" } },
          }}
        />

        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — all authenticated roles */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout><DashboardPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/repository"
            element={
              <ProtectedRoute>
                <AppLayout><RepositoryPage /></AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/:id"
            element={
              <ProtectedRoute>
                <AppLayout><WizardPage /></AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected — REVIEWER + ADMIN only */}
          <Route
            path="/review"
            element={
              <ProtectedRoute allowedRoles={["REVIEWER", "ADMIN"]}>
                <AppLayout><ReviewPage /></AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Protected — ADMIN only */}
          <Route
            path="/rules"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AppLayout><RuleAdmin /></AppLayout>
              </ProtectedRoute>
            }
          />

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
