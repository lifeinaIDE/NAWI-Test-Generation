import { useState, useEffect } from "react";
import type { Report, TestDefinition } from "../types";

const IMPLEMENTED_TESTS = [
  { testCode: "WEIGHING_PERFORMANCE", testName: "Weighing Performance" },
  { testCode: "ECCENTRICITY", testName: "Eccentricity" },
  { testCode: "REPEATABILITY", testName: "Repeatability" },
  { testCode: "DISCRIMINATION", testName: "Discrimination" }
];

const PLANNED_TESTS = [
  { testCode: "TARE_WEIGHING", testName: "Tare Weighing" },
  { testCode: "WARM_UP_TIME", testName: "Warm-up Time" },
  { testCode: "VOLTAGE_VARIATIONS", testName: "Voltage Variations" },
  { testCode: "CREEP_TEST", testName: "Creep Test" }
];

export default function Step4TestSelection({ report, onSave, onNext, onPrev, ...props }: any) {
  const [selectedTests, setSelectedTests] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (report?.tests) {
      const map: Record<string, boolean> = {};
      report.tests.forEach((t: any) => {
        map[t.testCode] = t.applicable;
      });
      // Set defaults for implemented tests if not present
      IMPLEMENTED_TESTS.forEach(t => {
        if (map[t.testCode] === undefined) {
          map[t.testCode] = true; // default true
        }
      });
      setSelectedTests(map);
    } else {
      const initial: Record<string, boolean> = {};
      IMPLEMENTED_TESTS.forEach(t => initial[t.testCode] = true);
      setSelectedTests(initial);
    }
  }, [report]);

  const handleToggle = (code: string, applicable: boolean) => {
    setSelectedTests(prev => ({ ...prev, [code]: applicable }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    
    const testsArray: TestDefinition[] = [];
    
    const addTest = (code: string, name: string, applicable: boolean) => {
      // Preserve existing data if it exists
      const existing = report?.tests?.find((t: any) => t.testCode === code);
      if (existing) {
        testsArray.push({ ...existing, applicable });
      } else {
        testsArray.push({
          testCode: code,
          testName: name,
          applicable,
          status: applicable ? "INCOMPLETE" : "NOT_APPLICABLE",
          observations: [],
          calculations: {},
          result: applicable ? "INCOMPLETE" : "NOT_APPLICABLE",
          remarks: ""
        });
      }
    };
    
    IMPLEMENTED_TESTS.forEach(t => addTest(t.testCode, t.testName, selectedTests[t.testCode] ?? true));
    
    // We can also add planned tests as applicable=false for now
    PLANNED_TESTS.forEach(t => {
      const existing = report?.tests?.find((ext: any) => ext.testCode === t.testCode);
      if (existing) {
        testsArray.push({ ...existing, applicable: selectedTests[t.testCode] ?? false });
      } else {
        testsArray.push({
          testCode: t.testCode,
          testName: t.testName,
          applicable: selectedTests[t.testCode] ?? false,
          status: selectedTests[t.testCode] ? "PLANNED" : "NOT_APPLICABLE",
          observations: [],
          calculations: {},
          result: selectedTests[t.testCode] ? "PLANNED" : "NOT_APPLICABLE",
          remarks: ""
        });
      }
    });

    try {
      await onSave(testsArray, "tests");
      onNext();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-10">
        <h2 className="text-2xl font-light text-zinc-100 tracking-tight">Test Selection</h2>
        <p className="text-zinc-500 text-sm mt-1">Select which OIML R-76 tests apply to this instrument.</p>
      </div>

      <div className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-zinc-300 border-b border-zinc-800 pb-2">Implemented Tests</h3>
          {IMPLEMENTED_TESTS.map(t => (
            <div key={t.testCode} className="flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
              <span className="text-zinc-200 text-sm">{t.testName}</span>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name={t.testCode} 
                    checked={selectedTests[t.testCode] === true}
                    onChange={() => handleToggle(t.testCode, true)}
                    className="accent-zinc-100 bg-zinc-900 border-zinc-700"
                  />
                  <span className="text-xs text-zinc-400 uppercase tracking-widest">Applicable</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name={t.testCode} 
                    checked={selectedTests[t.testCode] === false}
                    onChange={() => handleToggle(t.testCode, false)}
                    className="accent-zinc-100 bg-zinc-900 border-zinc-700"
                  />
                  <span className="text-xs text-zinc-400 uppercase tracking-widest">Not Applicable</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-zinc-500 border-b border-zinc-800/50 pb-2">Planned Tests (Not Implemented)</h3>
          {PLANNED_TESTS.map(t => (
            <div key={t.testCode} className="flex flex-col gap-2 p-4 bg-zinc-900/20 border border-zinc-800/30 rounded-xl opacity-75">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-sm">{t.testName}</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-not-allowed opacity-50">
                    <input type="radio" name={t.testCode} checked={selectedTests[t.testCode] === true} onChange={() => handleToggle(t.testCode, true)} className="accent-zinc-100" />
                    <span className="text-xs text-zinc-500 uppercase tracking-widest">Applicable</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name={t.testCode} checked={selectedTests[t.testCode] !== true} onChange={() => handleToggle(t.testCode, false)} className="accent-zinc-100" />
                    <span className="text-xs text-zinc-500 uppercase tracking-widest">Not Applicable</span>
                  </label>
                </div>
              </div>
              {selectedTests[t.testCode] && (
                <div className="bg-amber-500/10 text-amber-400/90 text-xs px-3 py-2 rounded border border-amber-500/20 font-medium">
                  Planned — Not implemented in prototype.
                </div>
              )}
            </div>
          ))}
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
          onClick={handleSave}
          disabled={isSubmitting}
          className="bg-zinc-100 hover:bg-white text-zinc-950 px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          {isSubmitting ? "Saving..." : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}
