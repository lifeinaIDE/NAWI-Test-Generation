import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { reportsApi } from "../api";
import type { Report } from "../types";
import StatusBadge from "../components/StatusBadge";
import SkeletonLoader from "../components/SkeletonLoader";
import ErrorBanner from "../components/ErrorBanner";
import useBackendUnreachable from "../hooks/useBackendUnreachable";

type SortField = "reportId" | "model" | "updatedAt" | "createdBy";
type SortOrder = "asc" | "desc";

export default function ReviewQueuePage() {
  const isUnreachable = useBackendUnreachable();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("updatedAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [apiError, setApiError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchQueue = async () => {
    setIsLoading(true);
    setApiError(null);
    try {
      const res = await reportsApi.list({ status: "SUBMITTED_FOR_REVIEW" });
      const items = res.items || [];
      setReports(items.filter((r) => r.status === "SUBMITTED_FOR_REVIEW"));
    } catch {
      setApiError("Failed to load review queue from server.");
      setReports([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const filteredAndSortedReports = useMemo(() => {
    let result = reports.filter((r) => {
      const term = searchTerm.toLowerCase();
      const idMatch = r.reportId.toLowerCase().includes(term);
      const modelMatch = (r.instrument?.model || "").toLowerCase().includes(term);
      const techMatch = (r.createdBy || r.technicianId || "").toLowerCase().includes(term);
      return idMatch || modelMatch || techMatch;
    });

    result.sort((a, b) => {
      let valA: string = "";
      let valB: string = "";

      if (sortField === "reportId") {
        valA = a.reportId;
        valB = b.reportId;
      } else if (sortField === "model") {
        valA = a.instrument?.model || "";
        valB = b.instrument?.model || "";
      } else if (sortField === "updatedAt") {
        valA = a.updatedAt || a.createdAt || "";
        valB = b.updatedAt || b.createdAt || "";
      } else if (sortField === "createdBy") {
        valA = a.createdBy || a.technicianId || "";
        valB = b.createdBy || b.technicianId || "";
      }

      const cmp = valA.localeCompare(valB);
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [reports, searchTerm, sortField, sortOrder]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-4">
      {/* Dismissible API Error Banner */}
      {apiError && (
        <ErrorBanner
          message={apiError}
          onDismiss={() => setApiError(null)}
          title="Review Queue Notice"
        />
      )}

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500 font-semibold">
            <span>Metrological Oversight</span>
            <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
            <span className="text-amber-400 font-medium">{reports.length} Pending Review</span>
          </div>
          <h1 className="text-2xl font-light text-zinc-100 tracking-tight mt-1">
            Reviewer Queue
          </h1>
          <p className="text-zinc-500 text-xs mt-0.5">
            Non-automatic weighing instrument test reports submitted for legal-metrology compliance authorization.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchQueue}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:text-white hover:border-zinc-700 transition-all cursor-pointer"
        >
          <svg className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-sky-400" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Queue
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-3 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter by Report ID, Model, or Technician..."
            className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-700"
            data-testid="search-input"
          />
          <svg className="w-4 h-4 text-zinc-500 absolute left-2.5 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="text-xs text-zinc-500">
          Showing <span className="text-zinc-200 font-medium">{filteredAndSortedReports.length}</span> of {reports.length} reports
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm" data-testid="review-queue-table">
        {isLoading ? (
          <div className="p-8">
            <SkeletonLoader count={4} />
          </div>
        ) : filteredAndSortedReports.length === 0 ? (
          <div className="p-12 text-center text-zinc-500 text-xs space-y-3">
            <svg className="w-10 h-10 text-zinc-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="text-sm font-medium text-zinc-300">Review Queue Empty</div>
            <div>No test reports are currently awaiting reviewer authorization.</div>
            <div className="pt-2">
              <Link
                to="/repository"
                className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium px-4 py-2 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
              >
                Browse Repository →
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="text-[11px] uppercase tracking-wider text-zinc-500 bg-zinc-950/80 border-b border-zinc-800 select-none">
                <tr>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-zinc-300"
                    onClick={() => handleSort("reportId")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Report ID</span>
                      {sortField === "reportId" && (
                        <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-zinc-300"
                    onClick={() => handleSort("model")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Instrument / Model</span>
                      {sortField === "model" && (
                        <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4">Accuracy Class</th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-zinc-300"
                    onClick={() => handleSort("createdBy")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Submitted By</span>
                      {sortField === "createdBy" && (
                        <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th
                    className="py-3 px-4 cursor-pointer hover:text-zinc-300"
                    onClick={() => handleSort("updatedAt")}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Submitted On</span>
                      {sortField === "updatedAt" && (
                        <span>{sortOrder === "asc" ? "↑" : "↓"}</span>
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredAndSortedReports.map((report) => (
                  <tr
                    key={report.reportId}
                    className="hover:bg-zinc-800/30 transition-colors group"
                    data-testid={`queue-row-${report.reportId}`}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-sky-400">
                      <Link
                        to={`/reports/${report.reportId}/review`}
                        className="hover:underline"
                      >
                        {report.reportId}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-zinc-200">
                        {report.instrument?.model || "Unspecified Model"}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        SN: {report.instrument?.serialNumber || "—"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[11px]">
                        Class {report.instrument?.accuracyClass || "III"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {report.createdBy || report.technicianId || "technician"}
                    </td>
                    <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                      {report.updatedAt
                        ? new Date(report.updatedAt).toLocaleString()
                        : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={report.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/reports/${report.reportId}/review`)}
                        disabled={isUnreachable}
                        className="bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white border border-sky-500/30 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                        data-testid={`review-btn-${report.reportId}`}
                      >
                        Review Report →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
