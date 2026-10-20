import React, { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Report, ValidationMessage } from "../types";

const schema = z
  .object({
    manufacturer: z.object({
      name: z.string().min(1, "Manufacturer name is required"),
      address: z.string().min(1, "Manufacturer address is required"),
      country: z.string().min(1, "Country of origin is required"),
    }),
    instrument: z.object({
      model: z.string().min(1, "Model is required"),
      serialNumber: z.string().min(1, "Serial number is required"),
      type: z.string().min(1, "Type is required"),
      accuracyClass: z.enum(["I", "II", "III", "IIII"]),
      maxCapacity: z.coerce.number().positive("Max capacity must be greater than zero"),
      minCapacity: z.coerce.number().min(0, "Min capacity cannot be negative"),
      unit: z.string().min(1, "Unit is required"),
      verificationIntervalE: z.coerce.number().positive("e must be positive"),
      actualIntervalD: z.coerce.number().positive("d must be positive"),
      numberOfIntervalsN: z.coerce.number().optional(),
      softwareVersion: z.string().optional(),
      loadCell: z.object({
        model: z.string().optional(),
        serial: z.string().optional(),
        capacity: z.coerce.number().optional(),
      }).optional(),
    }),
  })
  .refine((data) => data.instrument.maxCapacity > data.instrument.minCapacity, {
    message: "Max capacity must be greater than Min capacity",
    path: ["instrument", "maxCapacity"],
  })
  .refine((data) => data.instrument.actualIntervalD <= data.instrument.verificationIntervalE, {
    message: "d must not be greater than e.",
    path: ["instrument", "actualIntervalD"],
  });

export type Step2FormData = z.infer<typeof schema>;

interface Step2Props {
  report: Report | null;
  serverErrors?: ValidationMessage[];
  onSave: (data: Step2FormData) => Promise<void>;
  onNext: () => void;
  onPrev: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  isLoading?: boolean;
}

