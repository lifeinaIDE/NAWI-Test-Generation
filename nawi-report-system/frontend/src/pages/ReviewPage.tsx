import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { reportsApi, attachmentsApi } from "../api";
import type { Report, AuditEvent, Attachment } from "../types";
import StatusBadge from "../components/StatusBadge";
import SkeletonLoader from "../components/SkeletonLoader";
import ConfirmModal from "../components/ConfirmModal";
import ErrorBanner from "../components/ErrorBanner";
import useBackendUnreachable from "../hooks/useBackendUnreachable";
import ReviewQueuePage from "./ReviewQueuePage";

export default function ReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isUnreachable = useBackendUnreachable();

  // If no ID is provided in URL, render the ReviewQueuePage
  if (!id) {
    return <ReviewQueuePage />;
  }

  const [report, setReport] = useState<Report | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Modal State
  const [modalAction, setModalAction] = useState<"approve" | "reject" | "returnReport" | null>(null);

  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const rep = await reportsApi.get(id);
      setReport(rep);

      // Load audit trail
      try {
        const events = await reportsApi.getAudit(id);
        setAuditEvents(events || []);
      } catch {
        setAuditEvents([]);
      }

      // Load attachments
      try {
        const atts = await attachmentsApi.list(id);
        setAttachments(atts || rep.attachments || []);
      } catch {
        setAttachments(rep.attachments || []);
      }
    } catch {
      toast.error("Failed to load report for review.");
      navigate("/review");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [id]);

  const handleActionClick = (action: "approve" | "reject" | "returnReport") => {
    if (!comment.trim()) {
      toast.error("A review comment is required before proceeding.");
      return;
    }
    setModalAction(action);
  };

  const handleConfirmAction = async () => {
    if (!modalAction || !report) return;
    setIsSubmitting(true);
    try {
      if (modalAction === "approve") {
        await reportsApi.approve(report.reportId, comment.trim());
        toast.success("Report approved successfully!");
      } else if (modalAction === "returnReport") {
        await reportsApi.returnReport(report.reportId, comment.trim());
        toast.success("Report returned to technician for corrections.");
      } else if (modalAction === "reject") {
        await reportsApi.reject(report.reportId, comment.trim());
        toast.success("Report rejected.");
      }
      setModalAction(null);
      navigate("/review");
    } catch (err: any) {
      const msg = err.messages?.[0]?.message || err.message || "Action failed";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTestBadgeColor = (res?: string) => {
    if (res === "PASS") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    if (res === "WARNING") return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    if (res === "FAIL") return "bg-rose-500/10 text-rose-400 border-rose-500/30";
    return "bg-zinc-800 text-zinc-400 border-zinc-700";
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-8 space-y-4">
        <SkeletonLoader count={4} />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <h3 className="text-base font-medium text-zinc-200">Report Not Found</h3>
        <p className="text-xs text-zinc-500">The requested report could not be found or has been removed.</p>
        <div>
          <Link
            to="/review"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-zinc-800 text-zinc-200 hover:text-white transition-all cursor-pointer"
          >
            ← Return to Review Queue
          </Link>
        </div>
      </div>
    );
  }

  const applicableTests = (report.tests || []).filter((t) => t.applicable);
  const frozenRuleSet = report.ruleSetVersion || "OIML-R76-PROTOTYPE-V1";

  return (
    <div className="max-w-7xl mx-auto py-4 space-y-6">
      {/* Dismissible API Error Banner */}
      {apiError && (
        <ErrorBanner
          message={apiError}
          onDismiss={() => setApiError(null)}
          title="Review Authorization Notice"
        />
      )}

      {/* Top Breadcrumb & Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link
            to="/review"
            className="text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Review Queue
          </Link>
          <span className="text-zinc-700">/</span>
          <span className="font-mono text-sm font-medium text-sky-400">{report.reportId}</span>
          <StatusBadge status={report.status} size="sm" />
        </div>

        {/* Locked Rule-Set Label */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs"
          data-testid="locked-ruleset-banner"
        >
          <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-zinc-400">Locked Rule-Set:</span>
          <span className="font-mono text-zinc-200 font-medium" data-testid="frozen-ruleset-label">
            {frozenRuleSet}
          </span>
        </div>
      </div>

      {/* READ-ONLY 3-COLUMN VIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUMN 1: Report & Instrument Details (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Metadata Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2">
              Report & Jurisdiction
            </h3>
            <div className="text-xs space-y-2 text-zinc-400">
              <div className="flex justify-between">
                <span>Application No:</span>
                <span className="font-mono text-zinc-200">{report.applicationNumber || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Technician:</span>
                <span className="text-zinc-200">{report.createdBy || report.technicianId || "technician"}</span>
              </div>
              <div className="flex justify-between">
                <span>Submission Date:</span>
                <span className="text-zinc-200 font-mono text-[11px]">
                  {report.updatedAt ? new Date(report.updatedAt).toLocaleString() : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Laboratory:</span>
                <span className="text-zinc-200">{report.laboratory?.name || "Metrology Lab"}</span>
              </div>
            </div>
          </div>

          {/* Instrument Specs Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2">
              Instrument Parameters
            </h3>
            <div className="text-xs space-y-2 text-zinc-400">
              <div className="flex justify-between">
                <span>Model / Serial:</span>
                <span className="text-zinc-200 font-medium">
                  {report.instrument?.model || "—"} ({report.instrument?.serialNumber || "—"})
                </span>
              </div>
              <div className="flex justify-between">
                <span>Accuracy Class:</span>
                <span className="font-mono text-sky-400 font-semibold">
                  Class {report.instrument?.accuracyClass || "III"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Capacity (Max / Min):</span>
                <span className="font-mono text-zinc-200">
                  {report.instrument?.minCapacity} to {report.instrument?.maxCapacity} {report.instrument?.unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Scale Intervals (e / d):</span>
                <span className="font-mono text-zinc-200">
                  e = {report.instrument?.verificationIntervalE}, d = {report.instrument?.actualIntervalD}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Interval Count (n):</span>
                <span className="font-mono text-zinc-200">{report.instrument?.numberOfIntervalsN || "—"}</span>
              </div>
            </div>
          </div>

          {/* Environmental Conditions Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2">
              Atmospheric Environment
            </h3>
            <div className="text-xs space-y-2 text-zinc-400">
              <div className="flex justify-between">
                <span>Temperature Range:</span>
                <span className="text-zinc-200 font-mono">
                  {report.environment?.temperatureStart ?? "—"} °C – {report.environment?.temperatureEnd ?? "—"} °C
                </span>
              </div>
              <div className="flex justify-between">
                <span>Relative Humidity:</span>
                <span className="text-zinc-200 font-mono">
                  {report.environment?.relativeHumidity ?? "—"} %
                </span>
              </div>
              <div className="flex justify-between">
                <span>Barometric Pressure:</span>
                <span className="text-zinc-200 font-mono">
                  {report.environment?.barometricPressure ? `${report.environment.barometricPressure} hPa` : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Tests with Result Badges & Failure Reasons (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Metrological Tests ({applicableTests.length})
              </h3>
              <span className="text-[11px] text-zinc-500 font-mono">Server Verified</span>
            </div>

            <div className="space-y-4">
              {applicableTests.map((t) => {
                const res = t.result || (t.calculations as any)?.result || "INCOMPLETE";
                const failureReason =
                  (t.calculations as any)?.failureReason ||
                  (res === "FAIL" ? "Exceeded Maximum Permissible Error (MPE) threshold." : null);
                const criterion = (t.calculations as any)?.criterion;
                const mpe = (t.calculations as any)?.maxPermissibleError ?? (t.calculations as any)?.mpe;
                const obsErr = (t.calculations as any)?.observedError;

                return (
                  <div
                    key={t.testCode}
                    className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 space-y-2.5"
                    data-testid={`review-test-${t.testCode}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-200">{t.testName}</span>
                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-semibold border ${getTestBadgeColor(res)}`}
                        data-testid={`badge-${t.testCode}`}
                      >
                        {res}
                      </span>
                    </div>

                    {/* Criterion and Error Values */}
                    <div className="text-[11px] font-mono text-zinc-400 space-y-1 bg-zinc-900/40 p-2 rounded-lg border border-zinc-900">
                      {criterion && (
                        <div>
                          <span className="text-zinc-500">Limit:</span> {criterion}
                        </div>
                      )}
                      {mpe !== undefined && mpe !== null && (
                        <div>
                          <span className="text-zinc-500">MPE:</span> ±{mpe}
                        </div>
                      )}
                      {obsErr !== undefined && obsErr !== null && (
                        <div>
                          <span className="text-zinc-500">Observed Error / Range:</span> {obsErr}
                        </div>
                      )}
                    </div>

                    {/* Failure Reason box if FAIL */}
                    {res === "FAIL" && failureReason && (
                      <div
                        className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-lg text-xs text-rose-300 space-y-1"
                        data-testid={`failure-reason-${t.testCode}`}
                      >
                        <div className="font-semibold text-rose-400 text-[11px] flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Non-conformity Reason
                        </div>
                        <div className="text-[11px]">{failureReason}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* COLUMN 3: Attachments & Audit Timeline (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Attachments Card */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2">
              Attachments ({attachments.length})
            </h3>
            {attachments.length === 0 ? (
              <div className="text-xs text-zinc-500 py-1">No documents attached.</div>
            ) : (
              <div className="space-y-2">
                {attachments.map((att) => {
                  const attId = att.attachmentId || (att as any).id;
                  const isCert = (att.category || "").includes("cert");
                  const isExpired = isCert && att.expiryDate && new Date(att.expiryDate) < new Date();

                  return (
                    <div
                      key={attId}
                      className="p-2.5 bg-zinc-950/70 border border-zinc-800/80 rounded-xl flex items-center justify-between text-xs gap-2"
                      data-testid={`review-att-${attId}`}
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-zinc-200 truncate">{att.filename}</div>
                        <div className="text-[10px] text-zinc-500 flex items-center gap-2 mt-0.5">
                          <span>{formatFileSize(att.sizeBytes || (att as any).size)}</span>
                          {att.expiryDate && (
                            <span className={isExpired ? "text-rose-400 font-semibold" : "text-emerald-400 font-mono"}>
                              Exp: {att.expiryDate} {isExpired ? "(EXPIRED)" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                      <a
                        href={attachmentsApi.getDownloadUrl(report.reportId, attId)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
                      >
                        View
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Complete Audit Timeline */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-3" data-testid="audit-timeline">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 pb-2">
              Audit Timeline ({auditEvents.length})
            </h3>
            {auditEvents.length === 0 ? (
              <div className="text-xs text-zinc-500 py-1">No prior audit records.</div>
            ) : (
              <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-800">
                {auditEvents.map((ev, i) => (
                  <div key={i} className="pl-6 relative text-xs space-y-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 absolute left-[3px] top-1 border-2 border-zinc-900" />
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-zinc-200 font-mono text-[11px]">{ev.action}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      By: <span className="font-medium text-zinc-300">{ev.userId}</span> ({ev.userRole || ev.role})
                    </div>
                    {ev.comment && (
                      <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded p-1.5 mt-1 italic">
                        "{ev.comment}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REVIEWER DECISION CARD */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100">Reviewer Authorization Decision</h3>
          <span className="text-xs text-zinc-500">
            A substantive review comment is strictly required for any status authorization.
          </span>
        </div>

        <div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter mandatory reviewer comments, feedback, or authorization rationale..."
            rows={3}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            data-testid="reviewer-comment-input"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          {/* Return for Correction */}
          <button
            type="button"
            disabled={isSubmitting || isUnreachable}
            onClick={() => handleActionClick("returnReport")}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            data-testid="return-btn"
          >
            Return for Correction
          </button>

          {/* Reject */}
          <button
            type="button"
            disabled={isSubmitting || isUnreachable}
            onClick={() => handleActionClick("reject")}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
            data-testid="reject-btn"
          >
            Reject Report
          </button>

          {/* Approve */}
          <button
            type="button"
            disabled={isSubmitting || isUnreachable}
            onClick={() => handleActionClick("approve")}
            className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer disabled:opacity-50"
            data-testid="approve-btn"
          >
            Approve Report
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={modalAction === "returnReport"}
        title="Confirm Return for Correction"
        message={`Are you sure you want to return report ${report.reportId} to the technician with the specified comment? The report will return to QUERY_RAISED status.`}
        confirmLabel="Confirm Return"
        onConfirm={handleConfirmAction}
        onCancel={() => setModalAction(null)}
      />

      <ConfirmModal
        isOpen={modalAction === "reject"}
        title="Confirm Report Rejection"
        message={`Are you sure you want to reject report ${report.reportId}? This will terminate review and mark the instrument as REJECTED.`}
        confirmLabel="Confirm Rejection"
        isDangerous={true}
        onConfirm={handleConfirmAction}
        onCancel={() => setModalAction(null)}
      />

      <ConfirmModal
        isOpen={modalAction === "approve"}
        title="Confirm Report Approval"
        message={`Are you sure you want to approve report ${report.reportId}? The metrological compliance decision will be authorized and status updated to APPROVED.`}
        confirmLabel="Authorize & Approve"
        onConfirm={handleConfirmAction}
        onCancel={() => setModalAction(null)}
      />
    </div>
  );
}
