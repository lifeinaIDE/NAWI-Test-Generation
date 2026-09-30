import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { rulesApi } from "../api";
import type { RuleSet } from "../types";

export default function RuleAdmin() {
  const { user } = useAuth();
  const [rules, setRules] = useState<RuleSet[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedRule, setSelectedRule] = useState<RuleSet | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saveError, setSaveError] = useState("");

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await rulesApi.list();
      setRules(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleCreateDraft = async () => {
    try {
      await rulesApi.create();
      await loadRules();
    } catch (err) {
      console.error(err);
      alert("Failed to create draft");
    }
  };

  const handleActivate = async (id: string) => {
    if (!window.confirm("Are you sure you want to activate this rule-set? All new reports will use it.")) return;
    try {
      await rulesApi.activate(id);
      await loadRules();
      setSelectedRule(null);
    } catch (err) {
      console.error(err);
      alert("Failed to activate");
    }
  };

  const handleView = (r: RuleSet) => {
    setSelectedRule(r);
    setEditMode(false);
    setEditContent(JSON.stringify(r, null, 2));
    setSaveError("");
  };

  const handleEdit = (r: RuleSet) => {
    setSelectedRule(r);
    setEditMode(true);
    setEditContent(JSON.stringify(r, null, 2));
    setSaveError("");
  };

  const handleSaveEdit = async () => {
    if (!selectedRule) return;
    try {
      const parsed = JSON.parse(editContent);
      await rulesApi.update(selectedRule.ruleSetId, parsed);
      setEditMode(false);
      await loadRules();
    } catch (err: any) {
      console.error(err);
      setSaveError(err.response?.data?.detail || "Invalid JSON or save failed");
    }
  };

  if (user?.role !== "ADMIN") {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-zinc-100">Access Denied</h1>
        <p className="text-zinc-500 mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div className="pt-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light text-zinc-100 tracking-tight">Rule Administration</h1>
          <p className="text-zinc-500 mt-2 text-sm">Manage OIML R-76 configuration.</p>
        </div>
        <button
          onClick={handleCreateDraft}
          className="bg-zinc-100 hover:bg-white text-zinc-950 px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
        >
          Create New Draft
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 border border-zinc-800/60 bg-zinc-900/20 rounded-2xl p-4 backdrop-blur-sm overflow-hidden flex flex-col">
          <h2 className="text-sm font-medium text-zinc-300 uppercase tracking-widest mb-4 px-2">Versions</h2>
          {loading ? (
            <div className="text-zinc-500 text-sm px-2">Loading...</div>
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto">
              {rules.map(r => (
                <div 
                  key={r.ruleSetId} 
                  onClick={() => !editMode && handleView(r)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${selectedRule?.ruleSetId === r.ruleSetId ? "border-blue-500/50 bg-blue-500/10" : "border-zinc-800/50 bg-zinc-900/50 hover:border-zinc-700"} ${editMode ? "opacity-50 pointer-events-none" : ""}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm text-zinc-200">{r.ruleSetId}</span>
                    {r.isActive && <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded uppercase tracking-wider font-semibold">Active</span>}
                    {!r.isActive && r.isLocked && <span className="text-zinc-500 text-xs" title="Locked by approved report">🔒 Locked</span>}
                    {!r.isActive && !r.isLocked && <span className="text-zinc-500 text-xs">Draft</span>}
                  </div>
                  <div className="text-xs text-zinc-500">Effective: {r.effectiveFrom}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 border border-zinc-800/60 bg-zinc-900/20 rounded-2xl p-6 backdrop-blur-sm flex flex-col">
          {selectedRule ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-medium text-zinc-200 font-mono">{selectedRule.ruleSetId}</h2>
                  <p className="text-sm text-zinc-500 mt-1">{selectedRule.edition}</p>
                </div>
                <div className="flex gap-3">
                  {!selectedRule.isActive && !selectedRule.isLocked && !editMode && (
                    <button onClick={() => handleEdit(selectedRule)} className="text-sm px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg transition-colors border border-zinc-700">
                      Edit JSON
                    </button>
                  )}
                  {!selectedRule.isActive && !editMode && (
                    <button onClick={() => handleActivate(selectedRule.ruleSetId)} className="text-sm px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/20">
                      Activate
                    </button>
                  )}
                  {editMode && (
                    <>
                      <button onClick={() => handleView(selectedRule)} className="text-sm px-4 py-2 text-zinc-400 hover:text-zinc-200">
                        Cancel
                      </button>
                      <button onClick={handleSaveEdit} className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                        Save
                      </button>
                    </>
                  )}
                </div>
              </div>

              {saveError && (
                <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm">
                  {saveError}
                </div>
              )}

              <div className="flex-1 min-h-[500px]">
                {editMode ? (
                  <textarea 
                    className="w-full h-full bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm font-mono text-zinc-300 focus:outline-none focus:border-blue-500/50"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    spellCheck={false}
                  />
                ) : (
                  <pre className="w-full h-full bg-zinc-950/50 border border-zinc-800/50 rounded-lg p-4 text-sm font-mono text-zinc-400 overflow-auto">
                    {editContent}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-zinc-300">No Rule Set Selected</h3>
              <p className="text-zinc-500 mt-2 max-w-sm text-sm">Select a rule-set version from the sidebar to view its configuration or create a new draft.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
