import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import DisclaimerFooter from "../components/DisclaimerFooter";

export default function NotAuthorised() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-zinc-100">
      <div className="max-w-md w-full bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 text-center space-y-6 backdrop-blur-md">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-light tracking-tight text-zinc-100">Access Restricted</h1>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            You don't have permission to perform this action.
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Current role: {user?.role ? <span className="font-semibold text-amber-400">{user.role}</span> : "Guest"}
          </p>
        </div>

        <div className="pt-2">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-full text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 transition-all shadow-sm cursor-pointer"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
      <div className="absolute bottom-4 left-0 right-0 px-6">
        <DisclaimerFooter />
      </div>
    </div>
  );
}
