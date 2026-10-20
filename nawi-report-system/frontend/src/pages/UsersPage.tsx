import React, { useState, useEffect } from "react";
import { apiClient } from "../api/client";
import type { User } from "../types";
import SkeletonLoader from "../components/SkeletonLoader";
import ErrorBanner from "../components/ErrorBanner";
import useBackendUnreachable from "../hooks/useBackendUnreachable";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const isUnreachable = useBackendUnreachable();

  const fetchUsers = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await apiClient.get("/users");
      setUsers(res.data || []);
    } catch (err) {
      console.error("Failed to load users", err);
      setApiError("Failed to load user records from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div className="p-2 sm:p-4 space-y-6">
      {/* Dismissible API Error Banner */}
      {apiError && (
        <ErrorBanner
          message={apiError}
          onDismiss={() => setApiError(null)}
          title="User Management Notice"
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-zinc-100 tracking-tight">User Management</h1>
          <p className="text-zinc-500 mt-1 text-xs">Manage system users, laboratory roles, and access credentials.</p>
        </div>
        <button
          type="button"
          onClick={fetchUsers}
          disabled={loading}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 px-4 py-2 rounded-xl text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto cursor-pointer disabled:opacity-50"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh Users</span>
        </button>
      </div>

      {loading ? (
        <SkeletonLoader count={4} />
      ) : users.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-10 text-center space-y-3">
          <div className="text-sm font-medium text-zinc-300">No users found.</div>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Configured technician, reviewer, admin, and viewer accounts will be displayed here.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={fetchUsers}
              disabled={isUnreachable}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
            >
              Refresh List
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Laboratory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {users.map((u, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/30">
                    <td className="py-3 px-4 font-mono text-zinc-400">{u.userId || u.id || "—"}</td>
                    <td className="py-3 px-4 font-medium text-zinc-200">{u.displayName || u.username}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase bg-zinc-800 text-sky-400 border border-zinc-700">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{u.laboratory || "Central Demo Legal Metrology Laboratory"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
