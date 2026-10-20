import React, { useState, useEffect } from "react";
import { apiClient } from "../api/client";
import type { AuditEvent } from "../types";
import SkeletonLoader from "../components/SkeletonLoader";
import ErrorBanner from "../components/ErrorBanner";
import useBackendUnreachable from "../hooks/useBackendUnreachable";

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const isUnreachable = useBackendUnreachable();

  const fetchAudit = async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await apiClient.get("/audit");
      setEvents(res.data.events || []);
    } catch (err) {
      console.error("Failed to load audit events", err);
      setApiError("Failed to load audit events from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  return (
    <div className="p-2 sm:p-4 space-y-6">
      {/* Dismissible API Error Banner */}
      {apiError && (
        <ErrorBanner
          message={apiError}
          onDismiss={() => setApiError(null)}
          title="Audit Log Notice"
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-zinc-100 tracking-tight">Audit Log</h1>
          <p className="text-zinc-500 mt-1 text-xs">Immutable legal metrology trail of all report lifecycle events.</p>
        </div>
        <button
          type="button"
          onClick={fetchAudit}
          disabled={loading}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 px-4 py-2 rounded-xl text-xs font-medium transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto cursor-pointer disabled:opacity-50"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <SkeletonLoader count={5} />
      ) : events.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-10 text-center space-y-3">
          <div className="text-sm font-medium text-zinc-300">No audit events recorded yet.</div>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Lifecycle actions such as report creation, submissions, and approvals will appear here.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={fetchAudit}
              disabled={isUnreachable}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
            >
              Refresh Log
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Report ID</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                {events.map((e, idx) => (
                  <tr key={idx} className="hover:bg-zinc-800/30">
                    <td className="py-3 px-4 font-mono text-zinc-400">{e.timestamp || "—"}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px]">
                        {e.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-sky-400">{e.reportId || "—"}</td>
                    <td className="py-3 px-4 text-zinc-400">{e.userId}</td>
                    <td className="py-3 px-4 text-zinc-400">{JSON.stringify(e.details || {})}</td>
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
