import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { dashboardApi } from "../api";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      dashboardApi.getSummary(),
      dashboardApi.getStatistics()
    ]).then(([sumRes, statRes]) => {
      setSummary(sumRes);
      setStats(statRes);
    }).catch(() => {
      // Fallback
      setSummary({ total: 0, drafts: 0, inProgress: 0, submittedForReview: 0, approved: 0, rejected: 0 });
      setStats({ passRate: 0, failRate: 0, reportsByModel: [], recentActivity: [] });
    });
  }, []);

  if (!summary || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-zinc-500 text-sm">Loading metrics...</div>
      </div>
    );
  }

  const metrics = [
    { label: "Total Reports", value: summary.total },
    { label: "Drafts", value: summary.drafts },
    { label: "Awaiting Review", value: summary.submittedForReview },
    { label: "Approved", value: summary.approved, color: "text-emerald-400" },
    { label: "Rejected", value: summary.rejected, color: "text-rose-400" },
  ];

  const pieData = [
    { name: "Pass", value: stats.passRate },
    { name: "Fail", value: stats.failRate }
  ];
  const COLORS = ["#10b981", "#f43f5e"];

  return (
    <div className="pt-8 max-w-6xl mx-auto space-y-16">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-zinc-100">Overview</h1>
        <p className="text-zinc-500 mt-2 text-sm">Welcome back, <span className="text-zinc-300 font-medium">{user?.username}</span>.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 flex flex-col group transition-all hover:bg-zinc-800/40">
            <span className="text-[10px] font-medium text-zinc-500 mb-2 uppercase tracking-widest">{m.label}</span>
            <span className={`text-4xl font-light tracking-tighter ${m.color || "text-zinc-100"} transition-all group-hover:scale-105 origin-left`}>
              {m.value}
            </span>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pass/Fail Chart */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-8">
          <h2 className="text-sm font-medium text-zinc-300 mb-6 uppercase tracking-widest">Pass/Fail Rate (Approved)</h2>
          <div className="h-64 flex items-center justify-center">
            {stats.passRate === 0 && stats.failRate === 0 ? (
              <span className="text-zinc-600 text-sm italic">No approved reports to display.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", fontSize: "12px" }}
                    itemStyle={{ color: "#e4e4e7" }}
                    formatter={(val: any) => `${Number(val).toFixed(1)}%`}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          {(stats.passRate > 0 || stats.failRate > 0) && (
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-xs text-zinc-400">Pass</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500"></div><span className="text-xs text-zinc-400">Fail</span></div>
            </div>
          )}
        </div>

        {/* Top Models Chart */}
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-8">
          <h2 className="text-sm font-medium text-zinc-300 mb-6 uppercase tracking-widest">Top Models Tested</h2>
          <div className="h-64 flex items-center justify-center">
            {stats.reportsByModel.length === 0 ? (
              <span className="text-zinc-600 text-sm italic">No data available.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.reportsByModel} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", fontSize: "12px" }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
      
      <div className="border-t border-zinc-800/40 pt-10">
        <h2 className="text-lg font-medium text-zinc-300 mb-8">Recent Activity</h2>
        <div className="flex flex-col gap-4">
          {stats.recentActivity.length === 0 ? (
            <p className="text-zinc-600 text-sm italic">No recent activity.</p>
          ) : (
            stats.recentActivity.map((event: any) => (
              <div key={event.eventId} className="bg-zinc-900/30 border border-zinc-800/50 p-4 rounded-xl flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                  {event.userRole === "TECHNICIAN" ? "👨‍🔧" : event.userRole === "REVIEWER" ? "👀" : "👤"}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-zinc-300">
                    <span className="font-semibold text-zinc-200">{event.userId}</span> {event.action.toLowerCase()} report <span className="font-mono text-xs">{event.reportId}</span>
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">{new Date(event.timestamp).toLocaleString()}</p>
                </div>
                {event.comment && (
                  <div className="text-xs text-zinc-400 italic max-w-xs truncate" title={event.comment}>
                    "{event.comment}"
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
