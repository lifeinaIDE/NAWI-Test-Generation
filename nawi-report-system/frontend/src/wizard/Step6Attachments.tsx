import React, { useState, useEffect, useRef } from "react";
import type { Report, Attachment } from "../types";
import { attachmentsApi } from "../api";
import toast from "react-hot-toast";

interface Step6Props {
  report: Report;
  onNext?: () => void;
  onPrev?: () => void;
}

const CATEGORIES = [
  {
    key: "photos",
    title: "Instrument & Platform Photographs",
    description: "Visual evidence of instrument setup, nameplate, platter condition, and spirit level.",
    acceptedFormats: "JPG, JPEG, PNG",
    acceptedMimes: ".jpg,.jpeg,.png",
    maxSizeText: "10 MB",
  },
  {
    key: "calibration_certificate",
    title: "Standard Weights Calibration Certificate",
    description: "Traceable metrological certificate for standard weights utilized during testing.",
    acceptedFormats: "PDF, JPG, JPEG, PNG",
    acceptedMimes: ".pdf,.jpg,.jpeg,.png",
    maxSizeText: "10 MB",
    requiresExpiryDate: true,
  },
  {
    key: "manufacturer_documentation",
    title: "Manufacturer Documentation",
    description: "Type approval certificate excerpts, user manual, or technical specification sheets.",
    acceptedFormats: "PDF, JPG, JPEG, PNG",
    acceptedMimes: ".pdf,.jpg,.jpeg,.png",
    maxSizeText: "10 MB",
  },
];

