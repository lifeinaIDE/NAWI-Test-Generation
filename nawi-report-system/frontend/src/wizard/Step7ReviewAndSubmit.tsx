import React, { useState, useEffect } from "react";
import type { Report, ValidationMessage } from "../types";
import { reportsApi } from "../api";
import StatusBadge from "../components/StatusBadge";
import toast from "react-hot-toast";

interface Step7Props {
  report: Report;
  onPrev: () => void;
  onNavigateStep?: (step: number) => void;
  onSaveDraft?: () => Promise<void>;
  onReportUpdated?: () => void;
}

export default function Step7ReviewAndSubmit({
  report,
  onPrev,
  onNavigateStep,
  onSaveDraft,
  onReportUpdated,
}: Step7Props) {
  const [validationMessages, setValidationMessages] = useState<ValidationMessage[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch server validation messages on mount
  const runValidation = async () => {
    if (!report?.reportId) return;
    setIsValidating(true);
    try {
      const data = await reportsApi.validate(report.reportId);
      setValidationMessages(data.messages || []);
    } catch (err: any) {
      if (err.messages && Array.isArray(err.messages)) {
        setValidationMessages(err.messages);
      } else {
        toast.error("Failed to run report validation.");
      }
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    runValidation();
  }, [report?.reportId]);

  // Group messages
  const errorMessages = validationMessages.filter((m) => m.level === "ERROR");
  const warningMessages = validationMessages.filter((m) => m.level === "WARNING");
  const infoMessages = validationMessages.filter((m) => m.level === "INFO");

  const hasErrors = errorMessages.length > 0;
  const isSubmitDisabled = hasErrors || !isConfirmed;

  // Map field path to wizard step number
  const mapFieldToStep = (field?: string): { step: number; label: string } => {
    if (!field) return { step: 1, label: "Step 1" };
    const f = field.toLowerCase();
    if (f.startsWith("instrument") || f.includes("capacity") || f.includes("accuracy") || f.includes("interval")) {
      return { step: 2, label: "Step 2: Instrument" };
    }
    if (f.startsWith("environment") || f.includes("temperature") || f.includes("humidity")) {
      return { step: 3, label: "Step 3: Environment" };
    }
    if (f.startsWith("tests.") && (f.includes("weighing") || f.includes("eccentricity") || f.includes("repeatability") || f.includes("discrimination"))) {
      return { step: 5, label: "Step 5: Test Data" };
    }
    if (f.startsWith("tests")) {
      return { step: 4, label: "Step 4: Test Selection" };
    }
    if (f.includes("attachment") || f.includes("cert") || f.includes("photo")) {
      return { step: 6, label: "Step 6: Attachments" };
    }
    return { step: 1, label: "Step 1: Metadata" };
  };

  const handleSaveDraftClick = async () => {
    if (onSaveDraft) {
      setIsSaving(true);
      try {
        await onSaveDraft();
        toast.success("Draft saved.");
        await runValidation();
      } finally {
        setIsSaving(false);
      }
    } else {
      toast.success("Draft state is up to date.");
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitClick = async () => {
    if (isSubmitDisabled || !report?.reportId) return;
    setIsSubmitting(true);
    try {
      await reportsApi.submit(report.reportId);
      toast.success("Report submitted for review successfully!");
      if (onReportUpdated) {
        onReportUpdated();
      }
    } catch (err: any) {
      const msg = err.messages?.[0]?.message || err.message || "Failed to submit report.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const applicableTests = (report?.tests || []).filter((t) => t.applicable);

  return (
    <div className="space-y-8">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-medium text-zinc-100 tracking-tight">
          Step 7: Final Review & Submission Validation
        </h2>
        <p className="text-zinc-500 text-xs mt-1">
          Review all compiled metrological data and verify compliance against server rule constraints.
        </p>
      </div>

      {/* Validation Summary Box (Grouped ERROR / WARNING / INFO) */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-4" data-testid="validation-summary">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-semibold text-zinc-200">Server Validation Summary</h3>
            {isValidating && (
              <span className="text-xs text-sky-400 animate-pulse font-mono flex items-center gap-1">
                <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Validating...
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={runValidation}
            disabled={isValidating}
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Re-run Validation
          </button>
        </div>

        {validationMessages.length === 0 && !isValidating && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>All verification rules satisfied. Zero blocking errors or metrological warnings detected.</span>
          </div>
        )}

        {/* ERROR Messages */}
        {errorMessages.length > 0 && (
          <div className="space-y-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              Blocking Errors ({errorMessages.length})
            </div>
            <div className="space-y-1.5">
              {errorMessages.map((msg, i) => {
                const nav = mapFieldToStep(msg.field);
                return (
                  <div
                    key={i}
                    className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2"
                    data-testid="validation-error-item"
                  >
                    <div className="flex items-center gap-2 text-rose-300">
                      <span className="font-semibold px-1.5 py-0.5 rounded bg-rose-500/20 text-[10px] text-rose-300">
                        ERROR
                      </span>
                      <span>{msg.message}</span>
                    </div>
                    {onNavigateStep && (
                      <button
                        type="button"
                        onClick={() => onNavigateStep(nav.step)}
                        className="text-[11px] text-sky-400 hover:text-sky-300 font-medium underline flex items-center gap-1 cursor-pointer"
                        data-testid="goto-field-link"
                      >
                        Go to {nav.label} →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* WARNING Messages */}
        {warningMessages.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Metrological Warnings ({warningMessages.length})
            </div>
            <div className="space-y-1.5">
              {warningMessages.map((msg, i) => {
                const nav = mapFieldToStep(msg.field);
                return (
                  <div
                    key={i}
                    className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2"
                    data-testid="validation-warning-item"
                  >
                    <div className="flex items-center gap-2 text-amber-300">
                      <span className="font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] text-amber-300">
                        WARNING
                      </span>
                      <span>{msg.message}</span>
                    </div>
                    {onNavigateStep && (
                      <button
                        type="button"
                        onClick={() => onNavigateStep(nav.step)}
                        className="text-[11px] text-sky-400 hover:text-sky-300 font-medium underline flex items-center gap-1 cursor-pointer"
                      >
                        Go to {nav.label} →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* INFO Messages */}
        {infoMessages.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              System Notices ({infoMessages.length})
            </div>
            <div className="space-y-1.5">
              {infoMessages.map((msg, i) => {
                const nav = mapFieldToStep(msg.field);
                return (
                  <div
                    key={i}
                    className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2"
                    data-testid="validation-info-item"
                  >
                    <div className="flex items-center gap-2 text-sky-300">
                      <span className="font-semibold px-1.5 py-0.5 rounded bg-sky-500/20 text-[10px] text-sky-300">
                        INFO
                      </span>
                      <span>{msg.message}</span>
                    </div>
                    {onNavigateStep && (
                      <button
                        type="button"
                        onClick={() => onNavigateStep(nav.step)}
                        className="text-[11px] text-sky-400 hover:text-sky-300 font-medium underline flex items-center gap-1 cursor-pointer"
                      >
                        Go to {nav.label} →
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Read-Only Summary Accordions / Sections */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-zinc-300">Read-Only Report Summary</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Metadata & Instrument */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-semibold text-zinc-300">Instrument Specifications</span>
              <StatusBadge status={report?.status || "DRAFT"} size="sm" />
            </div>
            <div className="text-xs space-y-1.5 text-zinc-400">
              <div className="flex justify-between">
                <span>Report ID:</span>
                <span className="font-mono text-zinc-200">{report?.reportId || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Model / Serial:</span>
                <span className="text-zinc-200">{report?.instrument?.model || "—"} ({report?.instrument?.serialNumber || "—"})</span>
              </div>
              <div className="flex justify-between">
                <span>Accuracy Class:</span>
                <span className="text-zinc-200 font-mono">Class {report?.instrument?.accuracyClass || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Capacity Range:</span>
                <span className="text-zinc-200 font-mono">Min {report?.instrument?.minCapacity} to Max {report?.instrument?.maxCapacity}</span>
              </div>
              <div className="flex justify-between">
                <span>Scale Intervals (e / d):</span>
                <span className="text-zinc-200 font-mono">e = {report?.instrument?.verificationIntervalE}, d = {report?.instrument?.actualIntervalD}</span>
              </div>
              <div className="flex justify-between">
                <span>Number of Intervals (n):</span>
                <span className="text-zinc-200 font-mono">{report?.instrument?.numberOfIntervalsN || "—"}</span>
              </div>
            </div>
          </div>

          {/* Environmental Factors & Attachments */}
          <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <span className="text-xs font-semibold text-zinc-300">Environment & Supporting Files</span>
            </div>
            <div className="text-xs space-y-1.5 text-zinc-400">
              <div className="flex justify-between">
                <span>Temperature Range:</span>
                <span className="text-zinc-200">
                  {report?.environment?.temperatureStart !== undefined
                    ? `${report.environment.temperatureStart} °C – ${report.environment.temperatureEnd} °C`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Relative Humidity:</span>
                <span className="text-zinc-200">
                  {report?.environment?.relativeHumidity !== undefined
                    ? `${report.environment.relativeHumidity} %`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Barometric Pressure:</span>
                <span className="text-zinc-200">
                  {report?.environment?.barometricPressure !== undefined &&
                  report?.environment?.barometricPressure !== null
                    ? `${report.environment.barometricPressure} hPa`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total Attachments:</span>
                <span className="text-zinc-200">{report?.attachments?.length || 0} file(s)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tests Table Summary */}
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-5 space-y-3">
          <div className="text-xs font-semibold text-zinc-300 border-b border-zinc-800 pb-2">
            OIML R-76 Test Execution Summary ({applicableTests.length} Applicable)
          </div>
          {applicableTests.length === 0 ? (
            <div className="text-xs text-zinc-500 py-2">No tests configured as applicable.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="text-[11px] uppercase text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="py-2 px-2">Test Name</th>
                    <th className="py-2 px-2">Compliance Result</th>
                    <th className="py-2 px-2">Limit Checked</th>
                    <th className="py-2 px-2">Error / Range</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {applicableTests.map((t) => {
                    const res = t.result || (t.calculations as any)?.result || "INCOMPLETE";
                    let badgeColor = "bg-zinc-800 text-zinc-400 border-zinc-700";
                    if (res === "PASS") badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                    if (res === "WARNING") badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/30";
                    if (res === "FAIL") badgeColor = "bg-rose-500/10 text-rose-400 border-rose-500/30";

                    return (
                      <tr key={t.testCode}>
                        <td className="py-2.5 px-2 font-medium text-zinc-200">{t.testName}</td>
                        <td className="py-2.5 px-2">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold border ${badgeColor}`}>
                            {res}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 font-mono text-[11px] text-zinc-400">
                          {(t.calculations as any)?.criterion || "—"}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-[11px] text-zinc-400">
                          {(t.calculations as any)?.observedError !== undefined
                            ? (t.calculations as any).observedError
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Declaration Checkbox */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isConfirmed}
            onChange={(e) => setIsConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            data-testid="declaration-checkbox"
          />
          <div className="text-xs text-zinc-300">
            <span className="font-medium text-zinc-100">
              I confirm the details are correct.
            </span>
            <p className="text-zinc-500 text-[11px] mt-0.5">
              By checking this box, you certify under metrological laboratory standards that all observations recorded accurately represent physical instrument testing under OIML R-76 guidelines.
            </p>
          </div>
        </label>
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-6 border-t border-zinc-800/60">
        <button
          type="button"
          onClick={onPrev}
          className="px-5 py-2 rounded-xl text-xs font-medium border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          ← Back to Step 6
        </button>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveDraftClick}
            className="px-5 py-2 rounded-xl text-xs font-medium border border-zinc-700 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all cursor-pointer"
          >
            {isSaving ? "Saving..." : "Save Draft"}
          </button>

          <button
            type="button"
            disabled={isSubmitDisabled || isSubmitting}
            onClick={handleSubmitClick}
            title={
              hasErrors
                ? "Resolve all blocking ERROR messages before submitting"
                : !isConfirmed
                ? "You must confirm the declaration checkbox"
                : "Submit report for metrological review"
            }
            className={`px-6 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
              isSubmitDisabled || isSubmitting
                ? "bg-zinc-800 text-zinc-600 border border-zinc-800 cursor-not-allowed opacity-60"
                : "bg-sky-500 hover:bg-sky-400 text-white shadow-[0_0_15px_rgba(14,165,233,0.3)] cursor-pointer"
            }`}
            data-testid="submit-for-review-btn"
          >
            {isSubmitting ? "Submitting..." : "Submit for Review"}
          </button>
        </div>
      </div>
    </div>
  );
}
