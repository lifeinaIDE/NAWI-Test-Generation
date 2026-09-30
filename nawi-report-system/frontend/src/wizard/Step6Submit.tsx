import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { reportsApi } from "../api";
import type { Report } from "../types";
import toast from "react-hot-toast";

export default function Step6Submit({ report, onPrev }: any) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!report?.reportId) return;
    setIsSubmitting(true);
    try {
      await reportsApi.submit(report.reportId);
      toast.success("Report submitted for review!");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="text-center py-12">
      <h2 className="text-3xl font-light text-zinc-100 mb-4">Ready to Submit</h2>
      <p className="text-zinc-400 mb-12">All test data and metadata have been recorded. You can now submit this report for review.</p>
      
      <div className="flex justify-center gap-6">
        <button
          type="button"
          onClick={onPrev}
          className="text-zinc-400 hover:text-zinc-100 px-8 py-3 rounded-full font-medium transition-colors border border-zinc-800 hover:border-zinc-700"
        >
          Back to Edit
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="bg-zinc-100 hover:bg-white text-zinc-950 px-8 py-3 rounded-full font-medium transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          {isSubmitting ? "Submitting..." : (report?.status === "QUERY_RAISED" ? "Resubmit Report" : "Submit Report")}
        </button>
      </div>
    </div>
  );
}
