import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { connectionState } from "../api/client";
import DisclaimerFooter from "./DisclaimerFooter";
import type { Role } from "../types";

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
  icon: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    roles: ["TECHNICIAN", "REVIEWER", "ADMIN", "VIEWER"],
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    to: "/reports/new",
    label: "New Report",
    roles: ["TECHNICIAN", "ADMIN"],
    icon: "M12 4v16m8-8H4",
  },
  {
    to: "/repository?my=true",
    label: "My Reports",
    roles: ["TECHNICIAN"],
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  },
  {
    to: "/review",
    label: "Review Queue",
    roles: ["REVIEWER", "ADMIN"],
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  {
    to: "/repository",
    label: "Repository",
    roles: ["TECHNICIAN", "REVIEWER", "ADMIN", "VIEWER"],
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  },
  {
    to: "/rules",
    label: "Rule Admin",
    roles: ["ADMIN"],
    icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
  },
  {
    to: "/audit",
    label: "Audit Log",
    roles: ["ADMIN"],
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  },
  {
    to: "/users",
    label: "User Management",
    roles: ["ADMIN"],
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  },
];

function getRoleBadgeStyle(role?: string) {
  switch (role) {
    case "TECHNICIAN":
      return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    case "REVIEWER":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "ADMIN":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "VIEWER":
      return "bg-zinc-800 text-zinc-400 border-zinc-700";
    default:
      return "bg-zinc-800 text-zinc-400 border-zinc-700";
  }
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isUnreachable, setIsUnreachable] = useState(connectionState.isBackendUnreachable);

  useEffect(() => {
    return connectionState.subscribe(setIsUnreachable);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // Filter navigation items strictly based on role
  const visibleNav = ALL_NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100 font-sans selection:bg-zinc-800">
      {/* Backend unreachable global alert banner */}
      {isUnreachable && (
        <div
          data-testid="backend-unreachable-banner"
          className="bg-rose-900/90 text-rose-100 px-4 py-2 text-center text-xs font-medium sticky top-0 z-50 flex items-center justify-center gap-2 shadow-md"
        >
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
          Backend unreachable — service is unavailable on port 8000. Reconnecting... (Mutating actions disabled)
        </div>
      )}

      {/* Top Banner Notice */}
      <div className="bg-zinc-900/90 border-b border-zinc-800/60 px-6 py-1.5 flex justify-center text-[10px] uppercase tracking-widest text-zinc-400 font-medium">
        <span>OIML R-76 NAWI Calibration & Verification Platform · Legal Metrology</span>
      </div>

      <div className="flex-1 flex w-full">
        {/* Role-Specific Sidebar */}
        <aside className="w-64 border-r border-zinc-800/60 p-6 flex flex-col justify-between hidden md:flex shrink-0 bg-zinc-950">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-100 rounded-xl flex items-center justify-center shadow-md">
                <svg className="w-4 h-4 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <div>
                <span className="font-semibold text-sm tracking-tight text-zinc-100 block">NAWI System</span>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">OIML R-76 Platform</span>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="space-y-1">
              {visibleNav.map((n) => {
                const isActive = n.to.includes("?")
                  ? location.pathname + location.search === n.to
                  : location.pathname === n.to || (n.to !== "/dashboard" && location.pathname.startsWith(n.to));

                return (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? "bg-zinc-800/90 text-zinc-100 shadow-sm border border-zinc-700/60"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                    }`}
                  >
                    <svg className="w-4 h-4 shrink-0 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={n.icon} />
                    </svg>
                    {n.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* User profile card in sidebar */}
          {user && (
            <div className="pt-4 border-t border-zinc-800/60">
              <div className="flex items-center justify-between">
                <div className="overflow-hidden pr-2">
                  <p className="text-xs font-medium text-zinc-200 truncate">{user.displayName || user.username}</p>
                  <span className={`inline-block text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border mt-1 ${getRoleBadgeStyle(user.role)}`}>
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Content area with Top Bar */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar showing user name, role badge, and logout */}
          <header className="h-16 border-b border-zinc-800/60 px-6 sm:px-8 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Workspace /</span>
              <span className="text-xs font-medium text-zinc-200 capitalize">
                {location.pathname.replace("/", "") || "Dashboard"}
              </span>
            </div>

            {/* Top Bar user info + role badge + logout button */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-medium text-zinc-100">
                    {user?.displayName || user?.username || "Authenticated User"}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {user?.laboratory || "Central Legal Metrology Laboratory"}
                  </div>
                </div>

                {user && (
                  <span
                    className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                      user.role
                    )}`}
                  >
                    {user.role}
                  </span>
                )}
              </div>

              <div className="h-5 w-px bg-zinc-800" />

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Sign out of NAWI system"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.75}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </header>

          {/* Main content body */}
          <main className="flex-1 p-6 sm:p-10 flex flex-col">
            <div className="flex-1">{children}</div>
            <DisclaimerFooter />
          </main>
        </div>
      </div>
    </div>
  );
}
