import { useState, useEffect, useCallback } from "react";
import type { Report, TestDefinition, CalculationResult } from "../types";
import { calculationsApi } from "../api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function Badge({ result }: { result: CalculationResult | null }) {
  if (!result) return <span className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded text-xs font-semibold">INCOMPLETE</span>;
  
  const status = result.result;
  let color = "bg-zinc-800 text-zinc-400 border-zinc-700";
  if (status === "PASS") color = "bg-green-500/10 text-green-400 border-green-500/20";
  if (status === "FAIL") color = "bg-red-500/10 text-red-400 border-red-500/20";
  if (status === "WARNING") color = "bg-amber-500/10 text-amber-400 border-amber-500/20";

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2.5 py-1 text-xs font-semibold rounded border ${color}`}>
        {status}
      </span>
      {result.maxPermissibleError !== undefined && (
        <span className="text-xs text-zinc-500 group relative flex items-center gap-1 cursor-help" title="Requires domain validation.">
          MPE: ±{result.maxPermissibleError.toFixed(2)}
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
      )}
    </div>
  );
}

function WeighingPerformance({ test, report, onChange }: any) {
  const [data, setData] = useState(test.observations[0] || { testLoad: "", indication: "", zeroError: "0" });
  const [result, setResult] = useState<CalculationResult | null>(null);

  const calculate = useCallback(async (d: any) => {
    if (d.testLoad === "" || d.indication === "") return;
    try {
      const res = await calculationsApi.weighingPerformance({
        testLoad: Number(d.testLoad),
        indication: Number(d.indication),
        zeroError: Number(d.zeroError || 0),
        e: report.instrument?.verificationIntervalE || 1,
        accuracyClass: report.instrument?.accuracyClass || "III"
      });
      setResult(res);
      onChange({ ...test, observations: [d], result: res.result, calculations: res });
    } catch (err) {}
  }, [report, test, onChange]);

  const handleChange = (e: any) => {
    const newData = { ...data, [e.target.name]: e.target.value };
    setData(newData);
    calculate(newData);
  };

  return (
    <div className="p-6 bg-zinc-900/50 border border-zinc-800/80 rounded-xl space-y-4">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
        <h3 className="text-sm font-medium text-zinc-300">Weighing Performance</h3>
        <Badge result={result} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Test Load</label>
          <input type="number" name="testLoad" value={data.testLoad} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Indication</label>
          <input type="number" name="indication" value={data.indication} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Zero Error</label>
          <input type="number" name="zeroError" value={data.zeroError} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none" />
        </div>
      </div>
      {result && (
        <div className="text-xs text-zinc-500 bg-zinc-950/50 p-2 rounded">
          Observed Error: {result.observedError?.toFixed(2)} | Formula: {result.formulaUsed}
        </div>
      )}
    </div>
  );
}

function Eccentricity({ test, report, onChange }: any) {
  const positions = ["CENTER", "FRONT_LEFT", "FRONT_RIGHT", "REAR_LEFT", "REAR_RIGHT"];
  const initialObs = test.observations.length > 0 ? test.observations : positions.map(p => ({ position: p, indication: "", reference: "" }));
  const [data, setData] = useState(initialObs);
  const [result, setResult] = useState<CalculationResult | null>(null);

  const calculate = useCallback(async (d: any) => {
    if (d.some((x: any) => x.indication === "" || x.reference === "")) return;
    try {
      const res = await calculationsApi.eccentricity({
        loads: d.map((x: any) => ({ position: x.position, indication: Number(x.indication), reference: Number(x.reference) })),
        e: report.instrument?.verificationIntervalE || 1,
        accuracyClass: report.instrument?.accuracyClass || "III"
      });
      setResult(res);
      onChange({ ...test, observations: d, result: res.result, calculations: res });
    } catch (err) {}
  }, [report, test, onChange]);

  const handleChange = (index: number, field: string, value: string) => {
    const newData = [...data];
    newData[index][field] = value;
    setData(newData);
    calculate(newData);
  };

  const getPosColor = (pos: string) => {
    if (!result?.details?.positions) return "bg-zinc-800 text-zinc-500 border-zinc-700";
    const positions = result.details.positions as any[];
    const p = positions.find((x: any) => x.position === pos);
    if (!p) return "bg-zinc-800 border-zinc-700 text-zinc-500";
    if (Math.abs(p.error) > p.mpe) return "bg-red-500/10 text-red-400 border-red-500/30";
    if (Math.abs(p.error) > p.mpe * 0.9) return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    return "bg-green-500/10 text-green-400 border-green-500/30";
  };

  return (
    <div className="p-6 bg-zinc-900/50 border border-zinc-800/80 rounded-xl space-y-4">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
        <h3 className="text-sm font-medium text-zinc-300">Eccentricity</h3>
        <Badge result={result} />
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-2">
          <div className="grid grid-cols-3 gap-2 mb-2 text-xs text-zinc-500">
            <div>Position</div><div>Reference</div><div>Indication</div>
          </div>
          {data.map((obs: any, i: number) => (
            <div key={obs.position} className="grid grid-cols-3 gap-2">
              <div className="text-xs text-zinc-400 flex items-center">{obs.position}</div>
              <input type="number" value={obs.reference} onChange={(e) => handleChange(i, "reference", e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none" />
              <input type="number" value={obs.indication} onChange={(e) => handleChange(i, "indication", e.target.value)} className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none" />
            </div>
          ))}
        </div>
        
        <div className="w-48 h-48 relative border-2 border-zinc-800 rounded-lg bg-zinc-950/50 mx-auto flex-shrink-0">
          <div className={`absolute top-2 left-2 w-10 h-10 border rounded flex items-center justify-center text-[10px] ${getPosColor("REAR_LEFT")}`}>RL</div>
          <div className={`absolute top-2 right-2 w-10 h-10 border rounded flex items-center justify-center text-[10px] ${getPosColor("REAR_RIGHT")}`}>RR</div>
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 border rounded flex items-center justify-center text-[10px] ${getPosColor("CENTER")}`}>C</div>
          <div className={`absolute bottom-2 left-2 w-10 h-10 border rounded flex items-center justify-center text-[10px] ${getPosColor("FRONT_LEFT")}`}>FL</div>
          <div className={`absolute bottom-2 right-2 w-10 h-10 border rounded flex items-center justify-center text-[10px] ${getPosColor("FRONT_RIGHT")}`}>FR</div>
        </div>
      </div>
    </div>
  );
}