export default function Step2InstrumentDetails({
  report,
  serverErrors = [],
  onSave,
  onNext,
  onPrev,
  onDirtyChange,
  isLoading = false,
}: Step2Props) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = useForm<Step2FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      manufacturer: {
        name: report?.manufacturer?.name || "",
        address: report?.manufacturer?.address || "",
        country: report?.manufacturer?.country || "India",
      },
      instrument: {
        model: report?.instrument?.model || "",
        serialNumber: report?.instrument?.serialNumber || "",
        type: report?.instrument?.type || "Non-Automatic Weighing Instrument",
        accuracyClass: (report?.instrument?.accuracyClass as any) || "III",
        maxCapacity: report?.instrument?.maxCapacity || 0,
        minCapacity: report?.instrument?.minCapacity || 0,
        unit: report?.instrument?.unit || "kg",
        verificationIntervalE: report?.instrument?.verificationIntervalE || 0,
        actualIntervalD: report?.instrument?.actualIntervalD || 0,
        numberOfIntervalsN: report?.instrument?.numberOfIntervalsN || 0,
        softwareVersion: report?.instrument?.softwareVersion || "",
        loadCell: {
          model: (report?.instrument?.loadCell as any)?.model || "",
          serial: (report?.instrument?.loadCell as any)?.serial || "",
          capacity: (report?.instrument?.loadCell as any)?.capacity || 0,
        },
      },
    },
  });

  const maxCapacity = useWatch({ control, name: "instrument.maxCapacity" });
  const intervalE = useWatch({ control, name: "instrument.verificationIntervalE" });

  // Auto-calculate n = maxCapacity / e (read-only per specification)
  const calculatedN =
    maxCapacity && intervalE && intervalE > 0 ? Math.round(maxCapacity / intervalE) : 0;

  useEffect(() => {
    setValue("instrument.numberOfIntervalsN", calculatedN);
  }, [calculatedN, setValue]);

  useEffect(() => {
    if (report) {
      reset({
        manufacturer: {
          name: report.manufacturer?.name || "",
          address: report.manufacturer?.address || "",
          country: report.manufacturer?.country || "India",
        },
        instrument: {
          model: report.instrument?.model || "",
          serialNumber: report.instrument?.serialNumber || "",
          type: report.instrument?.type || "Non-Automatic Weighing Instrument",
          accuracyClass: (report.instrument?.accuracyClass as any) || "III",
          maxCapacity: report.instrument?.maxCapacity || 0,
          minCapacity: report.instrument?.minCapacity || 0,
          unit: report.instrument?.unit || "kg",
          verificationIntervalE: report.instrument?.verificationIntervalE || 0,
          actualIntervalD: report.instrument?.actualIntervalD || 0,
          numberOfIntervalsN: report.instrument?.numberOfIntervalsN || 0,
          softwareVersion: report.instrument?.softwareVersion || "",
          loadCell: {
            model: (report.instrument?.loadCell as any)?.model || "",
            serial: (report.instrument?.loadCell as any)?.serial || "",
            capacity: (report.instrument?.loadCell as any)?.capacity || 0,
          },
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
        if (err.field.startsWith("instrument.")) {
          const subField = err.field.replace("instrument.", "") as keyof Step2FormData["instrument"];
          setError(`instrument.${subField}` as any, { type: "server", message: err.message });
        } else if (err.field.startsWith("manufacturer.")) {
          const subField = err.field.replace("manufacturer.", "") as keyof Step2FormData["manufacturer"];
          setError(`manufacturer.${subField}` as any, { type: "server", message: err.message });
        }
      });
    }
  }, [serverErrors, setError]);

  const onSubmit = async (data: Step2FormData) => {
    data.instrument.numberOfIntervalsN = calculatedN;
    await onSave(data);
    onNext();
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-medium text-zinc-100 tracking-tight">Step 2: Instrument & Manufacturer Details</h2>
        <p className="text-zinc-500 text-xs mt-1">
          OIML R-76 technical characteristics, accuracy classification, capacities, and verification intervals.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Manufacturer Information */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Manufacturer Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Manufacturer Name *</label>
              <input
                {...register("manufacturer.name")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="e.g. Precision Weighing Systems Ltd"
              />
              {errors.manufacturer?.name && (
                <p className="text-rose-400 text-[11px] mt-1">{errors.manufacturer.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Address *</label>
              <input
                {...register("manufacturer.address")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="e.g. 52 Industrial Area Phase II"
              />
              {errors.manufacturer?.address && (
                <p className="text-rose-400 text-[11px] mt-1">{errors.manufacturer.address.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Country of Origin *</label>
              <input
                {...register("manufacturer.country")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="e.g. India"
              />
              {errors.manufacturer?.country && (
                <p className="text-rose-400 text-[11px] mt-1">{errors.manufacturer.country.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Instrument Identification */}
        <div className="pt-4 border-t border-zinc-800/60 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Instrument Technical Attributes
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Model Designation *</label>
              <input
                {...register("instrument.model")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="e.g. BP-Platform-300"
              />
              {errors.instrument?.model && (
                <p className="text-rose-400 text-[11px] mt-1">{errors.instrument.model.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Serial Number *</label>
              <input
                {...register("instrument.serialNumber")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="e.g. SN-2026-0042"
              />
              {errors.instrument?.serialNumber && (
                <p className="text-rose-400 text-[11px] mt-1">{errors.instrument.serialNumber.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Instrument Type *</label>
              <input
                {...register("instrument.type")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="Electronic Platform Scale"
              />
              {errors.instrument?.type && (
                <p className="text-rose-400 text-[11px] mt-1">{errors.instrument.type.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Accuracy Class (OIML R-76) *
              </label>
              <select
                {...register("instrument.accuracyClass")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer"
              >
                <option value="I">Class I — Special (Fine precision / lab)</option>
                <option value="II">Class II — High (Analytical)</option>
                <option value="III">Class III — Medium (Commercial / industrial)</option>
                <option value="IIII">Class IIII — Ordinary (Bulk commodities)</option>
              </select>
              {errors.instrument?.accuracyClass && (
                <p className="text-rose-400 text-[11px] mt-1">{errors.instrument.accuracyClass.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Unit of Measurement *</label>
              <select
                {...register("instrument.unit")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors cursor-pointer"
              >
                <option value="kg">kg (Kilogram)</option>
                <option value="g">g (Gram)</option>
                <option value="t">t (Tonne)</option>
                <option value="mg">mg (Milligram)</option>
              </select>
              {errors.instrument?.unit && (
                <p className="text-rose-400 text-[11px] mt-1">{errors.instrument.unit.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Software / Firmware Version</label>
              <input
                {...register("instrument.softwareVersion")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="e.g. v1.2.0-leg"
              />
            </div>
          </div>
        </div>

        {/* Metrological Capacities and Intervals */}
        <div className="pt-4 border-t border-zinc-800/60 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Metrological Limits & Divisions
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Maximum Capacity (Max) *</label>
              <input
                type="number"
                step="any"
                {...register("instrument.maxCapacity")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="300"
              />
              {errors.instrument?.maxCapacity && (
                <p className="text-rose-400 text-[11px] mt-1">{errors.instrument.maxCapacity.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Minimum Capacity (Min) *</label>
              <input
                type="number"
                step="any"
                {...register("instrument.minCapacity")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="2"
              />
              {errors.instrument?.minCapacity && (
                <p className="text-rose-400 text-[11px] mt-1">{errors.instrument.minCapacity.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Verification Scale Interval (e) *
              </label>
              <input
                type="number"
                step="any"
                {...register("instrument.verificationIntervalE")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="0.1"
              />
              {errors.instrument?.verificationIntervalE && (
                <p className="text-rose-400 text-[11px] mt-1">{errors.instrument.verificationIntervalE.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Actual Scale Interval (d) * <span className="text-zinc-500 font-normal">(d ≤ e)</span>
              </label>
              <input
                type="number"
                step="any"
                {...register("instrument.actualIntervalD")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="0.1"
              />
              {errors.instrument?.actualIntervalD && (
                <p className="text-rose-400 text-[11px] mt-1">{errors.instrument.actualIntervalD.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Number of Verification Intervals (n = Max/e) <span className="text-zinc-500 font-normal">(Read-Only)</span>
              </label>
              <input
                type="number"
                readOnly
                disabled
                value={calculatedN}
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-sky-400 font-mono cursor-not-allowed select-none"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Automatically evaluated server-side per OIML R-76 clause 3.2.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">Load Cell Model / Rating</label>
              <input
                {...register("instrument.loadCell.model")}
                className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="e.g. Zemic H8C-C3-500kg"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-zinc-800/60">
          <button
            type="button"
            onClick={onPrev}
            className="px-5 py-2 rounded-xl text-xs font-medium border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            ← Back to Step 1
          </button>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="bg-zinc-100 hover:bg-white text-zinc-950 px-6 py-2 rounded-xl text-xs font-medium transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Saving..." : "Save & Continue to Environment →"}
          </button>
        </div>
      </form>
    </div>
  );
}
