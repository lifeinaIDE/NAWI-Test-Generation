import React from "react";
import { render, screen } from "@testing-library/react";
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import ProtectedRoute from "../components/ProtectedRoute";
import { tokenStore } from "../api/client";
import type { User, Role } from "../types";

// Mock useAuth
const mockUser = vi.fn<() => User | null>();
const mockIsAuthenticated = vi.fn<() => boolean>();
const mockLogout = vi.fn();

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: mockUser(),
    token: mockUser() ? "mock-token" : null,
    decodedUser: mockUser() ? { sub: mockUser()!.id || "user-1", role: mockUser()!.role, name: mockUser()!.username } : null,
    isAuthenticated: mockIsAuthenticated(),
    isLoading: false,
    login: vi.fn(),
    logout: mockLogout,
  }),
}));

describe("Phase 2 — In-Memory Token Store", () => {
  beforeEach(() => {
    localStorage.clear();
    tokenStore.clear();
  });

  it("stores token in memory only and never writes to localStorage", () => {
    tokenStore.set("test-jwt-token-12345");
    expect(tokenStore.get()).toBe("test-jwt-token-12345");
    expect(localStorage.getItem("nawi_jwt_token")).toBeNull();
    expect(localStorage.getItem("nawi_auth_token")).toBeNull();

    tokenStore.clear();
    expect(tokenStore.get()).toBeNull();
  });
});

describe("Phase 2 — Role-Specific Sidebar & Top Bar", () => {
  it("renders TECHNICIAN sidebar: Dashboard, New Report, My Reports, Repository", () => {
    mockUser.mockReturnValue({
      id: "user-tech-01",
      userId: "user-tech-01",
      username: "technician",
      displayName: "T. Technician",
      role: "TECHNICIAN",
      active: true,
      laboratory: "Central Metrology Lab",
    });
    mockIsAuthenticated.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppLayout><div>Page Content</div></AppLayout>
      </MemoryRouter>
    );

    // Sidebar items
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("New Report")).toBeDefined();
    expect(screen.getByText("My Reports")).toBeDefined();
    expect(screen.getByText("Repository")).toBeDefined();

    // Must NOT have Review Queue, Rule Admin, Audit Log, User Management
    expect(screen.queryByText("Review Queue")).toBeNull();
    expect(screen.queryByText("Rule Admin")).toBeNull();
    expect(screen.queryByText("Audit Log")).toBeNull();
    expect(screen.queryByText("User Management")).toBeNull();

    // Top Bar shows user name and role badge
    expect(screen.getAllByText("T. Technician").length).toBeGreaterThan(0);
    expect(screen.getAllByText("TECHNICIAN").length).toBeGreaterThan(0);
    expect(screen.getByText("Logout")).toBeDefined();
  });

  it("renders REVIEWER sidebar: Dashboard, Review Queue, Repository", () => {
    mockUser.mockReturnValue({
      id: "user-rev-01",
      userId: "user-rev-01",
      username: "reviewer",
      displayName: "R. Reviewer",
      role: "REVIEWER",
      active: true,
      laboratory: "Central Metrology Lab",
    });
    mockIsAuthenticated.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppLayout><div>Page Content</div></AppLayout>
      </MemoryRouter>
    );

    // Sidebar items
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Review Queue")).toBeDefined();
    expect(screen.getByText("Repository")).toBeDefined();

    // Must NOT have New Report, My Reports, Rule Admin, Audit Log, User Management
    expect(screen.queryByText("New Report")).toBeNull();
    expect(screen.queryByText("My Reports")).toBeNull();
    expect(screen.queryByText("Rule Admin")).toBeNull();
    expect(screen.queryByText("Audit Log")).toBeNull();
    expect(screen.queryByText("User Management")).toBeNull();

    // Top Bar
    expect(screen.getAllByText("R. Reviewer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("REVIEWER").length).toBeGreaterThan(0);
  });

  it("renders ADMIN sidebar: Dashboard, New Report, Review Queue, Repository, Rule Admin, Audit Log, User Management", () => {
    mockUser.mockReturnValue({
      id: "user-admin-01",
      userId: "user-admin-01",
      username: "admin",
      displayName: "A. Administrator",
      role: "ADMIN",
      active: true,
      laboratory: "Central Metrology Lab",
    });
    mockIsAuthenticated.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppLayout><div>Page Content</div></AppLayout>
      </MemoryRouter>
    );

    // Sidebar items
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("New Report")).toBeDefined();
    expect(screen.getByText("Review Queue")).toBeDefined();
    expect(screen.getByText("Repository")).toBeDefined();
    expect(screen.getByText("Rule Admin")).toBeDefined();
    expect(screen.getByText("Audit Log")).toBeDefined();
    expect(screen.getByText("User Management")).toBeDefined();

    // Top Bar
    expect(screen.getAllByText("A. Administrator").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ADMIN").length).toBeGreaterThan(0);
  });

  it("renders VIEWER sidebar: Dashboard, Repository", () => {
    mockUser.mockReturnValue({
      id: "user-view-01",
      userId: "user-view-01",
      username: "viewer",
      displayName: "V. Viewer",
      role: "VIEWER",
      active: true,
      laboratory: "Central Metrology Lab",
    });
    mockIsAuthenticated.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AppLayout><div>Page Content</div></AppLayout>
      </MemoryRouter>
    );

    // Sidebar items
    expect(screen.getByText("Dashboard")).toBeDefined();
    expect(screen.getByText("Repository")).toBeDefined();

    // Must NOT have others
    expect(screen.queryByText("New Report")).toBeNull();
    expect(screen.queryByText("My Reports")).toBeNull();
    expect(screen.queryByText("Review Queue")).toBeNull();
    expect(screen.queryByText("Rule Admin")).toBeNull();
    expect(screen.queryByText("Audit Log")).toBeNull();
    expect(screen.queryByText("User Management")).toBeNull();

    // Top Bar
    expect(screen.getAllByText("V. Viewer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("VIEWER").length).toBeGreaterThan(0);
  });
});

describe("Phase 2 — ProtectedRoute Role Gating", () => {
  it("renders NotAuthorised when user role is not in allowedRoles", () => {
    mockUser.mockReturnValue({
      id: "user-tech-01",
      userId: "user-tech-01",
      username: "technician",
      displayName: "T. Technician",
      role: "TECHNICIAN",
      active: true,
      laboratory: "Central Metrology Lab",
    });
    mockIsAuthenticated.mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={["/rules"]}>
        <Routes>
          <Route
            path="/rules"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <div>Secret Admin Rules</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Access Restricted")).toBeDefined();
    expect(screen.queryByText("Secret Admin Rules")).toBeNull();
  });

  it("redirects unauthenticated user to /login", () => {
    mockUser.mockReturnValue(null);
    mockIsAuthenticated.mockReturnValue(false);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route
            path="/login"
            element={<div>Login Screen</div>}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Protected Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Login Screen")).toBeDefined();
    expect(screen.queryByText("Protected Dashboard")).toBeNull();
  });
});