export default function Step6Attachments({ report, onNext, onPrev }: Step6Props) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const [certExpiryDate, setCertExpiryDate] = useState<string>("");
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadAttachments = async () => {
    if (!report?.reportId) return;
    try {
      const data = await attachmentsApi.list(report.reportId);
      setAttachments(data);
    } catch {
      // If list fails or endpoint returns report's embedded attachments
      if (report.attachments) {
        setAttachments(report.attachments);
      }
    }
  };

  useEffect(() => {
    if (report?.attachments) {
      setAttachments(report.attachments);
    }
    loadAttachments();
  }, [report?.reportId]);

  // Check if any calibration certificate is expired
  const expiredCertificate = attachments.find((att) => {
    const isCert =
      att.category === "calibration_certificate" ||
      att.category === "calibration" ||
      att.category === "certificate";
    if (!isCert || !att.expiryDate) return false;
    const exp = new Date(att.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return exp < today;
  });

  const handleFileSelect = async (category: string, file: File) => {
    if (!report?.reportId) {
      toast.error("Please save the report draft before uploading attachments.");
      return;
    }

    // Client-side quick size check
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessages((prev) => ({
        ...prev,
        [category]: `File size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds 10 MB limit.`,
      }));
      return;
    }

    setUploadingCategory(category);
    setErrorMessages((prev) => ({ ...prev, [category]: "" }));

    try {
      const expiry = category === "calibration_certificate" ? certExpiryDate : undefined;
      await attachmentsApi.upload(report.reportId, file, category, expiry);
      toast.success(`${file.name} uploaded successfully.`);
      await loadAttachments();
    } catch (err: any) {
      const msg = err.messages?.[0]?.message || err.message || "Failed to upload file.";
      setErrorMessages((prev) => ({ ...prev, [category]: msg }));
      toast.error(msg);
    } finally {
      setUploadingCategory(null);
      if (fileInputRefs.current[category]) {
        fileInputRefs.current[category]!.value = "";
      }
    }
  };

  const handleDelete = async (attachmentId: string, filename: string) => {
    if (!report?.reportId) return;
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;

    try {
      await attachmentsApi.delete(report.reportId, attachmentId);
      toast.success("Attachment deleted.");
      setAttachments((prev) => prev.filter((a) => (a.attachmentId || (a as any).id) !== attachmentId));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete attachment.");
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-medium text-zinc-100 tracking-tight">
          Step 6: Attachments & Test Photographs
        </h2>
        <p className="text-zinc-500 text-xs mt-1">
          Upload essential documentary evidence and photos. All files are verified by magic-byte inspection on the server.
        </p>
      </div>

      {/* Prominent Expired Certificate ERROR Banner */}
      {expiredCertificate && (
        <div
          className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-start gap-3 text-rose-300 text-xs"
          data-testid="expired-cert-banner"
        >
          <svg className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <div className="font-semibold text-rose-400 text-sm">
              Calibration Certificate Must Not Be Expired (ERROR)
            </div>
            <div className="mt-1 text-rose-300/90">
              The uploaded standard weights certificate <strong className="font-mono">{expiredCertificate.filename}</strong> expired on{" "}
              <strong>{expiredCertificate.expiryDate}</strong>. Testing with expired reference standards violates OIML R-76 metrological integrity.
            </div>
          </div>
        </div>
      )}

      {/* 3 Upload Zones */}
      <div className="space-y-6">
        {CATEGORIES.map((cat) => {
          const zoneAttachments = attachments.filter(
            (a) =>
              a.category === cat.key ||
              (cat.key === "photos" && (a.category === "photo" || !a.category)) ||
              (cat.key === "calibration_certificate" &&
                (a.category === "calibration" || a.category === "certificate"))
          );

          const isUploading = uploadingCategory === cat.key;
          const zoneError = errorMessages[cat.key];

          return (
            <div
              key={cat.key}
              className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 space-y-4"
              data-testid={`upload-zone-${cat.key}`}
            >
              {/* Zone Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-200">{cat.title}</h3>
                  <p className="text-zinc-500 text-xs mt-0.5">{cat.description}</p>
                </div>
                <div className="text-[11px] text-zinc-500 font-mono bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                  {cat.acceptedFormats} • Max {cat.maxSizeText}
                </div>
              </div>

              {/* Optional Expiry Date Input for Calibration Certificate */}
              {cat.requiresExpiryDate && (
                <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3 flex flex-wrap items-center gap-3">
                  <label className="text-xs font-medium text-zinc-400">
                    Certificate Expiry Date:
                  </label>
                  <input
                    type="date"
                    value={certExpiryDate}
                    onChange={(e) => setCertExpiryDate(e.target.value)}
                    className="bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-1 text-xs text-zinc-200 focus:outline-none focus:border-zinc-500 cursor-pointer"
                    data-testid="input-cert-expiry"
                  />
                  <span className="text-[11px] text-zinc-500">
                    Required for validation before submission.
                  </span>
                </div>
              )}

              {/* Drag & Drop / Click Upload Box */}
              <div
                onClick={() => fileInputRefs.current[cat.key]?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isUploading
                    ? "border-sky-500/50 bg-sky-500/5"
                    : zoneError
                    ? "border-rose-500/50 bg-rose-500/5 hover:border-rose-500/70"
                    : "border-zinc-800 hover:border-zinc-700 bg-zinc-950/50 hover:bg-zinc-950/80"
                }`}
              >
                <input
                  type="file"
                  ref={(el) => {
                    fileInputRefs.current[cat.key] = el;
                  }}
                  accept={cat.acceptedMimes}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(cat.key, f);
                  }}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-2">
                  <svg
                    className={`w-8 h-8 ${isUploading ? "text-sky-400 animate-bounce" : "text-zinc-500"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <div className="text-xs text-zinc-300 font-medium">
                    {isUploading ? (
                      <span className="text-sky-400">Verifying and uploading file...</span>
                    ) : (
                      <span>
                        Click to select or drag & drop a file ({cat.acceptedFormats})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-600">
                    Strict magic-byte verification enforced (max 10 MB)
                  </div>
                </div>
              </div>

              {/* Error Message if upload failed */}
              {zoneError && (
                <div
                  className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-2"
                  data-testid={`error-${cat.key}`}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{zoneError}</span>
                </div>
              )}

              {/* Uploaded File Rows with Delete */}
              {zoneAttachments.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                    Uploaded Files ({zoneAttachments.length})
                  </div>
                  <div className="divide-y divide-zinc-800/60 rounded-xl border border-zinc-800/80 bg-zinc-950/70 overflow-hidden">
                    {zoneAttachments.map((att) => {
                      const attId = att.attachmentId || (att as any).id;
                      const isExpired =
                        cat.requiresExpiryDate &&
                        att.expiryDate &&
                        new Date(att.expiryDate) < new Date();

                      return (
                        <div
                          key={attId}
                          className="p-3 flex items-center justify-between gap-3 hover:bg-zinc-900/40 transition-colors"
                          data-testid={`attachment-row-${attId}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* File type icon */}
                            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 flex-shrink-0">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>

                            <div className="min-w-0">
                              <div className="text-xs font-mono font-medium text-zinc-200 truncate">
                                {att.filename}
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-0.5">
                                <span>{formatFileSize(att.sizeBytes || (att as any).size)}</span>
                                {att.uploadedAt && (
                                  <span>{new Date(att.uploadedAt).toLocaleDateString()}</span>
                                )}
                                {att.expiryDate && (
                                  <span
                                    className={`px-1.5 py-0.2 rounded font-mono ${
                                      isExpired
                                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    }`}
                                  >
                                    Expires: {att.expiryDate}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Delete Action */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDelete(attId, att.filename)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Delete file"
                              data-testid={`delete-${attId}`}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-zinc-800/60">
        <button
          type="button"
          onClick={onPrev}
          className="px-5 py-2 rounded-xl text-xs font-medium border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          ← Back to Step 5
        </button>

        <button
          type="button"
          onClick={onNext}
          className="bg-zinc-100 hover:bg-white text-zinc-950 px-6 py-2 rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer"
        >
          Continue to Final Review & Submit →
        </button>
      </div>
    </div>
  );
}
