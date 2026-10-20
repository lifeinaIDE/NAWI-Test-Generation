import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { reportsApi } from "../api";
import type { Report, ValidationMessage } from "../types";
import StatusBadge from "../components/StatusBadge";
import SkeletonLoader from "../components/SkeletonLoader";
import ErrorBanner from "../components/ErrorBanner";
import DisclaimerFooter from "../components/DisclaimerFooter";
import { useBackendUnreachable } from "../hooks/useBackendUnreachable";
import { useUnsavedChanges } from "../hooks/useUnsavedChanges";

import Step1Metadata, { type Step1FormData } from "../wizard/Step1Metadata";
import Step2InstrumentDetails, { type Step2FormData } from "../wizard/Step2InstrumentDetails";
import Step3Environment, { type Step3FormData } from "../wizard/Step3Environment";
import Step4TestSelection from "../wizard/Step4TestSelection";
import Step5TestDataEntry from "../wizard/Step5TestDataEntry";
import Step6Attachments from "../wizard/Step6Attachments";
import Step7ReviewAndSubmit from "../wizard/Step7ReviewAndSubmit";

const WIZARD_STEPS = [
  { id: 1, key: "metadata", label: "Metadata", title: "Report Metadata & Lab Jurisdiction" },
  { id: 2, key: "instrument", label: "Instrument", title: "Instrument Attributes & Verification Scale" },
  { id: 3, key: "environment", label: "Environment", title: "Atmospheric & Environmental Factors" },
  { id: 4, key: "test-selection", label: "Test Selection", title: "OIML R-76 Applicable Tests" },
  { id: 5, key: "test-data", label: "Test Data", title: "Observations & Live Calculations" },
  { id: 6, key: "attachments", label: "Attachments", title: "Photographs & Test Documentation" },
  { id: 7, key: "review-submit", label: "Review & Submit", title: "Final Review & Workflow Submission" },
];

