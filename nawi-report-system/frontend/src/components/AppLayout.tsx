import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const navItems = [
  { to: "/dashboard",   label: "Dashboard",   roles: ["TECHNICIAN","REVIEWER","ADMIN","VIEWER"] },
  { to: "/repository",  label: "Repository",  roles: ["TECHNICIAN","REVIEWER","ADMIN","VIEWER"] },
  { to: "/review",      label: "Review Queue", roles: ["REVIEWER","ADMIN"] },
  { to: "/rules",       label: "Rules",        roles: ["ADMIN"] },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const visible = navItems.filter((n) => user && n.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col text-zinc-100 font-sans selection:bg-zinc-800">
      
      {/* Disclaimer banner (Minimalist) */}
      <div className="bg-zinc-900 border-b border-zinc-800/60 px-6 py-1.5 flex justify-center text-[10px] uppercase tracking-wider text-zinc-500 font-medium">
        <span>⚠️ Prototype Evaluation Mode · Not for Legal Certification</span>
      </div>

      {/* Main layout container */}
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
        
        {/* Floating Header */}
        <header className="sticky top-0 z-50 py-6 px-6 sm:px-8 flex items-center justify-between bg-zinc-950/80 backdrop-blur-md">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-zinc-100 rounded-full flex items-center justify-center">
                 <svg className="w-3.5 h-3.5 text-zinc-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
                 </svg>
              </div>
              <span className="font-semibold tracking-tight text-zinc-100 text-sm">NAWI System</span>
            </div>
            
            <nav className="hidden md:flex gap-1 bg-zinc-900/50 p-1 rounded-full border border-zinc-800">
              {visible.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    `px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isActive
                        ? "bg-zinc-100 text-zinc-950 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-zinc-200 leading-none">{user?.username}</span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">{user?.role}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-zinc-400 hover:text-zinc-100 p-2 transition-colors rounded-full hover:bg-zinc-900"
              title="Sign out"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 w-full px-6 sm:px-8 py-4 overflow-auto">
          {children}
        </main>
        
        {/* Mandatory Footer Disclaimer */}
        <footer className="mt-auto py-6 px-6 sm:px-8 text-center text-xs text-zinc-500 border-t border-zinc-800/40">
          Preliminary automated evaluation based on the configured OIML R-76 rule-set. Final acceptance remains subject to review and authorization by competent legal-metrology personnel.
        </footer>
      </div>

    </div>
  );
}
