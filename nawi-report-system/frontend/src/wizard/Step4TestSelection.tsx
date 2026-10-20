import React, { useState, useEffect } from "react";
import type { Report, TestDefinition } from "../types";
import { D2 } from "../constants/disclaimers";

interface Step4Props {
  report: Report | null;
  onSave: (data: any, sectionKey?: string) => Promise<any>;
  onNext: () => void;
  onPrev: () => void;
}

export const IMPLEMENTED_TESTS = [
  { testCode: "WEIGHING_PERFORMANCE", testName: "Weighing Performance", description: "Evaluates indication error across incremental test load tiers." },
  { testCode: "ECCENTRICITY", testName: "Eccentricity", description: "Verifies platform corner and center load distribution uniformity." },
  { testCode: "REPEATABILITY", testName: "Repeatability", description: "Assesses measurement agreement across repeated load applications." },
  { testCode: "DISCRIMINATION", testName: "Discrimination", description: "Tests instrument responsiveness to an extra minor load increment." },
];

export const PLANNED_TESTS = [
  { testCode: "ZERO_RETURN", testName: "Zero Return" },
  { testCode: "CREEP_TEST", testName: "Creep" },
  { testCode: "TEMPERATURE_EFFECT", testName: "Temperature Effect" },
  { testCode: "WARM_UP_TIME", testName: "Warm-up Time" },
  { testCode: "VOLTAGE_VARIATION", testName: "Voltage Variation" },
  { testCode: "TILTING", testName: "Tilting" },
  { testCode: "TARE_WEIGHING", testName: "Tare Weighing" },
  { testCode: "STABILITY", testName: "Stability" },
  { testCode: "ELECTRICAL_DISTURBANCE", testName: "Electrical Disturbance" },
  { testCode: "DAMP_HEAT", testName: "Damp Heat" },
  { testCode: "SPAN_STABILITY", testName: "Span Stability" },
  { testCode: "ENDURANCE", testName: "Endurance" },
  { testCode: "CONSTRUCTION_EXAMINATION", testName: "Construction Examination" },
];

export default function Step4TestSelection({ report, onSave, onNext, onPrev }: Step4Props) {
  const [selectedTests, setSelectedTests] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (report?.tests && report.tests.length > 0) {
      const map: Record<string, boolean> = {};
      report.tests.forEach((t) => {
        map[t.testCode] = t.applicable;
      });
      // Default implemented tests to true if not explicitly set
      IMPLEMENTED_TESTS.forEach((t) => {
        if (map[t.testCode] === undefined) {
          map[t.testCode] = true;
        }
      });
      setSelectedTests(map);
    } else {
      const initial: Record<string, boolean> = {};
      IMPLEMENTED_TESTS.forEach((t) => {
        initial[t.testCode] = true;
      });
      setSelectedTests(initial);
    }
  }, [report]);

  const handleToggle = (code: string, applicable: boolean) => {
    setSelectedTests((prev) => ({ ...prev, [code]: applicable }));
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    const testsArray: TestDefinition[] = [];

    // Add implemented tests
    IMPLEMENTED_TESTS.forEach((t) => {
      const isApplicable = selectedTests[t.testCode] ?? true;
      const existing = report?.tests?.find((ext) => ext.testCode === t.testCode);
      if (existing) {
        testsArray.push({
          ...existing,
          applicable: isApplicable,
          status: isApplicable ? (existing.status === "NOT_APPLICABLE" ? "INCOMPLETE" : existing.status) : "NOT_APPLICABLE",
          result: isApplicable ? (existing.result === "NOT_APPLICABLE" ? "INCOMPLETE" : existing.result) : "NOT_APPLICABLE",
        });
      } else {
        testsArray.push({
          testCode: t.testCode,
          testName: t.testName,
          applicable: isApplicable,
          status: isApplicable ? "INCOMPLETE" : "NOT_APPLICABLE",
          observations: [],
          calculations: {},
          result: isApplicable ? "INCOMPLETE" : "NOT_APPLICABLE",
          remarks: "",
        });
      }
    });

    // Add planned tests as disabled / not applicable
    PLANNED_TESTS.forEach((t) => {
      testsArray.push({
        testCode: t.testCode,
        testName: t.testName,
        applicable: false,
        status: "NOT_APPLICABLE",
        observations: [],
        calculations: {},
        result: "NOT_APPLICABLE",
        remarks: D2,
      });
    });

    try {
      await onSave(testsArray, "tests");
      onNext();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-medium text-zinc-100 tracking-tight">Step 4: OIML R-76 Test Selection</h2>
        <p className="text-zinc-500 text-xs mt-1">
          Configure applicable verification test procedures for this instrument type.
        </p>
      </div>

      {/* Implemented Tests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Active Prototype Verification Tests ({IMPLEMENTED_TESTS.length})
          </h3>
          <span className="text-[11px] text-zinc-500">Live backend compliance calculations</span>
        </div>

        <div className="space-y-3">
          {IMPLEMENTED_TESTS.map((t) => {
            const isApplicable = selectedTests[t.testCode] ?? true;

            return (
              <div
                key={t.testCode}
                className={`p-4 rounded-xl border transition-all ${
                  isApplicable
                    ? "bg-zinc-900/60 border-zinc-800/80 shadow-sm"
                    : "bg-zinc-950/40 border-zinc-900/80"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-zinc-100">{t.testName}</span>
                      <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded border border-zinc-800">
                        {t.testCode}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">{t.description}</p>
                  </div>

                  {/* Toggle Controls */}
                  <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800/80 flex-shrink-0 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleToggle(t.testCode, true)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                        isApplicable
                          ? "bg-zinc-100 text-zinc-950 shadow-sm font-semibold"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                      data-testid={`toggle-${t.testCode}-applicable`}
                    >
                      Applicable
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggle(t.testCode, false)}
                      className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                        !isApplicable
                          ? "bg-zinc-800 text-zinc-300 shadow-sm font-semibold"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                      data-testid={`toggle-${t.testCode}-not-applicable`}
                    >
                      Not applicable
                    </button>
                  </div>
                </div>

                {/* Not-applicable INFO message per prompt requirement */}
                {!isApplicable && (
                  <div className="mt-3 text-xs bg-sky-500/10 border border-sky-500/20 text-sky-400 px-3 py-2 rounded-lg flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>This test has not been marked applicable.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Planned Tests Section (13 tests, disabled with D2 label) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Planned Tests ({PLANNED_TESTS.length}) — Disabled
          </h3>
          <span className="text-[11px] font-medium text-amber-500/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            D2: {D2}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {PLANNED_TESTS.map((t) => (
            <div
              key={t.testCode}
              className="p-3 bg-zinc-950/40 border border-zinc-900 rounded-xl flex items-center justify-between opacity-60 cursor-not-allowed"
              title={`D2: ${D2}`}
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-700"></span>
                <span className="text-xs text-zinc-400 font-medium">{t.testName}</span>
              </div>
              <span
                className="text-[10px] text-amber-400/90 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"
                title={`${D2} [D2]`}
                data-testid="d2-label"
              >
                Planned [D2]
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-zinc-800/60">
        <button
          type="button"
          onClick={onPrev}
          className="px-5 py-2 rounded-xl text-xs font-medium border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          ← Back to Step 3
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSubmitting}
          className="bg-zinc-100 hover:bg-white text-zinc-950 px-6 py-2 rounded-xl text-xs font-medium transition-all shadow-sm cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save & Continue to Step 5 →"}
        </button>
      </div>
    </div>
  );
}
