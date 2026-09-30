import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { reportsApi, tokenStore } from "../api";
import type { Report } from "../types";

export default function RepositoryPage() {
  const { user } = useAuth();
  const canCreate = user?.role === "TECHNICIAN" || user?.role === "ADMIN";
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [accuracyClass, setAccuracyClass] = useState("");
  const [resultFilter, setResultFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Build filters
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (accuracyClass) params.accuracyClass = accuracyClass;
      if (resultFilter) params.result = resultFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (searchTerm) {
        // Send as 'model' for now, or the backend needs to support a generic 'search' term
        // The prompt says "free-text searches across model, serial, manufacturer"
        // Since we only have specific query params, I will just send `model` as search term,
        // or actually the prompt says "GET /api/reports?model=&serial=&manufacturer=".
        // For simplicity, let's just use `model` for search term if it's not a generic query param.
        // Or better yet, send it as `model` and let user know. 
        // Wait, the prompt says "Search bar: free-text searches across model, serial, manufacturer".
        // It's easier to filter it in the frontend if the backend doesn't support a single generic search param.
        // Actually, the backend API doesn't have a single 'q' parameter. It has model, serial, manufacturer.
      }

      const res = await reportsApi.list(params);
      
      let filtered = res.items;
      
      // Frontend-side generic search if backend doesn't support it directly in a single param
      if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase();
        filtered = filtered.filter(r => 
          (r.instrument?.model?.toLowerCase().includes(lowerTerm)) ||
          (r.instrument?.serialNumber?.toLowerCase().includes(lowerTerm)) ||
          (r.manufacturer?.name?.toLowerCase().includes(lowerTerm))
        );
      }
      
      setReports(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, accuracyClass, resultFilter, dateFrom, dateTo]);

  const handleDownload = async (id: string) => {
    try {
      const url = await reportsApi.getDownloadUrl(id);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${tokenStore.get()}` } });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `NAWI_Report_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objUrl);
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF.");
    }
  };

  return (
    <div className="pt-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-zinc-100 tracking-tight">Repository</h1>
          <p className="text-zinc-500 mt-2 text-sm">Search and manage test reports.</p>
        </div>
        {canCreate && (
          <Link
            to="/reports/new"
            className="bg-zinc-100 hover:bg-white text-zinc-950 px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            Create Report
          </Link>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search model, serial, manufacturer..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchReports()}
          />
        </div>
        
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none">
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="SUBMITTED_FOR_REVIEW">Submitted</option>
          <option value="QUERY_RAISED">Query Raised</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        
        <select value={accuracyClass} onChange={e => setAccuracyClass(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none">
          <option value="">All Classes</option>
          <option value="II">II</option>
          <option value="III">III</option>
          <option value="IIII">IIII</option>
        </select>

        <select value={resultFilter} onChange={e => setResultFilter(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none">
          <option value="">All Results</option>
          <option value="PASS">Pass</option>
          <option value="FAIL">Fail</option>
          <option value="PENDING">Pending</option>
        </select>
        
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none" />
          <span className="text-zinc-500">-</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none" />
        </div>
        
        <button onClick={fetchReports} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-sm transition-colors border border-zinc-700">
          Search
        </button>
      </div>

      <div className="border border-zinc-800/60 bg-zinc-900/20 rounded-2xl p-6 backdrop-blur-sm">
        {loading ? (
          <div className="text-zinc-500 text-center py-12">Loading reports...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="text-xs uppercase bg-zinc-800/50 text-zinc-300">
                <tr>
                  <th className="px-6 py-3 rounded-tl-xl">ID</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Model</th>
                  <th className="px-6 py-3">Created By</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Hash</th>
                  <th className="px-6 py-3 rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.reportId} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-200">{r.reportId}</td>
                    <td className="px-6 py-4">
                      <span className="bg-zinc-800 border border-zinc-700 px-2 py-1 rounded text-xs">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{r.instrument?.model || "N/A"}</td>
                    <td className="px-6 py-4">{r.createdBy}</td>
                    <td className="px-6 py-4">{new Date(r.createdAt || "").toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      {r.hash ? (
                        <span className="font-mono text-[10px] text-zinc-500 bg-zinc-900 px-2 py-1 rounded cursor-help" title={`Prototype integrity hash — not a legally valid digital signature.\n\nHash: ${r.hash}`}>
                          {r.hash.substring(0, 12)}...
                        </span>
                      ) : "-"}
                    </td>
                    <td className="px-6 py-4 flex gap-3">
                      <Link to={`/reports/${r.reportId}`} className="text-zinc-300 hover:text-white">View</Link>
                      {r.status === "APPROVED" && (
                        <button onClick={() => handleDownload(r.reportId)} className="text-emerald-400 hover:text-emerald-300">Download PDF</button>
                      )}
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="text-zinc-500 mb-2">No reports match your search.</div>
                      <button onClick={() => { setSearchTerm(""); setStatusFilter(""); setAccuracyClass(""); setResultFilter(""); setDateFrom(""); setDateTo(""); }} className="text-sm text-zinc-400 hover:text-zinc-200 underline">
                        Clear all filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
