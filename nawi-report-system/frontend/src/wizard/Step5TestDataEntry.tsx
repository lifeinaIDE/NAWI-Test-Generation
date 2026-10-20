import React, { useState, useEffect, useMemo } from "react";
import type { Report, TestDefinition, CalculationResult } from "../types";
import { useCalculation } from "../hooks/useCalculation";
import PassFailIndicator from "../components/PassFailIndicator";
import PlatformMap from "../components/PlatformMap";
import RepeatabilityChart from "../components/RepeatabilityChart";

const ECCENTRICITY_POSITIONS = [
  "CENTER",
  "FRONT_LEFT",
  "FRONT_RIGHT",
  "REAR_LEFT",
  "REAR_RIGHT",
] as const;

interface Step5Props {
  report: Report;
  onSave: (payload: Partial<Report>) => Promise<Report>;
  onNext: () => void;
  onPrev: () => void;
}

export default function Step5TestDataEntry({
  report,
  onSave,
  onNext,
  onPrev,
}: Step5Props) {
  const [tests, setTests] = useState<TestDefinition[]>([]);
  const [activeTestCode, setActiveTestCode] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize tests from report
  useEffect(() => {
    if (report?.tests) {
      setTests(report.tests);
      const firstApplicable = report.tests.find((t) => t.applicable);
      if (firstApplicable && (!activeTestCode || !report.tests.some(t => t.testCode === activeTestCode && t.applicable))) {
        setActiveTestCode(firstApplicable.testCode);
      }
    }
  }, [report]);

  const applicableTests = useMemo(
    () => (tests || []).filter((t) => t.applicable),
    [tests]
  );

  const updateTestDefinition = (updated: TestDefinition) => {
    setTests((prev) =>
      prev.map((t) => (t.testCode === updated.testCode ? updated : t))
    );
  };

  const handleSaveAndContinue = async () => {
    setIsSaving(true);
    try {
      await onSave({ tests });
      onNext();
    } finally {
      setIsSaving(false);
    }
  };

  const activeTest = applicableTests.find((t) => t.testCode === activeTestCode);

  // Dot color helper strictly from backend result
  const getStatusDotColor = (result?: string) => {
    if (result === "PASS") return "bg-emerald-400";
    if (result === "WARNING") return "bg-amber-400";
    if (result === "FAIL") return "bg-rose-500";
    return "bg-zinc-600";
  };

  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div>
        <h2 className="text-xl font-medium text-zinc-100 tracking-tight">
          Step 5: Test Data Entry & Live Compliance Calculations
        </h2>
        <p className="text-zinc-500 text-xs mt-1">
          Record physical test observations. All MPE checks and compliance determinations are executed entirely by the backend rule engine.
        </p>
      </div>

      {applicableTests.length === 0 ? (
        <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/40">
          <p className="text-sm">No tests selected as applicable. Please return to Step 4 to mark tests applicable.</p>
          <button
            type="button"
            onClick={onPrev}
            className="mt-3 text-xs text-sky-400 hover:text-sky-300 underline"
          >
            ← Return to Step 4 Test Selection
          </button>
        </div>
      ) : (
        <>
          {/* Test Tabs with Result Dot */}
          <div className="flex flex-wrap gap-2 border-b border-zinc-800/80 pb-3" role="tablist">
            {applicableTests.map((t) => {
              const isActive = t.testCode === activeTestCode;
              return (
                <button
                  key={t.testCode}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTestCode(t.testCode)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all border cursor-pointer ${
                    isActive
                      ? "bg-zinc-800 border-zinc-700 text-zinc-100 shadow-sm"
                      : "bg-zinc-950/60 border-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${getStatusDotColor(t.result)}`}
                    data-testid={`dot-${t.testCode}`}
                  />
                  <span>{t.testName}</span>
                </button>
              );
            })}
          </div>

          {/* Active Test View */}
          {activeTest && (
            <div className="space-y-6">
              {activeTest.testCode === "WEIGHING_PERFORMANCE" && (
                <WeighingPerformanceView
                  test={activeTest}
                  report={report}
                  onChange={updateTestDefinition}
                />
              )}

              {activeTest.testCode === "ECCENTRICITY" && (
                <EccentricityView
                  test={activeTest}
                  report={report}
                  onChange={updateTestDefinition}
                />
              )}

              {activeTest.testCode === "REPEATABILITY" && (
                <RepeatabilityView
                  test={activeTest}
                  report={report}
                  onChange={updateTestDefinition}
                />
              )}

              {activeTest.testCode === "DISCRIMINATION" && (
                <DiscriminationView
                  test={activeTest}
                  report={report}
                  onChange={updateTestDefinition}
                />
              )}

              {!["WEIGHING_PERFORMANCE", "ECCENTRICITY", "REPEATABILITY", "DISCRIMINATION"].includes(
                activeTest.testCode
              ) && (
                <div className="p-6 bg-zinc-900/30 border border-zinc-800/40 rounded-2xl space-y-2">
                  <h3 className="text-sm font-medium text-zinc-300">{activeTest.testName}</h3>
                  <div className="bg-amber-500/10 text-amber-400 text-xs px-3 py-2 rounded-lg border border-amber-500/20 font-medium">
                    Planned — Not implemented in prototype. (D2)
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-zinc-800/60">
        <button
          type="button"
          onClick={onPrev}
          className="px-5 py-2 rounded-xl text-xs font-medium border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          ← Back to Step 4
        </button>

        <button
          type="button"
          disabled={isSaving}
          onClick={handleSaveAndContinue}
          className="bg-zinc-100 hover:bg-white text-zinc-950 px-6 py-2 rounded-xl text-xs font-medium transition-all shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? "Saving..." : "Save & Continue to Attachments →"}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// 1. WEIGHING PERFORMANCE VIEW
// ==========================================
function WeighingPerformanceView({
  test,
  report,
  onChange,
}: {
  test: TestDefinition;
  report: Report;
  onChange: (t: TestDefinition) => void;
}) {
  const firstObs = (test.observations && test.observations[0]) || {};
  const [testLoad, setTestLoad] = useState<string>(
    firstObs.testLoad !== undefined ? String(firstObs.testLoad) : ""
  );
  const [indication, setIndication] = useState<string>(
    firstObs.indication !== undefined ? String(firstObs.indication) : ""
  );
  const [zeroError, setZeroError] = useState<string>(
    firstObs.zeroError !== undefined ? String(firstObs.zeroError) : "0"
  );

  const eVal = report.instrument?.verificationIntervalE ?? 1;
  const accClass = report.instrument?.accuracyClass ?? "III";
  const maxCap = report.instrument?.maxCapacity;

  // Calculation payload
  const payload = useMemo(() => {
    if (testLoad === "" || indication === "") return null;
    return {
      testLoad: parseFloat(testLoad),
      indication: parseFloat(indication),
      zeroError: parseFloat(zeroError || "0"),
      e: eVal,
      accuracyClass: accClass,
    };
  }, [testLoad, indication, zeroError, eVal, accClass]);

  // Hook handles debounce (400ms) and cancellation
  const { result, loading, error } = useCalculation("weighingPerformance", payload);

  // Sync test state when backend result updates
  useEffect(() => {
    if (result) {
      onChange({
        ...test,
        observations: [
          {
            testLoad: testLoad !== "" ? parseFloat(testLoad) : 0,
            indication: indication !== "" ? parseFloat(indication) : 0,
            zeroError: zeroError !== "" ? parseFloat(zeroError) : 0,
          },
        ],
        calculations: result,
        result: result.result,
        status: result.result !== "INCOMPLETE" ? "COMPLETED" : "INCOMPLETE",
      });
    }
  }, [result]);

  // Check if load exceeds capacity
  const customMessages = useMemo(() => {
    const msgs: { level: "ERROR" | "WARNING" | "INFO"; message: string }[] = [];
    const numLoad = parseFloat(testLoad);
    if (!isNaN(numLoad) && maxCap !== undefined && numLoad > maxCap) {
      msgs.push({
        level: "ERROR",
        message: `Test load (${numLoad}) exceeds instrument maximum capacity (${maxCap}).`,
      });
    }
    return msgs;
  }, [testLoad, maxCap]);

  return (
    <div className="space-y-5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
      {/* Test Title & Auto-filled Metadata Chips */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Weighing Performance Test</h3>
          <p className="text-zinc-500 text-xs mt-0.5 font-mono">
            Observed Error = Indication - Test Load
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono">
            e = <strong className="text-zinc-200">{eVal}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono">
            Class: <strong className="text-zinc-200">{accClass}</strong>
          </span>
          {maxCap !== undefined && (
            <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono">
              Max: <strong className="text-zinc-200">{maxCap}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Test Load
          </label>
          <input
            type="number"
            step="any"
            value={testLoad}
            onChange={(e) => setTestLoad(e.target.value)}
            placeholder="e.g. 500"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            data-testid="input-testLoad"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Indication
          </label>
          <input
            type="number"
            step="any"
            value={indication}
            onChange={(e) => setIndication(e.target.value)}
            placeholder="e.g. 500.2"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            data-testid="input-indication"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Zero Error
          </label>
          <input
            type="number"
            step="any"
            value={zeroError}
            onChange={(e) => setZeroError(e.target.value)}
            placeholder="0"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            data-testid="input-zeroError"
          />
        </div>
      </div>

      {/* Backend Driven Pass/Fail Indicator */}
      <PassFailIndicator
        result={result || ((test.calculations as any) as CalculationResult)}
        loading={loading}
        error={error}
        customMessages={customMessages}
      />
    </div>
  );
}

// ==========================================
// 2. ECCENTRICITY VIEW
// ==========================================
function EccentricityView({
  test,
  report,
  onChange,
}: {
  test: TestDefinition;
  report: Report;
  onChange: (t: TestDefinition) => void;
}) {
  const eVal = report.instrument?.verificationIntervalE ?? 1;
  const accClass = report.instrument?.accuracyClass ?? "III";
  const maxCap = report.instrument?.maxCapacity;

  // Initialize 5 positions
  const [positionsData, setPositionsData] = useState(() => {
    const existing = test.observations || [];
    return ECCENTRICITY_POSITIONS.map((pos) => {
      const match = existing.find((o: any) => o.position === pos);
      return {
        position: pos,
        load: match?.load !== undefined ? String(match.load) : match?.reference !== undefined ? String(match.reference) : "",
        reference: match?.reference !== undefined ? String(match.reference) : match?.load !== undefined ? String(match.load) : "",
        indication: match?.indication !== undefined ? String(match.indication) : "",
      };
    });
  });

  const handleRowChange = (index: number, field: "load" | "reference" | "indication", val: string) => {
    setPositionsData((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      // Keep load and reference aligned if one was empty
      if (field === "load" && copy[index].reference === "") {
        copy[index].reference = val;
      }
      return copy;
    });
  };

  // Prepare payload for calculation
  const payload = useMemo(() => {
    const allFilled = positionsData.every(
      (p) => p.indication !== "" && (p.reference !== "" || p.load !== "")
    );
    if (!allFilled) return null;

    return {
      loads: positionsData.map((p) => ({
        position: p.position,
        load: parseFloat(p.load || p.reference || "0"),
        reference: parseFloat(p.reference || p.load || "0"),
        indication: parseFloat(p.indication || "0"),
      })),
      e: eVal,
      accuracyClass: accClass,
    };
  }, [positionsData, eVal, accClass]);

  const { result, loading, error } = useCalculation("eccentricity", payload);

  useEffect(() => {
    if (result) {
      onChange({
        ...test,
        observations: positionsData.map((p) => ({
          position: p.position,
          load: parseFloat(p.load || p.reference || "0"),
          reference: parseFloat(p.reference || p.load || "0"),
          indication: parseFloat(p.indication || "0"),
        })),
        calculations: result,
        result: result.result,
        status: result.result !== "INCOMPLETE" ? "COMPLETED" : "INCOMPLETE",
      });
    }
  }, [result]);

  // Capacity overload warning
  const customMessages = useMemo(() => {
    const msgs: { level: "ERROR" | "WARNING" | "INFO"; message: string }[] = [];
    if (maxCap !== undefined) {
      const overloads = positionsData.filter(
        (p) => parseFloat(p.load || p.reference || "0") > maxCap
      );
      if (overloads.length > 0) {
        msgs.push({
          level: "ERROR",
          message: `Eccentricity test load exceeds instrument maximum capacity (${maxCap}) at positions: ${overloads.map(o => o.position).join(", ")}.`,
        });
      }
    }
    return msgs;
  }, [positionsData, maxCap]);

  // Extract positions detail from backend result
  const calculationPositions = (result?.details?.positions as any[]) || [];
  const worstPosition = (result?.details?.worstPosition as string) || "";

  return (
    <div className="space-y-5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Eccentricity Test</h3>
          <p className="text-zinc-500 text-xs mt-0.5">
            Test 5 positions (approx. 1/3 Max) according to OIML R-76.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono">
            e = <strong className="text-zinc-200">{eVal}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono">
            Class: <strong className="text-zinc-200">{accClass}</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table of 5 Positions */}
        <div className="lg:col-span-7 space-y-2 overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="text-[11px] uppercase text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="py-2 px-2">Position</th>
                <th className="py-2 px-2">Load</th>
                <th className="py-2 px-2">Reference</th>
                <th className="py-2 px-2">Indication</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {positionsData.map((row, idx) => (
                <tr key={row.position}>
                  <td className="py-2 px-2 font-mono text-[11px] text-zinc-400">
                    {row.position}
                  </td>
                  <td className="py-2 px-1">
                    <input
                      type="number"
                      step="any"
                      value={row.load}
                      onChange={(e) => handleRowChange(idx, "load", e.target.value)}
                      placeholder="Load"
                      className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-600"
                      data-testid={`ecc-load-${row.position}`}
                    />
                  </td>
                  <td className="py-2 px-1">
                    <input
                      type="number"
                      step="any"
                      value={row.reference}
                      onChange={(e) => handleRowChange(idx, "reference", e.target.value)}
                      placeholder="Reference"
                      className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-600"
                      data-testid={`ecc-ref-${row.position}`}
                    />
                  </td>
                  <td className="py-2 px-1">
                    <input
                      type="number"
                      step="any"
                      value={row.indication}
                      onChange={(e) => handleRowChange(idx, "indication", e.target.value)}
                      placeholder="Indication"
                      className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-600"
                      data-testid={`ecc-ind-${row.position}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Platform SVG Topography Visualizer */}
        <div className="lg:col-span-5">
          <PlatformMap
            positions={calculationPositions}
            worstPosition={worstPosition}
          />
        </div>
      </div>

      {/* Backend Driven Pass/Fail Indicator */}
      <PassFailIndicator
        result={result || ((test.calculations as any) as CalculationResult)}
        loading={loading}
        error={error}
        customMessages={customMessages}
      />
    </div>
  );
}

// ==========================================
// 3. REPEATABILITY VIEW
// ==========================================
function RepeatabilityView({
  test,
  report,
  onChange,
}: {
  test: TestDefinition;
  report: Report;
  onChange: (t: TestDefinition) => void;
}) {
  const eVal = report.instrument?.verificationIntervalE ?? 1;
  const accClass = report.instrument?.accuracyClass ?? "III";
  const maxCap = report.instrument?.maxCapacity;

  // Extract initial values
  const existingObs = (test.observations as any[]) || [];
  const initialLoad =
    existingObs.find((o: any) => o.testLoad !== undefined)?.testLoad ??
    (test.calculations as any)?.details?.testLoad ??
    "";
  const initialReadings = existingObs
    .map((o: any) => o.reading)
    .filter((r: any) => r !== undefined && r !== "");

  const [testLoad, setTestLoad] = useState<string>(
    initialLoad !== "" ? String(initialLoad) : ""
  );
  const [repsCount, setRepsCount] = useState<number>(
    initialReadings.length >= 2 ? initialReadings.length : 10
  );

  const [readings, setReadings] = useState<string[]>(() => {
    const list: string[] = [];
    for (let i = 0; i < (repsCount || 10); i++) {
      list.push(initialReadings[i] !== undefined ? String(initialReadings[i]) : "");
    }
    return list;
  });

  const handleRepsCountChange = (newCount: number) => {
    setRepsCount(newCount);
    setReadings((prev) => {
      const updated = [...prev];
      while (updated.length < newCount) updated.push("");
      return updated.slice(0, newCount);
    });
  };

  const handleReadingChange = (index: number, val: string) => {
    setReadings((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  // Payload for backend calculation
  const payload = useMemo(() => {
    const validReadings = readings
      .map((r) => parseFloat(r))
      .filter((n) => !isNaN(n));
    if (testLoad === "" || validReadings.length < 2) return null;

    return {
      testLoad: parseFloat(testLoad),
      readings: validReadings,
      e: eVal,
      accuracyClass: accClass,
    };
  }, [testLoad, readings, eVal, accClass]);

  const { result, loading, error } = useCalculation("repeatability", payload);

  useEffect(() => {
    if (result) {
      const numLoad = parseFloat(testLoad);
      onChange({
        ...test,
        observations: readings.map((r, i) => ({
          repetition: i + 1,
          reading: r !== "" ? parseFloat(r) : null,
          testLoad: numLoad,
        })),
        calculations: result,
        result: result.result,
        status: result.result !== "INCOMPLETE" ? "COMPLETED" : "INCOMPLETE",
      });
    }
  }, [result]);

  // Capacity overload warning
  const customMessages = useMemo(() => {
    const msgs: { level: "ERROR" | "WARNING" | "INFO"; message: string }[] = [];
    const numLoad = parseFloat(testLoad);
    if (!isNaN(numLoad) && maxCap !== undefined && numLoad > maxCap) {
      msgs.push({
        level: "ERROR",
        message: `Repeatability test load (${numLoad}) exceeds instrument maximum capacity (${maxCap}).`,
      });
    }
    return msgs;
  }, [testLoad, maxCap]);

  return (
    <div className="space-y-5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Repeatability Test</h3>
          <p className="text-zinc-500 text-xs mt-0.5">
            Range of readings (max - min) must not exceed MPE per OIML R-76.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono">
            e = <strong className="text-zinc-200">{eVal}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono">
            Class: <strong className="text-zinc-200">{accClass}</strong>
          </span>
        </div>
      </div>

      {/* Controls: Test Load & Repetitions Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Test Load
          </label>
          <input
            type="number"
            step="any"
            value={testLoad}
            onChange={(e) => setTestLoad(e.target.value)}
            placeholder="e.g. 3000"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            data-testid="input-repeatability-load"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Number of Repetitions (Default 10)
          </label>
          <select
            value={repsCount}
            onChange={(e) => handleRepsCountChange(parseInt(e.target.value, 10))}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 cursor-pointer"
            data-testid="select-repeatability-reps"
          >
            <option value={3}>3 Repetitions</option>
            <option value={5}>5 Repetitions</option>
            <option value={10}>10 Repetitions (Standard)</option>
            <option value={15}>15 Repetitions</option>
            <option value={20}>20 Repetitions</option>
          </select>
        </div>
      </div>

      {/* Readings Inputs Grid & Dispersion Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Dynamic Inputs */}
        <div className="lg:col-span-6 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {readings.map((val, idx) => (
            <div key={idx} className="space-y-1">
              <label className="block text-[11px] text-zinc-500 font-mono">
                Rep {idx + 1}
              </label>
              <input
                type="number"
                step="any"
                value={val}
                onChange={(e) => handleReadingChange(idx, e.target.value)}
                placeholder="Reading"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-zinc-600"
                data-testid={`rep-reading-${idx + 1}`}
              />
            </div>
          ))}
        </div>

        {/* Recharts Curve with Max/Min Reference Lines */}
        <div className="lg:col-span-6">
          <RepeatabilityChart
            readings={readings}
            maxVal={result?.details?.max ?? (test.calculations?.details as any)?.max}
            minVal={result?.details?.min ?? (test.calculations?.details as any)?.min}
          />
        </div>
      </div>

      {/* Backend Driven Pass/Fail Indicator */}
      <PassFailIndicator
        result={result || ((test.calculations as any) as CalculationResult)}
        loading={loading}
        error={error}
        customMessages={customMessages}
      />
    </div>
  );
}

// ==========================================
// 4. DISCRIMINATION VIEW
// ==========================================
function DiscriminationView({
  test,
  report,
  onChange,
}: {
  test: TestDefinition;
  report: Report;
  onChange: (t: TestDefinition) => void;
}) {
  const dVal = report.instrument?.actualIntervalD ?? 1;

  const firstObs = (test.observations && test.observations[0]) || {};
  const [initialIndication, setInitialIndication] = useState<string>(
    firstObs.initialIndication !== undefined ? String(firstObs.initialIndication) : ""
  );
  const [addedLoad, setAddedLoad] = useState<string>(
    firstObs.addedLoad !== undefined ? String(firstObs.addedLoad) : ""
  );
  const [newIndication, setNewIndication] = useState<string>(
    firstObs.newIndication !== undefined ? String(firstObs.newIndication) : ""
  );

  const payload = useMemo(() => {
    if (initialIndication === "" || newIndication === "") return null;
    return {
      initialIndication: parseFloat(initialIndication),
      addedLoad: addedLoad !== "" ? parseFloat(addedLoad) : undefined,
      newIndication: parseFloat(newIndication),
      d: dVal,
    };
  }, [initialIndication, addedLoad, newIndication, dVal]);

  const { result, loading, error } = useCalculation("discrimination", payload);

  useEffect(() => {
    if (result) {
      onChange({
        ...test,
        observations: [
          {
            initialIndication: initialIndication !== "" ? parseFloat(initialIndication) : 0,
            addedLoad: addedLoad !== "" ? parseFloat(addedLoad) : null,
            newIndication: newIndication !== "" ? parseFloat(newIndication) : 0,
          },
        ],
        calculations: result,
        result: result.result,
        status: result.result !== "INCOMPLETE" ? "COMPLETED" : "INCOMPLETE",
      });
    }
  }, [result]);

  return (
    <div className="space-y-5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-200">Discrimination Test</h3>
          <p className="text-zinc-500 text-xs mt-0.5">
            Verify response to an extra load equivalent to 1.4d per OIML R-76.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 font-mono">
            d = <strong className="text-zinc-200">{dVal}</strong> (auto-filled)
          </span>
        </div>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Initial Indication
          </label>
          <input
            type="number"
            step="any"
            value={initialIndication}
            onChange={(e) => setInitialIndication(e.target.value)}
            placeholder="e.g. 1000"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            data-testid="input-initialIndication"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Added Load (Optional, standard: 1.4d)
          </label>
          <input
            type="number"
            step="any"
            value={addedLoad}
            onChange={(e) => setAddedLoad(e.target.value)}
            placeholder={`e.g. ${(1.4 * dVal).toFixed(2)}`}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            data-testid="input-addedLoad"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            New Indication
          </label>
          <input
            type="number"
            step="any"
            value={newIndication}
            onChange={(e) => setNewIndication(e.target.value)}
            placeholder="e.g. 1001"
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
            data-testid="input-newIndication"
          />
        </div>
      </div>

      {/* Backend Driven Pass/Fail Indicator */}
      <PassFailIndicator
        result={result || ((test.calculations as any) as CalculationResult)}
        loading={loading}
        error={error}
      />
    </div>
  );
}
