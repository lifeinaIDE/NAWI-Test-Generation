import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";

const schema = z.object({
  temperatureStart: z.coerce.number().min(-10).max(60),
  temperatureEnd: z.coerce.number().min(-10).max(60),
  relativeHumidity: z.coerce.number().min(20).max(98),
  barometricPressure: z.coerce.number().optional().nullable(),
});
type FormData = z.infer<typeof schema>;

export default function Step3Environment({ report, onSave, onNext, onPrev }: any) {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      ...report?.environment
    }
  });

  useEffect(() => {
    if (report?.environment) {
      reset(report.environment);
    }
  }, [report, reset]);

  const onSubmit = async (data: FormData) => {
    await onSave(data, "environment");
    navigate("/repository"); // After step 3, we just redirect to repository until Phase 4 (tests)
  };

  return (
    <div>
      <div className="mb-10">
        <h2 className="text-2xl font-light text-zinc-100 tracking-tight">Environment</h2>
        <p className="text-zinc-500 text-sm mt-1">Conditions during the testing process.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Temperature Start (°C)</label>
            <input type="number" step="0.1" {...register("temperatureStart")} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors" />
            {errors.temperatureStart && <p className="text-red-400 text-xs mt-1.5">{errors.temperatureStart.message}</p>}
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Temperature End (°C)</label>
            <input type="number" step="0.1" {...register("temperatureEnd")} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors" />
            {errors.temperatureEnd && <p className="text-red-400 text-xs mt-1.5">{errors.temperatureEnd.message}</p>}
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Relative Humidity (%)</label>
            <input type="number" step="0.1" {...register("relativeHumidity")} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors" />
            {errors.relativeHumidity && <p className="text-red-400 text-xs mt-1.5">{errors.relativeHumidity.message}</p>}
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Barometric Pressure (hPa)</label>
            <input type="number" step="0.1" {...register("barometricPressure")} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors" placeholder="Optional" />
            {errors.barometricPressure && <p className="text-red-400 text-xs mt-1.5">{errors.barometricPressure.message}</p>}
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t border-zinc-800/60 mt-8">
          <button
            type="button"
            onClick={onPrev}
            className="text-zinc-400 hover:text-zinc-100 px-6 py-2.5 rounded-full text-sm font-medium transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-zinc-100 hover:bg-white text-zinc-950 px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            {isSubmitting ? "Saving..." : "Save Draft & Exit"}
          </button>
        </div>
      </form>
    </div>
  );
}