function Repeatability({ test, report, onChange }: any) {
  const initialObs = test.observations.length > 0 ? test.observations : Array(10).fill({ reading: "" });
  const [data, setData] = useState(initialObs);
  const [testLoad, setTestLoad] = useState(test.calculations?.details?.testLoad || "");
  const [result, setResult] = useState<CalculationResult | null>(null);

  const calculate = useCallback(async (d: any, tl: string) => {
    const validReadings = d.map((x: any) => Number(x.reading)).filter((x: number) => !isNaN(x) && x !== 0);
    if (validReadings.length < 2 || tl === "") return;
    try {
      const res = await calculationsApi.repeatability({
        testLoad: Number(tl),
        readings: validReadings,
        e: report.instrument?.verificationIntervalE || 1,
        accuracyClass: report.instrument?.accuracyClass || "III"
      });
      setResult(res);
      onChange({ ...test, observations: d, result: res.result, calculations: res });
    } catch (err) {}
  }, [report, test, onChange]);

  const handleChange = (index: number, value: string) => {
    const newData = [...data];
    newData[index] = { reading: value };
    setData(newData);
    calculate(newData, testLoad);
  };
  
  const handleLoadChange = (e: any) => {
    setTestLoad(e.target.value);
    calculate(data, e.target.value);
  }

  const chartData = data.map((d: any, i: number) => ({ name: i+1, val: Number(d.reading) || null })).filter((d: any) => d.val !== null);
  const minVal = chartData.length > 0 ? Math.min(...chartData.map((d: any) => d.val)) : 0;
  const maxVal = chartData.length > 0 ? Math.max(...chartData.map((d: any) => d.val)) : 0;
  const domain = [minVal - (maxVal-minVal)*0.5 - 1, maxVal + (maxVal-minVal)*0.5 + 1];

  return (
    <div className="p-6 bg-zinc-900/50 border border-zinc-800/80 rounded-xl space-y-4">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
        <h3 className="text-sm font-medium text-zinc-300">Repeatability</h3>
        <Badge result={result} />
      </div>
      
      <div>
        <label className="block text-xs text-zinc-500 mb-1">Test Load</label>
        <input type="number" value={testLoad} onChange={handleLoadChange} className="w-1/3 bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none mb-4" />
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 w-full md:w-1/2">
          {data.map((obs: any, i: number) => (
            <div key={i}>
              <label className="block text-[10px] text-zinc-600 mb-0.5">Rep {i+1}</label>
              <input type="number" value={obs.reading} onChange={(e) => handleChange(i, e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-sm text-zinc-200 focus:outline-none" />
            </div>
          ))}
        </div>
        
        <div className="w-full md:w-1/2 h-32 border border-zinc-800/50 rounded-lg p-2 bg-zinc-950/30">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="name" hide />
              <YAxis domain={domain} hide />
              <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '4px', fontSize: '12px' }} />
              <Line type="monotone" dataKey="val" stroke="#a1a1aa" strokeWidth={2} dot={{ r: 3, fill: '#e4e4e7' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function Discrimination({ test, report, onChange }: any) {
  const [data, setData] = useState(test.observations[0] || { initialIndication: "", addedLoad: "", newIndication: "" });
  const [result, setResult] = useState<CalculationResult | null>(null);

  const calculate = useCallback(async (d: any) => {
    if (d.initialIndication === "" || d.addedLoad === "" || d.newIndication === "") return;
    try {
      const res = await calculationsApi.discrimination({
        initialIndication: Number(d.initialIndication),
        addedLoad: Number(d.addedLoad),
        newIndication: Number(d.newIndication),
        d: report.instrument?.actualIntervalD || 1,
        ruleSet: "OIML-R76-PROTOTYPE-V1"
      });
      setResult(res);
      onChange({ ...test, observations: [d], result: res.result, calculations: res });
    } catch (err) {}
  }, [report, test, onChange]);

  const handleChange = (e: any) => {
    const newData = { ...data, [e.target.name]: e.target.value };
    setData(newData);
    calculate(newData);
  };

  return (
    <div className="p-6 bg-zinc-900/50 border border-zinc-800/80 rounded-xl space-y-4">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
        <h3 className="text-sm font-medium text-zinc-300">Discrimination</h3>
        <Badge result={result} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Initial Indication</label>
          <input type="number" name="initialIndication" value={data.initialIndication} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">Added Load (d)</label>
          <input type="number" name="addedLoad" value={data.addedLoad} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none" />
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">New Indication</label>
          <input type="number" name="newIndication" value={data.newIndication} onChange={handleChange} className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 focus:outline-none" />
        </div>
      </div>
    </div>
  );
}

export default function Step5TestDataEntry({ report, onSave, onNext, onPrev, ...props }: any) {
  const [tests, setTests] = useState<TestDefinition[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (report?.tests) {
      setTests([...report.tests]);
    }
  }, [report]);

  const handleTestChange = (updatedTest: TestDefinition) => {
    setTests(prev => prev.map(t => t.testCode === updatedTest.testCode ? updatedTest : t));
  };

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      await onSave(tests, "tests");
      onNext();
    } finally {
      setIsSubmitting(false);
    }
  };

  const applicableTests = tests.filter(t => t.applicable);

  return (
    <div>
      <div className="mb-10">
        <h2 className="text-2xl font-light text-zinc-100 tracking-tight">Test Data Entry</h2>
        <p className="text-zinc-500 text-sm mt-1">Record observations for all applicable tests.</p>
      </div>

      {applicableTests.length === 0 && (
        <div className="p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
          No tests selected as applicable. Go back to Step 4.
        </div>
      )}

      <div className="space-y-6">
        {applicableTests.map(t => {
          if (t.testCode === "WEIGHING_PERFORMANCE") return <WeighingPerformance key={t.testCode} test={t} report={report} onChange={handleTestChange} />;
          if (t.testCode === "ECCENTRICITY") return <Eccentricity key={t.testCode} test={t} report={report} onChange={handleTestChange} />;
          if (t.testCode === "REPEATABILITY") return <Repeatability key={t.testCode} test={t} report={report} onChange={handleTestChange} />;
          if (t.testCode === "DISCRIMINATION") return <Discrimination key={t.testCode} test={t} report={report} onChange={handleTestChange} />;
          
          // Fallback for planned tests
          return (
            <div key={t.testCode} className="p-6 bg-zinc-900/20 border border-zinc-800/30 rounded-xl opacity-75">
              <h3 className="text-sm font-medium text-zinc-400 mb-2">{t.testName}</h3>
              <div className="bg-amber-500/10 text-amber-400/90 text-xs px-3 py-2 rounded border border-amber-500/20 font-medium">
                Planned — Not implemented in prototype.
              </div>
            </div>
          );
        })}
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
          onClick={handleSaveDraft}
          disabled={isSubmitting}
          className="bg-zinc-100 hover:bg-white text-zinc-950 px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          {isSubmitting ? "Saving..." : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}
