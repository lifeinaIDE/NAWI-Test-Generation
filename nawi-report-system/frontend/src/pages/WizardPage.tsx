import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { reportsApi } from "../api";
import type { Report } from "../types";
import Step1Metadata from "../wizard/Step1Metadata";
import Step2InstrumentDetails from "../wizard/Step2InstrumentDetails";
import Step3Environment from "../wizard/Step3Environment";
import Step4TestSelection from "../wizard/Step4TestSelection";
import Step5TestDataEntry from "../wizard/Step5TestDataEntry";
import Step6Submit from "../wizard/Step6Submit";

const STEPS = [
  { id: 1, label: "Metadata", component: Step1Metadata },
  { id: 2, label: "Instrument", component: Step2InstrumentDetails },
  { id: 3, label: "Environment", component: Step3Environment },
  { id: 4, label: "Test Selection", component: Step4TestSelection },
  { id: 5, label: "Test Data Entry", component: Step5TestDataEntry },
  { id: 6, label: "Submit", component: Step6Submit },
];

export default function WizardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && id !== "new") {
      reportsApi.get(id)
        .then(res => {
          setReport(res);
          setLoading(false);
        })
        .catch(() => navigate("/repository"));
    } else {
      setLoading(false);
    }
  }, [id, navigate]);

  const handleSaveDraft = async (stepData: any, stepKey: "metadata" | "instrument" | "environment" | "tests") => {
    try {
      let payload = {};
      if (stepKey === "metadata") {
        payload = { ...stepData }; 
      } else {
        payload = { [stepKey]: stepData };
      }

      if (!report || id === "new") {
        const res = await reportsApi.create(payload as any);
        setReport(res);
        navigate(`/reports/${res.reportId}`, { replace: true });
        return res;
      } else {
        const res = await reportsApi.update(report.reportId, payload as any);
        setReport(res);
        return res;
      }
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  if (loading) return <div className="p-8 text-zinc-500">Loading...</div>;

  const CurrentStepComponent = STEPS.find(s => s.id === currentStep)?.component;

  return (
    <div className="max-w-4xl mx-auto py-8">
      {report?.status === "QUERY_RAISED" && report.review?.reviewerComments && (
        <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <h3 className="text-amber-400 font-semibold mb-1">Reviewer Feedback — Resubmission Required</h3>
          <p className="text-amber-200/80 text-sm">{report.review.reviewerComments}</p>
        </div>
      )}

      {/* Progress */}
      <div className="mb-12">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-zinc-800/50 z-0"></div>
          {STEPS.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                  currentStep >= s.id 
                    ? "bg-zinc-100 text-zinc-950 shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
                    : "bg-zinc-900 border border-zinc-800 text-zinc-500"
                }`}
              >
                {s.id}
              </div>
              <span className={`absolute top-10 text-[10px] uppercase tracking-widest whitespace-nowrap ${
                currentStep >= s.id ? "text-zinc-300" : "text-zinc-600"
              }`}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mt-16 bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-8 sm:p-10 backdrop-blur-sm">
        {CurrentStepComponent && (
          <CurrentStepComponent 
            report={report} 
            onSave={handleSaveDraft} 
            onNext={nextStep} 
            onPrev={prevStep}
            isFirst={currentStep === 1}
            isLast={currentStep === STEPS.length}
          />
        )}
      </div>
    </div>
  );
}
