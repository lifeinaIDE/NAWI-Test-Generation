import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  model: z.string().min(1, "Model is required"),
  serialNumber: z.string().min(1, "Serial number is required"),
  type: z.string().min(1, "Type is required"),
  accuracyClass: z.string().min(1, "Accuracy class is required"),
  maxCapacity: z.coerce.number().min(0, "Cannot be negative"),
  minCapacity: z.coerce.number().min(0, "Cannot be negative"),
  verificationIntervalE: z.coerce.number().positive("Must be positive"),
  actualIntervalD: z.coerce.number().positive("Must be positive"),
  numberOfIntervalsN: z.coerce.number().positive("Must be positive"),
  unit: z.string().min(1, "Unit is required"),
  softwareVersion: z.string().default(""),
}).refine(data => data.maxCapacity > data.minCapacity, {
  message: "Max capacity must be greater than Min capacity",
  path: ["maxCapacity"]
});
type FormData = z.infer<typeof schema>;

export default function Step2InstrumentDetails({ report, onSave, onNext, onPrev }: any) {
  const { register, handleSubmit, formState: { errors, isDirty, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      ...report?.instrument
    }
  });

  useEffect(() => {
    if (report?.instrument) {
      reset(report.instrument);
    }
  }, [report, reset]);

  const onSubmit = async (data: FormData) => {
    await onSave(data, "instrument");
    onNext();
  };

  return (
    <div>
      <div className="mb-10">
        <h2 className="text-2xl font-light text-zinc-100 tracking-tight">Instrument Details</h2>
        <p className="text-zinc-500 text-sm mt-1">Technical specifications of the device under test.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Model</label>
            <input {...register("model")} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors" />
            {errors.model && <p className="text-red-400 text-xs mt-1.5">{errors.model.message}</p>}
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Serial Number</label>
            <input {...register("serialNumber")} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors" />
            {errors.serialNumber && <p className="text-red-400 text-xs mt-1.5">{errors.serialNumber.message}</p>}
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Type</label>
            <input {...register("type")} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors" placeholder="e.g. Non-automatic weighing instrument" />
            {errors.type && <p className="text-red-400 text-xs mt-1.5">{errors.type.message}</p>}
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Accuracy Class</label>
            <select {...register("accuracyClass")} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors">
              <option value="I">I (Special)</option>
              <option value="II">II (High)</option>
              <option value="III">III (Medium)</option>
              <option value="IIII">IIII (Ordinary)</option>
            </select>
            {errors.accuracyClass && <p className="text-red-400 text-xs mt-1.5">{errors.accuracyClass.message}</p>}
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Unit</label>
            <input {...register("unit")} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors" placeholder="kg, g, t..." />
            {errors.unit && <p className="text-red-400 text-xs mt-1.5">{errors.unit.message}</p>}
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Software Version</label>
            <input {...register("softwareVersion")} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors" />
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-medium text-zinc-300 border-b border-zinc-800 pb-2">Capacities & Intervals</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Max Capacity</label>
              <input type="number" step="any" {...register("maxCapacity")} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors" />
              {errors.maxCapacity && <p className="text-red-400 text-xs mt-1.5">{errors.maxCapacity.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Min Capacity</label>
              <input type="number" step="any" {...register("minCapacity")} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors" />
              {errors.minCapacity && <p className="text-red-400 text-xs mt-1.5">{errors.minCapacity.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Interval (e)</label>
              <input type="number" step="any" {...register("verificationIntervalE")} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors" />
              {errors.verificationIntervalE && <p className="text-red-400 text-xs mt-1.5">{errors.verificationIntervalE.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Actual Interval (d)</label>
              <input type="number" step="any" {...register("actualIntervalD")} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors" />
              {errors.actualIntervalD && <p className="text-red-400 text-xs mt-1.5">{errors.actualIntervalD.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Divisions (n)</label>
              <input type="number" step="any" {...register("numberOfIntervalsN")} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors" />
              {errors.numberOfIntervalsN && <p className="text-red-400 text-xs mt-1.5">{errors.numberOfIntervalsN.message}</p>}
            </div>
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
            {isSubmitting ? "Saving..." : (isDirty ? "Save & Continue" : "Continue")}
          </button>
        </div>
      </form>
    </div>
  );
}