export default function WizardShell() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isUnreachable = useBackendUnreachable();

  const [activeStep, setActiveStep] = useState(1);
  const [report, setReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [serverErrors, setServerErrors] = useState<ValidationMessage[]>([]);

  // Guard against accidental route changes or browser refresh
  useUnsavedChanges(isDirty);

  // Load report on mount or when id changes
  useEffect(() => {
    let isMounted = true;
    if (id && id !== "new") {
      setIsLoading(true);
      reportsApi
        .get(id)
        .then((data) => {
          if (isMounted) {
            setReport(data);
            setIsDirty(false);
          }
        })
        .catch((err) => {
          toast.error("Failed to load report");
          navigate("/repository");
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  // Save draft helper
  const saveDraftPayload = useCallback(
    async (payload: Partial<Report>): Promise<Report> => {
      setIsSaving(true);
      setServerErrors([]);
      try {
        let savedReport: Report;
        if (!report || !report.reportId || id === "new") {
          savedReport = await reportsApi.create(payload as any);
          setReport(savedReport);
          setIsDirty(false);
          toast.success(`Draft created (${savedReport.reportId})`);
          navigate(`/reports/${savedReport.reportId}`, { replace: true });
        } else {
          savedReport = await reportsApi.update(report.reportId, payload as any);
          setReport(savedReport);
          setIsDirty(false);
          toast.success("Draft saved successfully");
        }
        return savedReport;
      } catch (err: any) {
        if (err.messages && Array.isArray(err.messages)) {
          setServerErrors(err.messages);
        }
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [id, navigate, report]
  );

  // Handlers for step forms
  const handleSaveStep1 = async (data: Step1FormData) => {
    await saveDraftPayload({
      title: data.title,
      applicationNumber: data.applicationNumber,
      laboratory: data.laboratory as any,
    });
  };

  const handleSaveStep2 = async (data: Step2FormData) => {
    await saveDraftPayload({
      manufacturer: data.manufacturer as any,
      instrument: data.instrument as any,
    });
  };

  const handleSaveStep3 = async (data: Step3FormData) => {
    await saveDraftPayload({
      environment: data.environment as any,
    });
  };

  const nextStep = () => setActiveStep((prev) => Math.min(prev + 1, WIZARD_STEPS.length));
  const prevStep = () => setActiveStep((prev) => Math.max(prev - 1, 1));

  if (!isLoading && id && id !== "new" && !report) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto text-zinc-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-base font-medium text-zinc-200">Report Not Found</h3>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
          The requested report could not be loaded. You can return to the repository or start creating a new report.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Link
            to="/repository"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-xl transition-colors cursor-pointer border border-zinc-700"
          >
            ← Back to Repository
          </Link>
          <button
            type="button"
            onClick={() => navigate("/reports/new")}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            Create New Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-4 space-y-6">
      {serverErrors.length > 0 && (
        <ErrorBanner
          messages={serverErrors}
          onDismiss={() => setServerErrors([])}
        />
      )}

      {/* Wizard Header with Report ID, Status Chip, Unsaved-Changes Indicator, and Save Draft Button */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                OIML R-76 Report
              </span>
              <StatusBadge status={report?.status || "DRAFT"} size="sm" />
            </div>
            <h1 className="text-lg font-mono font-medium text-zinc-100 mt-0.5">
              {report?.reportId || "New Report Draft"}
            </h1>
          </div>
        </div>

        {/* Status indicators and Quick Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            {isDirty ? (
              <span className="flex items-center gap-1.5 text-amber-400 font-medium px-2.5 py-1 rounded-full bg-amber-950/40 border border-amber-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Unsaved changes
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                All changes saved
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={isSaving || isLoading || isUnreachable || Boolean(report && ["SUBMITTED_FOR_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"].includes(report.status))}
            onClick={() => {
              if (report) {
                saveDraftPayload(report);
              } else {
                toast("Please fill in Step 1 to save the initial draft.", { icon: "ℹ️" });
              }
            }}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 px-4 py-2 rounded-xl text-xs font-medium transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span>{isSaving ? "Saving..." : "Save Draft"}</span>
          </button>
        </div>
      </div>

      {/* Amber Reviewer Query Card (Technician Flow for QUERY_RAISED) */}
      {report?.status === "QUERY_RAISED" && (
        <div
          className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3 text-xs"
          data-testid="reviewer-query-card"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-semibold text-amber-400 flex items-center gap-2 text-sm">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Reviewer Correction Query Raised
            </span>
            <button
              type="button"
              disabled={isSaving || isUnreachable}
              onClick={async () => {
                if (!report?.reportId) return;
                setIsSaving(true);
                try {
                  await reportsApi.submit(report.reportId);
                  toast.success("Report resubmitted for review successfully!");
                  const updated = await reportsApi.get(report.reportId);
                  setReport(updated);
                } catch (err: any) {
                  const msg = err.messages?.[0]?.message || err.message || "Failed to resubmit.";
                  toast.error(msg);
                } finally {
                  setIsSaving(false);
                }
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-xl text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
              data-testid="resubmit-btn"
            >
              {isSaving ? "Submitting..." : "Resubmit for Review →"}
            </button>
          </div>
          <div className="text-amber-200/90 text-xs italic bg-amber-950/40 p-3.5 rounded-xl border border-amber-800/40">
            "{report.review?.reviewerComments || "Please review test observations and address discrepancies."}"
          </div>
          <div className="text-[11px] text-amber-400/80">
            Returned by reviewer {report.review?.reviewerId || "Reviewer"} on{" "}
            {report.review?.reviewedAt ? new Date(report.review.reviewedAt).toLocaleString() : "recently"}.
            You may edit any test observation or attachment and click Resubmit for Review.
          </div>
        </div>
      )}

      {/* Read-Only Notice for SUBMITTED_FOR_REVIEW and later */}
      {Boolean(report && ["SUBMITTED_FOR_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"].includes(report.status)) && (
        <div
          className="bg-zinc-900/80 border border-zinc-700/80 rounded-2xl p-4 flex items-center gap-3 text-zinc-300 text-xs"
          data-testid="readonly-status-banner"
        >
          <svg className="w-5 h-5 text-sky-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <div>
            <span className="font-semibold text-zinc-100">
              Report is currently {report?.status} (Read-Only)
            </span>
            <div className="text-zinc-500 text-[11px] mt-0.5">
              Direct modifications are locked while this report is awaiting or finalized by metrological review.
            </div>
          </div>
        </div>
      )}

      {/* 7-Step Stepper Navigation */}
      <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
          {WIZARD_STEPS.map((s) => {
            const isActive = activeStep === s.id;
            const isCompleted = activeStep > s.id;

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActiveStep(s.id)}
                className={`p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                  isActive
                    ? "bg-zinc-800 border-zinc-600 text-zinc-100 shadow-sm"
                    : isCompleted
                    ? "bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800/50"
                    : "bg-zinc-950/40 border-transparent text-zinc-500 hover:text-zinc-400"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider">Step {s.id}</span>
                  {isCompleted && (
                    <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div className="text-xs font-medium truncate mt-0.5">{s.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Container */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 sm:p-8 backdrop-blur-sm min-h-[420px]">
        {isLoading ? (
          <SkeletonLoader count={3} />
        ) : (
          <>
            {activeStep === 1 && (
              <Step1Metadata
                report={report}
                serverErrors={serverErrors}
                onSave={handleSaveStep1}
                onNext={nextStep}
                onDirtyChange={setIsDirty}
                isLoading={isSaving}
              />
            )}

            {activeStep === 2 && (
              <Step2InstrumentDetails
                report={report}
                serverErrors={serverErrors}
                onSave={handleSaveStep2}
                onNext={nextStep}
                onPrev={prevStep}
                onDirtyChange={setIsDirty}
                isLoading={isSaving}
              />
            )}

            {activeStep === 3 && (
              <Step3Environment
                report={report}
                serverErrors={serverErrors}
                onSave={handleSaveStep3}
                onNext={nextStep}
                onPrev={prevStep}
                onDirtyChange={setIsDirty}
                isLoading={isSaving}
              />
            )}

            {activeStep === 4 && (
              <Step4TestSelection
                report={report}
                onSave={async (data: any) => {
                  await saveDraftPayload({ tests: data });
                }}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}

            {activeStep === 5 && (
              <Step5TestDataEntry
                report={report!}
                onSave={saveDraftPayload}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}

            {activeStep === 6 && (
              <Step6Attachments
                report={report!}
                onNext={nextStep}
                onPrev={prevStep}
              />
            )}

            {activeStep === 7 && (
              <Step7ReviewAndSubmit
                report={report!}
                onPrev={prevStep}
                onNavigateStep={(step: number) => setActiveStep(step)}
                onSaveDraft={async () => {
                  if (report) await saveDraftPayload(report);
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
