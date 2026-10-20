import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Report, ValidationMessage } from "../types";

const schema = z.object({
  environment: z.object({
    temperatureStart: z.coerce
      .number()
      .min(-10, "Temperature must be between -10 and 60 °C")
      .max(60, "Temperature must be between -10 and 60 °C"),
    temperatureEnd: z.coerce
      .number()
      .min(-10, "Temperature must be between -10 and 60 °C")
      .max(60, "Temperature must be between -10 and 60 °C"),
    relativeHumidity: z.coerce
      .number()
      .min(20, "Humidity must be between 20% and 98%")
      .max(98, "Humidity must be between 20% and 98%"),
    barometricPressure: z.coerce.number().optional().nullable(),
  }),
});

export type Step3FormData = z.infer<typeof schema>;

interface Step3Props {
  report: Report | null;
  serverErrors?: ValidationMessage[];
  onSave: (data: Step3FormData) => Promise<void>;
  onNext: () => void;
  onPrev: () => void;
  onDirtyChange?: (isDirty: boolean) => void;
  isLoading?: boolean;
}

export default function Step3Environment({
  report,
  serverErrors = [],
  onSave,
  onNext,
  onPrev,
  onDirtyChange,
  isLoading = false,
}: Step3Props) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = useForm<Step3FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      environment: {
        temperatureStart: report?.environment?.temperatureStart ?? 20,
        temperatureEnd: report?.environment?.temperatureEnd ?? 20,
        relativeHumidity: report?.environment?.relativeHumidity ?? 50,
        barometricPressure: report?.environment?.barometricPressure ?? null,
      },
    },
  });

  useEffect(() => {
    if (report?.environment) {
      reset({
        environment: {
          temperatureStart: report.environment.temperatureStart ?? 20,
          temperatureEnd: report.environment.temperatureEnd ?? 20,
          relativeHumidity: report.environment.relativeHumidity ?? 50,
          barometricPressure: report.environment.barometricPressure ?? null,
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
        if (err.field.startsWith("environment.")) {
          const subField = err.field.replace("environment.", "") as keyof Step3FormData["environment"];
          setError(`environment.${subField}` as any, { type: "server", message: err.message });
        }
      });
    }
  }, [serverErrors, setError]);

  const onSubmit = async (data: Step3FormData) => {
    await onSave(data);
    onNext();
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-xl font-medium text-zinc-100 tracking-tight">Step 3: Environmental Conditions</h2>
        <p className="text-zinc-500 text-xs mt-1">
          Ambient test laboratory atmospheric parameters per OIML R-76 clause 3.9 (Standard temperature range: -10 °C to +60 °C, humidity: 20% to 98%).
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Starting Temperature (°C) * <span className="text-zinc-500 font-normal">(-10 to 60 °C)</span>
            </label>
            <input
              type="number"
              step="0.1"
              {...register("environment.temperatureStart")}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
              placeholder="e.g. 21.5"
            />
            {errors.environment?.temperatureStart && (
              <p className="text-rose-400 text-[11px] mt-1">{errors.environment.temperatureStart.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Ending Temperature (°C) * <span className="text-zinc-500 font-normal">(-10 to 60 °C)</span>
            </label>
            <input
              type="number"
              step="0.1"
              {...register("environment.temperatureEnd")}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
              placeholder="e.g. 22.0"
            />
            {errors.environment?.temperatureEnd && (
              <p className="text-rose-400 text-[11px] mt-1">{errors.environment.temperatureEnd.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Relative Humidity (%) * <span className="text-zinc-500 font-normal">(20% to 98%)</span>
            </label>
            <input
              type="number"
              step="0.5"
              {...register("environment.relativeHumidity")}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
              placeholder="e.g. 55"
            />
            {errors.environment?.relativeHumidity && (
              <p className="text-rose-400 text-[11px] mt-1">{errors.environment.relativeHumidity.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              Barometric Pressure (hPa) <span className="text-zinc-500 font-normal">(Optional)</span>
            </label>
            <input
              type="number"
              step="0.1"
              {...register("environment.barometricPressure")}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 transition-colors"
              placeholder="e.g. 1013.2"
            />
            {errors.environment?.barometricPressure && (
              <p className="text-rose-400 text-[11px] mt-1">{errors.environment.barometricPressure.message}</p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-zinc-800/60">
          <button
            type="button"
            onClick={onPrev}
            className="px-5 py-2 rounded-xl text-xs font-medium border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            ← Back to Step 2
          </button>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="bg-zinc-100 hover:bg-white text-zinc-950 px-6 py-2 rounded-xl text-xs font-medium transition-all shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Saving..." : "Save Draft & Continue →"}
          </button>
        </div>
      </form>
    </div>
  );
}
