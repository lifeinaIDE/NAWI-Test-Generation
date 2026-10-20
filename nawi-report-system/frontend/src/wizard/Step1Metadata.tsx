import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Report, ValidationMessage } from "../types";

const schema = z.object({
  title: z.string().optional(),
  applicationNumber: z.string().min(1, "Application number is required"),
  laboratory: z.object({
    name: z.string().min(1, "Laboratory name is required"),
    address: z.string().min(1, "Address is required"),
    location: z.string().min(1, "Location is required"),
    contact: z.string().min(1, "Contact is required"),
  }),
});

export type Step1FormData = z.infer<typeof schema>;

interface Step1Props {
  report: Report | null;
  serverErrors?: ValidationMessage[];
  onSave: (data: Step1FormData) => Promise<void>;
  onNext: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  isLoading?: boolean;
}

export default function Step1Metadata({
  report,
  serverErrors = [],
  onSave,
  onNext,
  onDirtyChange,
  isLoading = false,
}: Step1Props) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = useForm<Step1FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: report?.title || "",
      applicationNumber: report?.applicationNumber || "",
      laboratory: {
        name: report?.laboratory?.name || "",
        address: report?.laboratory?.address || "",
        location: report?.laboratory?.location || "",
        contact: report?.laboratory?.contact || "",
      },
    },
  });

  useEffect(() => {
    if (report) {
      reset({
        title: report.title || "",
        applicationNumber: report.applicationNumber || "",
        laboratory: {
          name: report.laboratory?.name || "",
          address: report.laboratory?.address || "",
          location: report.laboratory?.location || "",
          contact: report.laboratory?.contact || "",
        },
      });
    }
  }, [report, reset]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  // Map server validation messages onto fields
  useEffect(() => {
    if (serverErrors && serverErrors.length > 0) {
      serverErrors.forEach((err) => {
        if (err.field === "applicationNumber") {
          setError("applicationNumber", { type: "server", message: err.message });
        } else if (err.field === "title") {
          setError("title", { type: "server", message: err.message });
        } else if (err.field.startsWith("laboratory.")) {
          const subField = err.field.replace("laboratory.", "") as keyof Step1FormData["laboratory"];
          setError(`laboratory.${subField}` as any, { type: "server", message: err.message });
        }
      });
    }
  }, [serverErrors, setError]);

  const onSubmit = async (data: Step1FormData) => {
    await onSave(data);
    onNext();
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-medium text-zinc-100 tracking-tight">Step 1: Report Metadata</h2>
        <p className="text-zinc-500 text-xs mt-1">
          Instrument application number, testing jurisdiction, and authorized laboratory registration.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Report ID & Title */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1 uppercase tracking-wider">
              Report ID <span className="text-zinc-600 font-normal">(Read-Only)</span>
            </label>
            <input
              type="text"
              readOnly
              disabled
              value={report?.reportId || "Auto-assigned upon first save"}
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-zinc-400 font-mono cursor-not-allowed select-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1 uppercase tracking-wider">
              Application Number *
            </label>
            <input
              {...register("applicationNumber")}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
              placeholder="e.g. APP-2026-001"
            />
            {errors.applicationNumber && (
              <p className="text-rose-400 text-[11px] mt-1">{errors.applicationNumber.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 mb-1 uppercase tracking-wider">
              Report Title
            </label>
            <input
              {...register("title")}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
              placeholder="e.g. Non-Automatic Scale Legal Test"
            />
            {errors.title && <p className="text-rose-400 text-[11px] mt-1">{errors.title.message}</p>}
          </div>
        </div>

        {/* Laboratory Details */}
        <div className="pt-4 border-t border-zinc-800/60 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Testing Laboratory Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Laboratory Name *</label>
              <input
                {...register("laboratory.name")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="Central Legal Metrology Laboratory"
              />
              {errors.laboratory?.name && (
                <p className="text-rose-400 text-[11px] mt-1">{errors.laboratory.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Contact Officer / Email *</label>
              <input
                {...register("laboratory.contact")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="officer@metrology.gov.in"
              />
              {errors.laboratory?.contact && (
                <p className="text-rose-400 text-[11px] mt-1">{errors.laboratory.contact.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Laboratory Address *</label>
              <input
                {...register("laboratory.address")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="Plot 42, Institutional Metrology Zone"
              />
              {errors.laboratory?.address && (
                <p className="text-rose-400 text-[11px] mt-1">{errors.laboratory.address.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Location / Jurisdiction *</label>
              <input
                {...register("laboratory.location")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="New Delhi, India"
              />
              {errors.laboratory?.location && (
                <p className="text-rose-400 text-[11px] mt-1">{errors.laboratory.location.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-zinc-800/60">
          <div className="text-xs text-zinc-500">
            {isDirty ? (
              <span className="text-amber-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Unsaved edits on Step 1
              </span>
            ) : (
              <span className="text-zinc-500">Step 1 values synced</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="bg-zinc-100 hover:bg-white text-zinc-950 px-6 py-2 rounded-xl text-xs font-medium transition-all shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? "Saving..." : "Save & Continue →"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
