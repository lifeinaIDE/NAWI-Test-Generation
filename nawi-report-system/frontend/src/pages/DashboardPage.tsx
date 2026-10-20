import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { dashboardApi, healthApi } from "../api";
import toast from "react-hot-toast";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import SkeletonLoader from "../components/SkeletonLoader";
import ErrorBanner from "../components/ErrorBanner";
import useBackendUnreachable from "../hooks/useBackendUnreachable";
import { Link } from "react-router-dom";

export default function DashboardPage() {
  const { user } = useAuth();
  const isUnreachable = useBackendUnreachable();
  const [summary, setSummary] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const [healthStatus, setHealthStatus] = useState<{
    status: string;
    service: string;
    version: string;
    docs?: string;
  } | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  useEffect(() => {
    setLoading(true);
    setApiError(null);
    Promise.all([dashboardApi.getSummary(), dashboardApi.getStatistics()])
      .then(([sumRes, statRes]) => {
        setSummary(sumRes);
        setStats(statRes);
      })
      .catch((err) => {
        console.error("Failed to load dashboard metrics", err);
        setApiError("Unable to fetch dashboard metrics. Displaying offline snapshot.");
        setSummary({
          total: 0,
          drafts: 0,
          inProgress: 0,
          submittedForReview: 0,
          queryRaised: 0,
          approved: 0,
          rejected: 0,
        });
        setStats({
          passRate: 0,
          failRate: 0,
          reportsByModel: [],
          recentActivity: [],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const checkHealth = async () => {
    setCheckingHealth(true);
    try {
      const res = await healthApi.check();
      setHealthStatus(res);
      toast.success(`FastAPI backend is ${res.status} (${res.service})`);
    } catch (err) {
      toast.error("Failed to connect to /api/health");
    } finally {
      setCheckingHealth(false);
    }
  };

  if (loading || !summary || !stats) {
    return (
      <div className="pt-8 max-w-7xl mx-auto space-y-6 px-4">
        <SkeletonLoader count={4} />
      </div>
    );
  }

  const isViewer = user?.role === "VIEWER";

  const summaryCards = [
    { label: "Total Reports", value: summary.total ?? 0, color: "text-zinc-100" },
    { label: "Drafts", value: summary.drafts ?? 0, color: "text-zinc-300" },
    { label: "In Progress", value: summary.inProgress ?? 0, color: "text-sky-400" },
    { label: "Awaiting Review", value: summary.submittedForReview ?? 0, color: "text-amber-400" },
    { label: "Query Raised", value: summary.queryRaised ?? 0, color: "text-purple-400" },
    { label: "Approved", value: summary.approved ?? 0, color: "text-emerald-400" },
    { label: "Rejected", value: summary.rejected ?? 0, color: "text-rose-400" },
  ];

  const donutData = [
    { name: "Pass", value: Number(stats.passRate || 0) },
    { name: "Fail", value: Number(stats.failRate || 0) },
  ];
  const DONUT_COLORS = ["#10b981", "#f43f5e"];

  // Normalize model chart data
  const modelChartData = (stats.reportsByModel || []).map((m: any) => ({
    name: m.name || m.model || "Unknown",
    count: m.count || 0,
  }));

  return (
    <div className="pt-6 max-w-7xl mx-auto space-y-8 px-4">
      {/* Dismissible API Error Banner */}
      {apiError && (
        <ErrorBanner
          message={apiError}
          onDismiss={() => setApiError(null)}
          title="Dashboard API Notice"
        />
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-zinc-100">Overview</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            Welcome back, <span className="text-zinc-200 font-medium">{user?.username}</span>{" "}
            ({user?.role}).
          </p>
        </div>

        {/* Health Check Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={checkHealth}
            disabled={checkingHealth || isUnreachable}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-200 hover:text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                healthStatus ? "bg-emerald-400" : "bg-zinc-400"
              } ${checkingHealth ? "animate-ping" : ""}`}
            />
            {checkingHealth ? "Checking /api/health..." : "Check API Health"}
          </button>
        </div>
      </div>

      {/* Empty State Call to Action Banner when repository has 0 reports */}
      {summary.total === 0 && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-800/80 flex items-center justify-center text-zinc-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-medium text-zinc-100">No Reports in Repository</h3>
            <p className="text-zinc-400 text-xs mt-1 max-w-md mx-auto">
              Get started by creating your first non-automatic weighing instrument verification test report.
            </p>
          </div>
          <div>
            {user?.role === "TECHNICIAN" || user?.role === "ADMIN" ? (
              <Link
                to="/reports/new"
                className={`inline-flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-medium px-5 py-2.5 rounded-full text-xs transition-all shadow-sm ${
                  isUnreachable ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                <span>+</span> Create New Report
              </Link>
            ) : (
              <Link
                to="/repository"
                className="inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium px-5 py-2.5 rounded-full text-xs transition-all shadow-sm"
              >
                Browse Repository →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Role Variant Banner: VIEWER */}
      {isViewer && (
        <div className="bg-sky-950/40 border border-sky-800/60 rounded-2xl p-4 flex items-center gap-3 text-xs text-sky-200 shadow-md animate-fade-in">
          <svg className="w-5 h-5 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-semibold">Viewer Access:</span> You can view approved reports only.
          </div>
        </div>
      )}

      {/* API Health Banner */}
      {healthStatus && (
        <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-4 flex items-center justify-between text-xs text-emerald-200 shadow-md">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              <strong>Backend Status:</strong> {healthStatus.status} &nbsp;|&nbsp;
              <strong>Service:</strong> {healthStatus.service} &nbsp;|&nbsp;
              <strong>Version:</strong> {healthStatus.version}
            </span>
          </div>
          <span className="text-[10px] uppercase tracking-widest text-emerald-400/80 font-mono">200 OK</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className="bg-zinc-900/50 border border-zinc-800/70 rounded-2xl p-4 flex flex-col justify-between transition-all hover:bg-zinc-800/40 hover:border-zinc-700/60 shadow-lg"
          >
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              {card.label}
            </span>
            <span className={`text-3xl font-light tracking-tight ${card.color}`}>
              {card.value}
            </span>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Pass / Fail Donut Chart */}
        <div className="bg-zinc-900/50 border border-zinc-800/70 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
              Pass / Fail Compliance Rate (Approved)
            </h2>
            <span className="text-xs text-zinc-500">
              Pass Rate: <strong className="text-emerald-400">{Number(stats.passRate || 0).toFixed(1)}%</strong>
            </span>
          </div>

          <div className="h-64 flex items-center justify-center">
            {stats.passRate === 0 && stats.failRate === 0 ? (
              <span className="text-zinc-600 text-xs italic">No approved reports available for rate computation.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      borderColor: "#27272a",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#e4e4e7" }}
                    formatter={(val: any) => `${Number(val).toFixed(1)}%`}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {(stats.passRate > 0 || stats.failRate > 0) && (
            <div className="flex justify-center gap-8 pt-4 border-t border-zinc-800/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-zinc-400">Pass ({Number(stats.passRate || 0).toFixed(1)}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-zinc-400">Fail ({Number(stats.failRate || 0).toFixed(1)}%)</span>
              </div>
            </div>
          )}
        </div>

        {/* Reports By Model Bar Chart */}
        <div className="bg-zinc-900/50 border border-zinc-800/70 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
              Reports by Instrument Model
            </h2>
            <span className="text-xs text-zinc-500">Top tested models</span>
          </div>

          <div className="h-64 flex items-center justify-center">
            {modelChartData.length === 0 ? (
              <span className="text-zinc-600 text-xs italic">No instrument model data recorded.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelChartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    axisLine={{ stroke: "#27272a" }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 10 }}
                    axisLine={{ stroke: "#27272a" }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#27272a", opacity: 0.4 }}
                    contentStyle={{
                      backgroundColor: "#18181b",
                      borderColor: "#27272a",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-800/60 text-right text-[11px] text-zinc-500">
            Total unique models evaluated: {modelChartData.length}
          </div>
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="bg-zinc-900/50 border border-zinc-800/70 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">
          Recent Metrological Workflow Activity
        </h2>

        <div className="divide-y divide-zinc-800/60">
          {!stats.recentActivity || stats.recentActivity.length === 0 ? (
            <p className="text-zinc-600 text-xs py-8 text-center italic">No recent activity recorded.</p>
          ) : (
            stats.recentActivity.map((event: any, idx: number) => {
              const role = event.userRole || event.role || "USER";
              const userLabel = event.userId || event.user || "System";
              const timeStr = event.timestamp ? new Date(event.timestamp).toLocaleString() : "Just now";

              return (
                <div key={event.eventId || idx} className="py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-xs shrink-0 mt-0.5">
                    {role === "TECHNICIAN" ? "👨‍🔧" : role === "REVIEWER" ? "🔍" : "👤"}
                  </div>

                  <div className="flex-1 text-xs">
                    <p className="text-zinc-300">
                      <strong className="text-zinc-100">{userLabel}</strong> ({role}) performed{" "}
                      <span className="font-mono text-sky-400 font-semibold">{event.action}</span> on report{" "}
                      <span className="font-mono text-zinc-200">{event.reportId}</span>
                    </p>
                    {event.comment && (
                      <p className="text-zinc-400 italic text-[11px] mt-1 bg-zinc-950/50 p-2 rounded border border-zinc-800/40">
                        "{event.comment}"
                      </p>
                    )}
                    <span className="text-[10px] text-zinc-500 mt-1 block">{timeStr}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
