import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { reportsApi } from "../api";
import type { Report } from "../types";
import StatusBadge from "../components/StatusBadge";
import SkeletonLoader from "../components/SkeletonLoader";
import ErrorBanner from "../components/ErrorBanner";
import DisclaimerFooter from "../components/DisclaimerFooter";
import { useBackendUnreachable } from "../hooks/useBackendUnreachable";

export default function ReportViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isUnreachable = useBackendUnreachable();

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    match: boolean;
    storedHash: string;
    computedHash: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setErrorMsg(null);
    reportsApi
      .get(id)
      .then((data) => setReport(data))
      .catch((err: any) => {
        const msg = err.message || "Failed to load report details";
        setErrorMsg(msg);
        toast.error("Failed to load report details");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      const blob = await reportsApi.downloadPdf(report.reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NAWI_Report_${report.reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Official PDF downloaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleVerify = async () => {
    if (!report) return;
    setVerifying(true);
    try {
      const res = await reportsApi.verify(report.reportId);
      setVerifyResult({
        match: res.match,
        storedHash: res.storedHash,
        computedHash: res.computedHash,
      });
      setShowVerifyModal(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to verify integrity hash");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <SkeletonLoader count={4} />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        {errorMsg && (
          <div className="mb-4">
            <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />
          </div>
        )}
        <div className="w-12 h-12 rounded-full bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center mx-auto text-zinc-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-base font-medium text-zinc-200">Report Not Found</h3>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto">
          The requested report could not be found or has been archived. Return to the repository to view available reports.
        </p>
        <div className="pt-2">
          <Link
            to="/repository"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
          >
            ← Back to Repository
          </Link>
        </div>
      </div>
    );
  }

  const isImmutable = ["APPROVED", "REJECTED"].includes(report.status);
  const finalResultColor =
    report.finalResult === "PASS"
      ? "text-emerald-700 bg-emerald-50 border-emerald-300"
      : report.finalResult === "FAIL"
      ? "text-rose-700 bg-rose-50 border-rose-300"
      : "text-amber-700 bg-amber-50 border-amber-300";

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {errorMsg && (
        <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />
      )}

      {/* Top Navigation & Breadcrumbs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            to="/repository"
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Repository
          </Link>
          <span className="text-zinc-600">/</span>
          <span className="text-xs font-mono text-zinc-300">{report.reportId}</span>
        </div>

        {/* Edit link if mutable */}
        {!isImmutable && (
          <Link
            to={`/reports/${report.reportId}`}
            className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            Edit in Wizard &rarr;
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* LEFT / CENTER: A4-Style Metrological Report Document Preview */}
        <div className="lg:col-span-3">
          <div className="bg-white text-slate-900 shadow-2xl rounded-sm p-10 sm:p-14 border border-slate-200 min-h-[1123px] flex flex-col justify-between font-sans relative">
            <div>
              {/* Item 1: Report Title */}
              <div className="text-center pb-6 border-b border-slate-200">
                <span className="text-[10px] tracking-widest uppercase font-bold text-slate-500">
                  Legal Metrology Directorate • OIML R-76 Pattern Evaluation
                </span>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 uppercase mt-1">
                  Non-Automatic Weighing Instrument Test Report [1]
                </h1>
                <p className="text-xs text-slate-600 mt-0.5">
                  Pattern Conformity Examination per OIML Recommendation R-76-1:2006
                </p>
              </div>

              {/* Administrative Overview Header (Items 2, 3, 20, 17, 18, 19, 15) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 text-xs border-b border-slate-200 bg-slate-50/60 p-4 rounded mt-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Report ID [2]</span>
                  <span className="font-mono font-bold text-sky-700">{report.reportId}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Application No [3]</span>
                  <span className="font-medium text-slate-800">{report.applicationNumber || "N/A"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Rule-Set Version [20]</span>
                  <span className="font-mono text-slate-800">{report.ruleSetVersion || "OIML-R76-PROTOTYPE-V1"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Overall Result [15]</span>
                  <span className={`inline-block font-bold px-2 py-0.5 rounded text-[10px] border ${finalResultColor}`}>
                    {report.finalResult || "PENDING"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Technician [17]</span>
                  <span className="text-slate-800">{report.createdBy || "Technician"}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Reviewer [18]</span>
                  <span className="text-slate-800">{report.review?.reviewerId || "Pending"}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Approval Date [19]</span>
                  <span className="text-slate-800">
                    {report.review?.reviewedAt ? new Date(report.review.reviewedAt).toLocaleString() : "Pending Authorization"}
                  </span>
                </div>
              </div>

              {/* Items 4, 5: Laboratory & Manufacturer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 text-xs">
                <div className="border border-slate-200 rounded p-3">
                  <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-1 mb-2">
                    Testing Laboratory Details [4]
                  </h3>
                  <div className="space-y-1 text-slate-600">
                    <p><b className="text-slate-700">Name:</b> {report.laboratory?.name || "Central Legal Metrology Laboratory"}</p>
                    <p><b className="text-slate-700">Address:</b> {report.laboratory?.address || "National Standards Campus, Sector 4"}</p>
                    <p><b className="text-slate-700">Location:</b> {report.laboratory?.location || "Directorate Hub"}</p>
                    <p><b className="text-slate-700">Contact:</b> {report.laboratory?.contact || "metrology@gov.in"}</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded p-3">
                  <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-1 mb-2">
                    Manufacturer Details [5]
                  </h3>
                  <div className="space-y-1 text-slate-600">
                    <p><b className="text-slate-700">Name:</b> {report.manufacturer?.name || "Precision Balances Ltd."}</p>
                    <p><b className="text-slate-700">Address:</b> {report.manufacturer?.address || "Industrial Area Phase 2"}</p>
                    <p><b className="text-slate-700">Country:</b> {report.manufacturer?.country || "India"}</p>
                  </div>
                </div>
              </div>

              {/* Item 6: Instrument Details */}
              <div className="border border-slate-200 rounded p-3 mb-4 text-xs">
                <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-1 mb-2">
                  Instrument Technical Specifications [6]
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
                  <div><b>Model:</b> {report.instrument?.model || "N/A"}</div>
                  <div><b>Serial No:</b> {report.instrument?.serialNumber || "N/A"}</div>
                  <div><b>Type:</b> {report.instrument?.type || "ELECTRONIC"}</div>
                  <div><b>Accuracy Class:</b> Class {report.instrument?.accuracyClass || "III"}</div>
                  <div><b>Max Capacity:</b> {report.instrument?.maxCapacity} {report.instrument?.unit || "kg"}</div>
                  <div><b>Min Capacity:</b> {report.instrument?.minCapacity} {report.instrument?.unit || "kg"}</div>
                  <div><b>Scale Interval (e):</b> {report.instrument?.verificationIntervalE} {report.instrument?.unit || "kg"}</div>
                  <div><b>Actual Interval (d):</b> {report.instrument?.actualIntervalD} {report.instrument?.unit || "kg"}</div>
                  <div><b>Intervals (n):</b> {report.instrument?.numberOfIntervalsN || "N/A"}</div>
                  <div><b>Software Ver:</b> {report.instrument?.softwareVersion || "1.0"}</div>
                </div>
              </div>

              {/* Items 7, 8, 9: Environment, Test Equipment, Calibration Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-xs">
                <div className="border border-slate-200 rounded p-3">
                  <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-1 mb-2">
                    Environmental Conditions [7]
                  </h3>
                  <div className="space-y-1 text-slate-600">
                    <p><b>Temperature:</b> {report.environment?.temperatureStart}°C (Start) &rarr; {report.environment?.temperatureEnd}°C (End)</p>
                    <p><b>Relative Humidity:</b> {report.environment?.relativeHumidity}%</p>
                    <p><b>Barometric Pressure:</b> {report.environment?.barometricPressure || "1013.25"} hPa</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded p-3">
                  <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-1 mb-2">
                    Equipment [8] &amp; Calibration Information [9]
                  </h3>
                  <div className="space-y-1 text-slate-600">
                    <p><b>Standards [8]:</b> OIML Class E2 &amp; F1 Working Mass Standards</p>
                    <p><b>Certificate [9]:</b> NPL/MASS/2026/0411 (Traceable to BIPM / NPL)</p>
                    <p><b>Validity:</b> Valid through 2027-12-31</p>
                  </div>
                </div>
              </div>

              {/* Items 10, 11, 12, 13, 14: Observations Table Per Test */}
              <div className="mb-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Metrological Observations &amp; Calculated Errors
                </h3>
                {report.tests && report.tests.filter((t) => t.applicable).length > 0 ? (
                  <div className="space-y-3">
                    {report.tests
                      .filter((t) => t.applicable)
                      .map((test, idx) => {
                        const calcs = test.calculations || {};
                        const obsErr = calcs.observedError ?? calcs.error ?? "-";
                        const mpe = calcs.maxPermissibleError ?? calcs.mpe ?? "1.0";
                        const testResult = test.result || "PENDING";
                        return (
                          <div key={test.testCode || idx} className="border border-slate-200 rounded overflow-hidden">
                            <div className="bg-slate-100 px-3 py-1.5 flex items-center justify-between text-xs font-bold text-slate-800">
                              <span>
                                {idx + 1}. {test.testName || test.testCode} ({test.testCode})
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  testResult === "PASS"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : testResult === "FAIL"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {testResult}
                              </span>
                            </div>
                            <table className="w-full text-left text-xs text-slate-700">
                              <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 border-b border-slate-200">
                                <tr>
                                  <th className="px-3 py-1.5">Observation Parameter [10]</th>
                                  <th className="px-3 py-1.5">Calculated Error [11]</th>
                                  <th className="px-3 py-1.5">
                                    Applicable MPE [12]{" "}
                                    <span className="text-amber-700 font-normal cursor-help" title="Requires domain validation">[D3]</span>
                                  </th>
                                  <th className="px-3 py-1.5">Result [13]</th>
                                  <th className="px-3 py-1.5">Remarks [14]</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className="border-b border-slate-100">
                                  <td className="px-3 py-1.5 font-medium">
                                    {test.observations && test.observations.length > 0
                                      ? `${test.observations.length} observation points recorded`
                                      : "Nominal load evaluation"}
                                  </td>
                                  <td className="px-3 py-1.5 font-mono">
                                    {typeof obsErr === "number" ? obsErr.toFixed(3) : obsErr}{" "}
                                    {report.instrument?.unit || "kg"}
                                  </td>
                                  <td className="px-3 py-1.5">
                                    &plusmn;{mpe} e <span className="text-[10px] text-amber-700 font-medium">(Requires domain validation)</span>
                                  </td>
                                  <td className="px-3 py-1.5 font-bold">
                                    <span className={testResult === "PASS" ? "text-emerald-700" : "text-rose-700"}>
                                      {testResult}
                                    </span>
                                  </td>
                                  <td className="px-3 py-1.5 text-slate-500">
                                    {test.remarks || "Conforms to permissible limits."}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No applicable tests recorded.</p>
                )}
              </div>

              {/* Item 15: Overall Conclusion */}
              <div
                className={`p-3 rounded border text-xs mb-4 ${
                  report.finalResult === "PASS"
                    ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                    : report.finalResult === "FAIL"
                    ? "bg-rose-50/70 border-rose-300 text-rose-950"
                    : "bg-amber-50/70 border-amber-300 text-amber-950"
                }`}
              >
                <h3 className="font-bold mb-1">Overall Metrological Conclusion [15]</h3>
                <p>
                  Instrument conformity evaluation result is <b>{report.finalResult}</b>. On the basis of metrological
                  examinations and compliance tests conducted in accordance with OIML Recommendation R-76-1:2006, the
                  specimen under test has been evaluated as <b>{report.finalResult}</b>.
                </p>
              </div>

              {/* Item 16: Attachments List */}
              <div className="border border-slate-200 rounded p-3 mb-4 text-xs">
                <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-1 mb-2">
                  Documentation &amp; Attached Records [16]
                </h3>
                {report.attachments && report.attachments.length > 0 ? (
                  <ul className="divide-y divide-slate-100 text-slate-600">
                    {report.attachments.map((att, i) => (
                      <li key={att.id || i} className="py-1 flex justify-between">
                        <span>{att.filename} ({att.category || "Attachment"})</span>
                        <span className="text-[10px] text-slate-400">
                          {att.size ? `${(att.size / 1024).toFixed(1)} KB` : "Uploaded"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 italic">Master calibration certificate attached: calibration_certificate_master.pdf</p>
                )}
              </div>

              {/* Item 21, 23: Report Hash & QR Box */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-slate-200 bg-slate-50/70 rounded p-3 mb-4 text-xs">
                <div className="sm:col-span-2">
                  <h4 className="font-bold text-slate-800">Cryptographic Content Hash (SHA-256) [21]</h4>
                  <div className="font-mono text-[11px] bg-white p-2 rounded border border-slate-200 text-slate-700 break-all mt-1">
                    {report.hash || "PENDING_APPROVAL_HASH"}
                  </div>
                  <p className="text-[10px] text-amber-700 font-medium mt-1">
                    Prototype integrity hash — not a legally valid digital signature. Digital signature integration planned for production deployment. [D4]
                  </p>
                </div>

                <div className="border-2 border-dashed border-slate-400 rounded flex flex-col items-center justify-center p-3 text-center bg-white">
                  <span className="text-[10px] font-bold text-slate-700 uppercase">QR Verification Placeholder [23]</span>
                  <div className="w-16 h-16 border border-slate-300 rounded flex items-center justify-center my-1 bg-slate-50 text-[10px] text-slate-400 font-mono">
                    [ QR Code ]
                  </div>
                  <span className="text-[9px] text-slate-500">
                    Scan to verify integrity
                  </span>
                </div>
              </div>

              {/* Item 22: Signatures Placeholder */}
              <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200 text-xs">
                <div className="border border-slate-200 rounded p-4 text-slate-700 bg-slate-50/30">
                  <div className="font-bold text-slate-900 mb-6">Testing Technician Signature [22]</div>
                  <div className="border-b border-slate-400 w-3/4 mb-1"></div>
                  <div className="font-medium">{report.createdBy || "Testing Technician"}</div>
                  <div className="text-[10px] text-slate-500">Date: {report.createdAt ? String(report.createdAt).substring(0, 10) : "2026-01-01"}</div>
                </div>

                <div className="border border-slate-200 rounded p-4 text-slate-700 bg-slate-50/30">
                  <div className="font-bold text-slate-900 mb-6">Authorized Reviewer Signature [22]</div>
                  <div className="border-b border-slate-400 w-3/4 mb-1"></div>
                  <div className="font-medium">{report.review?.reviewerId || "Authorized Reviewer"}</div>
                  <div className="text-[10px] text-slate-500">
                    Date: {report.review?.reviewedAt ? String(report.review.reviewedAt).substring(0, 10) : "Pending"}
                  </div>
                </div>
              </div>
            </div>

            {/* Item 24: Page Number & Mandatory Disclaimer D1 in footer of EVERY page */}
            <div className="pt-8 mt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500">
              <div className="text-slate-600 italic">
                Preliminary automated evaluation based on the configured OIML R-76 rule-set. Final acceptance remains subject to review and authorization by competent legal-metrology personnel. [D1]
              </div>
              <div className="font-bold text-slate-800 whitespace-nowrap">
                Page 1 of 1 [24]
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Controls, Status Chip, Lock Icon, Download PDF, Verify Integrity, Hash */}
        <div className="lg:col-span-1 space-y-6 sticky top-6">
          {/* Status & Immutability Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-semibold tracking-wider text-zinc-400">
                Document Status
              </span>
              <StatusBadge status={report.status} />
            </div>

            {/* Lock Icon when Immutable */}
            {isImmutable && (
              <div className="flex items-start gap-2.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3 text-xs text-emerald-300">
                <svg
                  className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <div>
                  <span className="font-bold block">Enforced Immutability</span>
                  <p className="text-[11px] text-emerald-300/80 mt-0.5">
                    Modifications and deletions are prohibited for this finalized report per legal metrology integrity rules.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 space-y-2.5">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloading || isUnreachable}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 disabled:opacity-50 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>{downloading ? "Downloading PDF..." : "Download PDF"}</span>
              </button>

              <button
                type="button"
                onClick={handleVerify}
                disabled={verifying || isUnreachable}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium px-4 py-2.5 rounded-xl text-xs border border-zinc-700 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>{verifying ? "Verifying..." : "Verify Integrity"}</span>
              </button>
            </div>
          </div>

          {/* Cryptographic Content Hash & D4 Disclaimer */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
              </svg>
              <span className="text-xs font-semibold text-zinc-300">Integrity Hash (SHA-256)</span>
            </div>

            <div className="bg-zinc-950 border border-zinc-800/80 p-3 rounded-xl font-mono text-[11px] text-zinc-300 break-all select-all leading-relaxed">
              {report.hash || "Not yet computed"}
            </div>

            {/* D4 directly under hash */}
            <div className="text-[11px] text-amber-400/90 leading-normal bg-amber-950/20 border border-amber-900/30 p-2.5 rounded-lg">
              Prototype integrity hash — not a legally valid digital signature. Digital signature integration planned for production deployment. [D4]
            </div>
          </div>
        </div>
      </div>

      {/* VERIFY INTEGRITY MODAL */}
      {showVerifyModal && verifyResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Report Cryptographic Verification
              </h3>
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="text-zinc-500 hover:text-zinc-300 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Result: Match true (green) or Match false (red) */}
            <div
              className={`p-4 rounded-xl border flex items-center gap-3 ${
                verifyResult.match
                  ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
                  : "bg-rose-950/40 border-rose-800/60 text-rose-300"
              }`}
            >
              {verifyResult.match ? (
                <svg className="w-6 h-6 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}

              <div>
                <div className="font-mono text-base font-bold">
                  {verifyResult.match ? "Match: true" : "Match: false"}
                </div>
                <div className="text-xs opacity-90 mt-0.5">
                  {verifyResult.match
                    ? "Canonical hash matches the stored approval signature. The report content has not been altered."
                    : "Cryptographic hash mismatch! The active content differs from the stored record. Tampering detected."}
                </div>
              </div>
            </div>

            {/* Both hashes in monospace */}
            <div className="space-y-4 text-xs">
              <div>
                <span className="text-zinc-400 block mb-1 font-medium">Stored Hash:</span>
                <code className="font-mono text-xs bg-zinc-950 border border-zinc-800 text-zinc-300 p-3 rounded-lg block break-all select-all">
                  {verifyResult.storedHash || "None"}
                </code>
              </div>

              <div>
                <span className="text-zinc-400 block mb-1 font-medium">Computed Hash:</span>
                <code className="font-mono text-xs bg-zinc-950 border border-zinc-800 text-zinc-300 p-3 rounded-lg block break-all select-all">
                  {verifyResult.computedHash || "None"}
                </code>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-5 py-2 rounded-xl text-xs font-medium border border-zinc-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
