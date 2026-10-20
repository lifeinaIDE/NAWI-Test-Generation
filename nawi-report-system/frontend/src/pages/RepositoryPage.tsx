import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { reportsApi, tokenStore } from "../api";
import type { Report } from "../types";
import StatusBadge from "../components/StatusBadge";
import SkeletonLoader from "../components/SkeletonLoader";
import ErrorBanner from "../components/ErrorBanner";
import useBackendUnreachable from "../hooks/useBackendUnreachable";

type SortField =
  | "reportId"
  | "status"
  | "model"
  | "serialNumber"
  | "manufacturer"
  | "accuracyClass"
  | "createdBy"
  | "createdAt"
  | "finalResult";

export default function RepositoryPage() {
  const { user } = useAuth();
  const isUnreachable = useBackendUnreachable();
  const canCreate = user?.role === "TECHNICIAN" || user?.role === "ADMIN";

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [apiError, setApiError] = useState<string | null>(null);

  // Search & Filters
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [manufacturerFilter, setManufacturerFilter] = useState("");
  const [serialFilter, setSerialFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [accuracyClass, setAccuracyClass] = useState("");
  const [resultFilter, setResultFilter] = useState("");

  // Pagination & Sorting
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: currentPage,
        pageSize: pageSize,
        sortBy: sortBy,
        sortOrder: sortOrder,
      };

      if (searchQ.trim()) params.q = searchQ.trim();
      if (statusFilter) params.status = statusFilter;
      if (modelFilter.trim()) params.model = modelFilter.trim();
      if (manufacturerFilter.trim()) params.manufacturer = manufacturerFilter.trim();
      if (serialFilter.trim()) params.serialNumber = serialFilter.trim();
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (accuracyClass) params.accuracyClass = accuracyClass;
      if (resultFilter) params.finalResult = resultFilter;

      const res = await reportsApi.list(params);
      setReports(res.items || []);
      setTotalCount(res.total || 0);
    } catch (err) {
      console.error("Failed to load reports", err);
      setApiError("Failed to retrieve reports from server.");
    } finally {
      setLoading(false);
    }
  }, [
    currentPage,
    pageSize,
    sortBy,
    sortOrder,
    searchQ,
    statusFilter,
    modelFilter,
    manufacturerFilter,
    serialFilter,
    dateFrom,
    dateTo,
    accuracyClass,
    resultFilter,
  ]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setSearchQ("");
    setStatusFilter("");
    setModelFilter("");
    setManufacturerFilter("");
    setSerialFilter("");
    setDateFrom("");
    setDateTo("");
    setAccuracyClass("");
    setResultFilter("");
    setCurrentPage(1);
  };

  const handleDownload = async (id: string) => {
    try {
      const blob = await reportsApi.downloadPdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NAWI_Report_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF.");
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="pt-6 max-w-7xl mx-auto space-y-6 px-4">
      {/* Dismissible API Error Banner */}
      {apiError && (
        <ErrorBanner
          message={apiError}
          onDismiss={() => setApiError(null)}
          title="Repository API Notice"
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-zinc-100 tracking-tight">Repository</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            Search, filter, and inspect non-automatic weighing instrument test reports.
          </p>
        </div>
        {canCreate && (
          <Link
            to="/reports/new"
            className={`bg-zinc-100 hover:bg-white text-zinc-950 px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm hover:shadow-md inline-flex items-center gap-2 self-start sm:self-auto ${
              isUnreachable ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <span>+</span> Create Report
          </Link>
        )}
      </div>

      {/* Filter and Search Card */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 shadow-xl space-y-4">
        {/* Free-text Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search by ID, model, serial number, manufacturer, technician..."
            className="w-full bg-zinc-950 border border-zinc-800/90 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
            value={searchQ}
            onChange={(e) => {
              setSearchQ(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Structured Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 text-xs">
          {/* Status Filter */}
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="SUBMITTED_FOR_REVIEW">Awaiting Review</option>
              <option value="QUERY_RAISED">Query Raised</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Model Filter */}
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Model</label>
            <input
              type="text"
              placeholder="e.g. XP-3000"
              value={modelFilter}
              onChange={(e) => {
                setModelFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Manufacturer Filter */}
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Manufacturer</label>
            <input
              type="text"
              placeholder="e.g. Mettler"
              value={manufacturerFilter}
              onChange={(e) => {
                setManufacturerFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Serial Number Filter */}
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Serial No.</label>
            <input
              type="text"
              placeholder="e.g. SN-100"
              value={serialFilter}
              onChange={(e) => {
                setSerialFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Accuracy Class Filter */}
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Class</label>
            <select
              value={accuracyClass}
              onChange={(e) => {
                setAccuracyClass(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Classes</option>
              <option value="I">Class I</option>
              <option value="II">Class II</option>
              <option value="III">Class III</option>
              <option value="IIII">Class IIII</option>
            </select>
          </div>

          {/* Final Result Filter */}
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Result</label>
            <select
              value={resultFilter}
              onChange={(e) => {
                setResultFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Results</option>
              <option value="PASS">Pass</option>
              <option value="FAIL">Fail</option>
              <option value="WARNING">Warning</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          {/* Date Range & Clear */}
          <div>
            <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">From / To</label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-1/2 bg-zinc-950 border border-zinc-800 rounded-lg px-1.5 py-1.5 text-zinc-300 text-[10px] focus:outline-none focus:border-sky-500"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-1/2 bg-zinc-950 border border-zinc-800 rounded-lg px-1.5 py-1.5 text-zinc-300 text-[10px] focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Clear filters action */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-800/60">
          <span className="text-zinc-500 text-xs">
            Showing <strong className="text-zinc-300">{startItem}</strong> -{" "}
            <strong className="text-zinc-300">{endItem}</strong> of{" "}
            <strong className="text-zinc-300">{totalCount}</strong> reports
          </span>
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs text-sky-400 hover:text-sky-300 underline cursor-pointer"
          >
            Clear all filters
          </button>
        </div>
      </div>

      {/* Reports Table Card */}
      <div className="border border-zinc-800/80 bg-zinc-900/40 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="p-6">
            <SkeletonLoader count={5} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-800/60 text-zinc-400 border-b border-zinc-800 text-[11px] uppercase tracking-wider select-none">
                <tr>
                  <th
                    className="px-5 py-3.5 cursor-pointer hover:text-white"
                    onClick={() => handleSort("reportId")}
                  >
                    Report ID {sortBy === "reportId" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="px-4 py-3.5 cursor-pointer hover:text-white"
                    onClick={() => handleSort("status")}
                  >
                    Status {sortBy === "status" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="px-4 py-3.5 cursor-pointer hover:text-white"
                    onClick={() => handleSort("model")}
                  >
                    Model {sortBy === "model" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="px-4 py-3.5 cursor-pointer hover:text-white"
                    onClick={() => handleSort("serialNumber")}
                  >
                    Serial {sortBy === "serialNumber" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="px-4 py-3.5 cursor-pointer hover:text-white"
                    onClick={() => handleSort("manufacturer")}
                  >
                    Manufacturer {sortBy === "manufacturer" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="px-3 py-3.5 cursor-pointer hover:text-white"
                    onClick={() => handleSort("accuracyClass")}
                  >
                    Class {sortBy === "accuracyClass" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="px-4 py-3.5 cursor-pointer hover:text-white"
                    onClick={() => handleSort("createdBy")}
                  >
                    Technician {sortBy === "createdBy" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="px-4 py-3.5 cursor-pointer hover:text-white"
                    onClick={() => handleSort("createdAt")}
                  >
                    Date {sortBy === "createdAt" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="px-3 py-3.5 cursor-pointer hover:text-white"
                    onClick={() => handleSort("finalResult")}
                  >
                    Result {sortBy === "finalResult" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-normal">
                {reports.map((r) => {
                  const isApproved = r.status === "APPROVED";
                  const resultColor =
                    r.finalResult === "PASS"
                      ? "text-emerald-400 bg-emerald-950/40 border-emerald-800/40"
                      : r.finalResult === "FAIL"
                      ? "text-rose-400 bg-rose-950/40 border-rose-800/40"
                      : "text-amber-400 bg-amber-950/40 border-amber-800/40";

                  return (
                    <tr
                      key={r.reportId}
                      className="hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono font-medium text-sky-400">
                        <Link to={`/reports/${r.reportId}/view`} className="hover:underline">
                          {r.reportId}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-200">
                        {r.instrument?.model || "N/A"}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-400 text-[11px]">
                        {r.instrument?.serialNumber || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {r.manufacturer?.name || "—"}
                      </td>
                      <td className="px-3 py-3 font-mono">
                        Class {r.instrument?.accuracyClass || "III"}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {r.createdBy || "—"}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {r.createdAt ? String(r.createdAt).substring(0, 10) : "—"}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-block font-semibold px-2 py-0.5 rounded text-[10px] border ${resultColor}`}>
                          {r.finalResult || "PENDING"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {/* View for all roles */}
                          <Link
                            to={`/reports/${r.reportId}/view`}
                            className="text-sky-400 hover:text-sky-300 font-medium"
                          >
                            View
                          </Link>

                          {/* Edit for mutable drafts */}
                          {!["APPROVED", "REJECTED"].includes(r.status) && (
                            <Link
                              to={`/reports/${r.reportId}`}
                              className="text-zinc-400 hover:text-zinc-200"
                            >
                              Edit
                            </Link>
                          )}

                          {/* Download PDF for APPROVED only */}
                          {isApproved && (
                            <button
                              type="button"
                              onClick={() => handleDownload(r.reportId)}
                              className="text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                            >
                              PDF
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {reports.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-16">
                      <div className="space-y-3 max-w-sm mx-auto">
                        <div className="text-zinc-400 text-sm font-medium">
                          No reports match your search criteria.
                        </div>
                        <div className="flex items-center justify-center gap-4">
                          <button
                            type="button"
                            onClick={clearAllFilters}
                            className="text-xs text-sky-400 hover:text-sky-300 underline cursor-pointer"
                          >
                            Clear filters
                          </button>
                          {canCreate && (
                            <Link
                              to="/reports/new"
                              className={`inline-flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-medium px-4 py-2 rounded-xl text-xs transition-all shadow-sm ${
                                isUnreachable ? "opacity-50 pointer-events-none" : ""
                              }`}
                            >
                              + Create New Report
                            </Link>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="bg-zinc-950/60 border-t border-zinc-800/80 px-5 py-3 flex flex-wrap items-center justify-between gap-4 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 focus:outline-none"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span>per page</span>
          </div>

          <div className="flex items-center gap-3">
            <span>
              Page <strong className="text-zinc-200">{currentPage}</strong> of{" "}
              <strong className="text-zinc-200">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
