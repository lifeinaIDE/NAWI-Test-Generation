import { useState, useEffect } from "react";
import { reportsApi } from "../api";
import type { Report, TestDefinition } from "../types";
import toast from "react-hot-toast";

export default function ReviewPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.list({ status: "SUBMITTED_FOR_REVIEW" });
      setReports(res.items.filter(r => r.status === "SUBMITTED_FOR_REVIEW"));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (selectedReport) {
    return <ReviewDetail report={selectedReport} onBack={() => { setSelectedReport(null); fetchReports(); }} />;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-light text-zinc-100 tracking-tight">Review Queue</h1>
        <p className="text-zinc-500 mt-2 text-sm">Reports awaiting reviewer approval.</p>
      </div>

      {loading ? (
        <div className="text-zinc-500">Loading queue...</div>
      ) : reports.length === 0 ? (
        <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl p-12 text-center">
          <p className="text-zinc-500">No reports are currently submitted for review.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map(r => (
            <div 
              key={r.reportId} 
              onClick={() => setSelectedReport(r)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 cursor-pointer hover:border-zinc-600 transition-colors flex justify-between items-center"
            >
              <div>
                <h3 className="text-zinc-200 font-medium">{r.reportId}</h3>
                <div className="text-sm text-zinc-500 mt-1 flex gap-4">
                  <span>Model: {r.instrument?.model || "N/A"}</span>
                  <span>Serial: {r.instrument?.serialNumber || "N/A"}</span>
                  <span>Class: {r.instrument?.accuracyClass || "N/A"}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-400 mb-1">By: {r.createdBy}</div>
                <div className="text-xs bg-amber-500/10 text-amber-400 px-2 py-1 rounded inline-block border border-amber-500/20">
                  {r.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewDetail({ report, onBack }: { report: Report, onBack: () => void }) {
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAction = async (action: "approve" | "reject" | "returnReport") => {
    if (!comment.trim()) {
      toast.error("A comment is required for this action.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await reportsApi[action](report.reportId, comment);
      toast.success(`Report successfully ${action === "returnReport" ? "returned" : action + "d"}.`);
      onBack();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBadgeColor = (res: string) => {
    if (res === "PASS") return "bg-green-500/10 text-green-400 border-green-500/20";
    if (res === "FAIL") return "bg-red-500/10 text-red-400 border-red-500/20";
    if (res === "WARNING") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    return "bg-zinc-800 text-zinc-400 border-zinc-700";
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-zinc-400 hover:text-zinc-100">&larr; Back</button>
        <h1 className="text-2xl font-light text-zinc-100">Review Report: {report.reportId}</h1>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800/80">
          <h3 className="text-sm font-medium text-zinc-300 mb-4 border-b border-zinc-800 pb-2">Instrument Info</h3>
          <div className="space-y-2 text-sm text-zinc-400">
            <p><strong>Model:</strong> {report.instrument?.model}</p>
            <p><strong>Serial:</strong> {report.instrument?.serialNumber}</p>
            <p><strong>Class:</strong> {report.instrument?.accuracyClass}</p>
            <p><strong>Max Capacity:</strong> {report.instrument?.maxCapacity} {report.instrument?.unit}</p>
            <p><strong>e:</strong> {report.instrument?.verificationIntervalE}</p>
          </div>
        </div>
        <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800/80">
          <h3 className="text-sm font-medium text-zinc-300 mb-4 border-b border-zinc-800 pb-2">Environment</h3>
          <div className="space-y-2 text-sm text-zinc-400">
            <p><strong>Temp Start:</strong> {report.environment?.temperatureStart} °C</p>
            <p><strong>Temp End:</strong> {report.environment?.temperatureEnd} °C</p>
            <p><strong>Humidity:</strong> {report.environment?.relativeHumidity} %</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-zinc-200">Test Results</h3>
        {report.tests.filter(t => t.applicable).map(t => (
          <div key={t.testCode} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
            <div>
              <div className="text-zinc-200 font-medium">{t.testName}</div>
              <div className="text-xs text-zinc-500 mt-1">Observations: {t.observations?.length || 0}</div>
            </div>
            <div className={`px-3 py-1 rounded text-xs font-semibold border ${getBadgeColor(t.result)}`}>
              {t.result}
            </div>
          </div>
        ))}
        {report.tests.filter(t => t.applicable).length === 0 && (
          <div className="text-sm text-zinc-500">No applicable tests.</div>
        )}
      </div>

      <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 mt-8">
        <h3 className="text-sm font-medium text-zinc-300 mb-4">Reviewer Decision</h3>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Enter review comments (required for decision)..."
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500 min-h-[100px] mb-4"
        />
        <div className="flex justify-end gap-4">
          <button
            disabled={isSubmitting || !comment.trim()}
            onClick={() => handleAction("returnReport")}
            className="px-6 py-2 rounded-full text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50 border border-zinc-700"
          >
            Return for Correction
          </button>
          <button
            disabled={isSubmitting || !comment.trim()}
            onClick={() => handleAction("reject")}
            className="px-6 py-2 rounded-full text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 disabled:opacity-50 border border-red-500/20"
          >
            Reject
          </button>
          <button
            disabled={isSubmitting || !comment.trim()}
            onClick={() => handleAction("approve")}
            className="px-6 py-2 rounded-full text-sm font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 disabled:opacity-50 border border-green-500/20"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
