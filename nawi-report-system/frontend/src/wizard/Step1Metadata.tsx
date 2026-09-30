import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  applicationNumber: z.string().min(1, "Application number is required"),
  laboratory: z.object({
    name: z.string().min(1, "Laboratory name is required"),
    address: z.string().min(1, "Address is required"),
    location: z.string().min(1, "Location is required"),
    contact: z.string().min(1, "Contact is required"),
  })
});
type FormData = z.infer<typeof schema>;

export default function Step1Metadata({ report, onSave, onNext }: any) {
  const { register, handleSubmit, formState: { errors, isDirty, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      applicationNumber: report?.applicationNumber || "",
      laboratory: report?.laboratory || { name: "", address: "", location: "", contact: "" }
    }
  });

  useEffect(() => {
    if (report) {
      reset({
        applicationNumber: report.applicationNumber || "",
        laboratory: report.laboratory || { name: "", address: "", location: "", contact: "" }
      });
    }
  }, [report, reset]);

  const onSubmit = async (data: FormData) => {
    await onSave(data, "metadata"); // passing "metadata" as key for WizardPage handleSaveDraft
    onNext();
  };

  return (
    <div>
      <div className="mb-10">
        <h2 className="text-2xl font-light text-zinc-100 tracking-tight">Report Metadata</h2>
        <p className="text-zinc-500 text-sm mt-1">Application details and laboratory information.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        
        <div className="space-y-6">
          <h3 className="text-sm font-medium text-zinc-300 border-b border-zinc-800 pb-2">General</h3>
          <div>
            <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Application Number</label>
            <input
              {...register("applicationNumber")}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
              placeholder="e.g. APP-2026-001"
            />
            {errors.applicationNumber && <p className="text-red-400 text-xs mt-1.5">{errors.applicationNumber.message}</p>}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-sm font-medium text-zinc-300 border-b border-zinc-800 pb-2">Laboratory</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Name</label>
              <input
                {...register("laboratory.name")}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="Central Demo Lab"
              />
              {errors.laboratory?.name && <p className="text-red-400 text-xs mt-1.5">{errors.laboratory.name.message}</p>}
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Contact</label>
              <input
                {...register("laboratory.contact")}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="Jane Doe (technician@example.com)"
              />
              {errors.laboratory?.contact && <p className="text-red-400 text-xs mt-1.5">{errors.laboratory.contact.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Address</label>
              <input
                {...register("laboratory.address")}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="123 Metrology Way"
              />
              {errors.laboratory?.address && <p className="text-red-400 text-xs mt-1.5">{errors.laboratory.address.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-widest">Location / City</label>
              <input
                {...register("laboratory.location")}
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-100 text-sm focus:outline-none focus:border-zinc-500 transition-colors"
                placeholder="Metropolis"
              />
              {errors.laboratory?.location && <p className="text-red-400 text-xs mt-1.5">{errors.laboratory.location.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-zinc-800/60 mt-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-zinc-100 hover:bg-white text-zinc-950 px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            {isSubmitting ? "Saving..." : (isDirty || !report ? "Save & Continue" : "Continue")}
          </button>
        </div>
      </form>
    </div>
  );
}
