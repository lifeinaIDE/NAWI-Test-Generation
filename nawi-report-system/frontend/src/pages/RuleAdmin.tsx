import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { rulesApi } from "../api";
import type { RuleSet, MpeBand } from "../types";

import SkeletonLoader from "../components/SkeletonLoader";
import ErrorBanner from "../components/ErrorBanner";
import useBackendUnreachable from "../hooks/useBackendUnreachable";

const ACCURACY_CLASSES = ["I", "II", "III", "IIII"];

export default function RuleAdmin() {
  const { user } = useAuth();
  const isUnreachable = useBackendUnreachable();
  const [rules, setRules] = useState<RuleSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Selected Rule and View/Edit State
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isJsonView, setIsJsonView] = useState(false);

  // Working copy for editing
  const [draftRule, setDraftRule] = useState<RuleSet | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [selectedClassTab, setSelectedClassTab] = useState<string>("III");

  // Feedback banners
  const [conflict409Error, setConflict409Error] = useState<string | null>(null);
  const [validationMessages, setValidationMessages] = useState<{
    status: "success" | "error";
    errors: string[];
  } | null>(null);

  // Activation Confirmation Modal
  const [confirmActivateId, setConfirmActivateId] = useState<string | null>(null);

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await rulesApi.list();
      setRules(res);

      // Keep selection or default to active
      if (res.length > 0) {
        if (!selectedRuleId) {
          const activeRule = res.find((r) => r.isActive) || res[0];
          setSelectedRuleId(activeRule.ruleSetId);
          setDraftRule(JSON.parse(JSON.stringify(activeRule)));
          setJsonText(JSON.stringify(activeRule, null, 2));
        } else {
          const current = res.find((r) => r.ruleSetId === selectedRuleId);
          if (current && !isEditing) {
            setDraftRule(JSON.parse(JSON.stringify(current)));
            setJsonText(JSON.stringify(current, null, 2));
          }
        }
      }
    } catch (err) {
      console.error("Failed to load rules:", err);
      setApiError("Failed to load regulatory rule-sets from server.");
      toast.error("Failed to load rule-sets.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const selectedRule = rules.find((r) => r.ruleSetId === selectedRuleId) || null;

  const handleSelectRule = (r: RuleSet) => {
    if (isEditing) {
      if (!window.confirm("You have unsaved changes. Discard them to switch rule-sets?")) {
        return;
      }
    }
    setSelectedRuleId(r.ruleSetId);
    setDraftRule(JSON.parse(JSON.stringify(r)));
    setJsonText(JSON.stringify(r, null, 2));
    setIsEditing(false);
    setConflict409Error(null);
    setValidationMessages(null);
  };

  const handleCreateDraft = async () => {
    try {
      const newDraft = await rulesApi.create({
        copyFrom: selectedRule?.ruleSetId,
      });
      toast.success(`Draft ${newDraft.ruleSetId} created.`);
      setSelectedRuleId(newDraft.ruleSetId);
      setDraftRule(JSON.parse(JSON.stringify(newDraft)));
      setJsonText(JSON.stringify(newDraft, null, 2));
      setIsEditing(true);
      setConflict409Error(null);
      setValidationMessages(null);
      await loadRules();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to create new draft rule-set.");
    }
  };

  const handleStartEdit = () => {
    if (!selectedRule) return;
    if (selectedRule.isLocked) {
      setConflict409Error(
        "Rule-set is referenced by an approved report and cannot be edited. Only a new version can be created."
      );
      return;
    }
    if (selectedRule.status && selectedRule.status !== "DRAFT") {
      toast.error("Only DRAFT rule-sets can be edited. Create a new draft version to make changes.");
      return;
    }
    setDraftRule(JSON.parse(JSON.stringify(selectedRule)));
    setJsonText(JSON.stringify(selectedRule, null, 2));
    setIsEditing(true);
    setConflict409Error(null);
    setValidationMessages(null);
  };

  const handleCancelEdit = () => {
    if (selectedRule) {
      setDraftRule(JSON.parse(JSON.stringify(selectedRule)));
      setJsonText(JSON.stringify(selectedRule, null, 2));
    }
    setIsEditing(false);
    setConflict409Error(null);
    setValidationMessages(null);
  };

  // Structured MPE band updates
  const handleUpdateBand = (accuracyClass: string, index: number, field: keyof MpeBand, value: any) => {
    if (!draftRule) return;
    const updated = JSON.parse(JSON.stringify(draftRule));
    if (!updated.mpeRules) updated.mpeRules = {};
    if (!updated.mpeRules[accuracyClass]) updated.mpeRules[accuracyClass] = [];
    
    const num = parseFloat(value);
    updated.mpeRules[accuracyClass][index][field] = isNaN(num) ? value : num;
    setDraftRule(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  const handleAddBand = (accuracyClass: string) => {
    if (!draftRule) return;
    const updated = JSON.parse(JSON.stringify(draftRule));
    if (!updated.mpeRules) updated.mpeRules = {};
    if (!updated.mpeRules[accuracyClass]) updated.mpeRules[accuracyClass] = [];

    const bands: MpeBand[] = updated.mpeRules[accuracyClass];
    const lastBand = bands[bands.length - 1];
    const newMin = lastBand ? lastBand.maxIntervals : 0;
    const newMax = newMin + 5000;
    const newMpe = lastBand ? lastBand.mpeInE + 0.5 : 0.5;

    bands.push({
      minIntervals: newMin,
      maxIntervals: newMax,
      mpeInE: newMpe,
    });

    setDraftRule(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  const handleRemoveBand = (accuracyClass: string, index: number) => {
    if (!draftRule) return;
    const updated = JSON.parse(JSON.stringify(draftRule));
    if (updated.mpeRules && updated.mpeRules[accuracyClass]) {
      updated.mpeRules[accuracyClass].splice(index, 1);
    }
    setDraftRule(updated);
    setJsonText(JSON.stringify(updated, null, 2));
  };

  // Switch between JSON and Structured editor
  const handleToggleJsonView = () => {
    if (!isJsonView) {
      // Switching to JSON: format current draftRule
      setJsonText(JSON.stringify(draftRule, null, 2));
      setIsJsonView(true);
    } else {
      // Switching back to structured: parse JSON
      try {
        const parsed = JSON.parse(jsonText);
        setDraftRule(parsed);
        setIsJsonView(false);
      } catch (err: any) {
        toast.error("Invalid JSON syntax: " + err.message);
      }
    }
  };

  // Rule continuity validation (domain logic)
  const validateRuleContent = (target: RuleSet): string[] => {
    const errors: string[] = [];
    if (!target.ruleSetId) errors.push("Missing ruleSetId.");
    if (!target.standard) errors.push("Missing standard.");
    if (!target.edition) errors.push("Missing edition.");
    if (!target.mpeRules || typeof target.mpeRules !== "object") {
      errors.push("Missing mpeRules object.");
    } else {
      for (const [cls, bands] of Object.entries(target.mpeRules)) {
        if (!Array.isArray(bands) || bands.length === 0) {
          errors.push(`Class ${cls} must have at least one MPE band.`);
          continue;
        }
        let lastMax: number | null = null;
        bands.forEach((b: MpeBand, idx: number) => {
          if (b.minIntervals >= b.maxIntervals) {
            errors.push(`Class ${cls} band #${idx + 1}: minIntervals must be < maxIntervals.`);
          }
          if (b.mpeInE <= 0) {
            errors.push(`Class ${cls} band #${idx + 1}: mpeInE must be positive.`);
          }
          if (idx === 0) {
            if (b.minIntervals !== 0) {
              errors.push(`Class ${cls} band #1 must start at 0 intervals.`);
            }
          } else if (lastMax !== null && b.minIntervals !== lastMax) {
            errors.push(`Class ${cls} band #${idx + 1}: minIntervals (${b.minIntervals}) must equal previous maxIntervals (${lastMax}).`);
          }
          lastMax = b.maxIntervals;
        });
      }
    }
    return errors;
  };

  const handleValidate = () => {
    let target = draftRule;
    if (isJsonView) {
      try {
        target = JSON.parse(jsonText);
      } catch (err: any) {
        setValidationMessages({
          status: "error",
          errors: ["JSON Syntax Error: " + err.message],
        });
        return;
      }
    }
    if (!target) return;
    const errors = validateRuleContent(target);
    if (errors.length === 0) {
      setValidationMessages({ status: "success", errors: [] });
    } else {
      setValidationMessages({ status: "error", errors });
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedRuleId) return;
    setConflict409Error(null);

    let payload = draftRule;
    if (isJsonView) {
      try {
        payload = JSON.parse(jsonText);
      } catch (err: any) {
        toast.error("Cannot save invalid JSON: " + err.message);
        return;
      }
    }
    if (!payload) return;

    // Validate
    const errors = validateRuleContent(payload);
    if (errors.length > 0) {
      setValidationMessages({ status: "error", errors });
      toast.error("Validation failed. Please correct errors before saving.");
      return;
    }

    try {
      const updated = await rulesApi.update(selectedRuleId, payload);
      toast.success(`Draft ${updated.ruleSetId} saved.`);
      setIsEditing(false);
      await loadRules();
      setSelectedRuleId(updated.ruleSetId);
      setDraftRule(JSON.parse(JSON.stringify(updated)));
      setJsonText(JSON.stringify(updated, null, 2));
      setValidationMessages(null);
    } catch (err: any) {
      console.error("Save rule error:", err);
      const status = err.response?.status || err.statusCode;
      const detail = err.response?.data?.detail || err.message || "";
      if (status === 409) {
        setConflict409Error(
          "Rule-set is referenced by an approved report and cannot be edited. Only a new version can be created."
        );
      } else {
        toast.error(typeof detail === "string" ? detail : "Failed to save draft rule-set.");
      }
    }
  };

  const handleExecuteActivate = async () => {
    if (!confirmActivateId) return;
    const targetId = confirmActivateId;
    setConfirmActivateId(null);

    try {
      await rulesApi.activate(targetId);
      toast.success(`Rule-set ${targetId} is now ACTIVE.`);
      await loadRules();
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || err.message || "Failed to activate.";
      toast.error(typeof detail === "string" ? detail : "Activation failed.");
    }
  };

  if (user?.role !== "ADMIN") {
    return (
      <div className="pt-16 max-w-2xl mx-auto text-center px-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-10 shadow-2xl space-y-4">
          <div className="text-4xl">🛡️</div>
          <h1 className="text-2xl font-light text-zinc-100">Access Denied</h1>
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-500">
            Access Restricted
          </div>
          <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
            You don't have permission to perform this action. You do not have administrative privileges to configure regulatory rule-sets.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pt-6 max-w-7xl mx-auto space-y-6 px-4">
        <SkeletonLoader count={6} />
      </div>
    );
  }

  const activeMpeBands: MpeBand[] = (draftRule?.mpeRules?.[selectedClassTab] as MpeBand[]) || [];

  return (
    <div className="pt-6 max-w-7xl mx-auto space-y-6 px-4 pb-16">
      {/* Dismissible API Error Banner */}
      {apiError && (
        <ErrorBanner
          message={apiError}
          onDismiss={() => setApiError(null)}
          title="Rule Administration Notice"
        />
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-zinc-100 tracking-tight">Rule Administration</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            Manage OIML R-76 regulatory rule configurations, verification tolerances, and version locking.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateDraft}
          disabled={isUnreachable}
          className="bg-zinc-100 hover:bg-white text-zinc-950 px-5 py-2.5 rounded-full text-sm font-medium transition-all shadow-sm hover:shadow-md inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer disabled:opacity-50"
        >
          <span>+</span> Create New Draft
        </button>
      </div>

      {/* Empty State Call to Action when 0 rules exist */}
      {rules.length === 0 && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-10 text-center space-y-4">
          <div className="text-zinc-400 text-sm font-medium">No regulatory rule-sets configured.</div>
          <div>
            <button
              type="button"
              onClick={handleCreateDraft}
              disabled={isUnreachable}
              className="bg-zinc-100 hover:bg-white text-zinc-950 px-5 py-2.5 rounded-full text-xs font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              + Create Initial Rule-Set
            </button>
          </div>
        </div>
      )}

      {/* Red 409 Banner */}
      {conflict409Error && (
        <div className="p-4 bg-rose-950/60 border border-rose-500/60 rounded-2xl text-rose-300 flex items-start justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-3">
            <span className="text-rose-400 text-xl font-bold">⚠️</span>
            <div>
              <div className="font-semibold text-rose-200">409 Conflict: Rule-Set Locked</div>
              <div className="text-sm mt-0.5">{conflict409Error}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConflict409Error(null)}
            className="text-rose-400 hover:text-rose-200 text-xs cursor-pointer font-bold px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Versions Table List (Left) and Detail/Editor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: List of Rule Sets */}
        <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
          <div className="px-5 py-3.5 border-b border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Rule-Set Versions
            </h2>
            <span className="text-xs text-zinc-500">{rules.length} total</span>
          </div>

          {loading ? (
            <div className="p-6 text-center text-sm text-zinc-500">Loading rule versions...</div>
          ) : (
            <div className="divide-y divide-zinc-800/60 overflow-y-auto max-h-[700px]">
              {rules.map((r) => {
                const isSelected = selectedRuleId === r.ruleSetId;
                const status = r.isActive ? "ACTIVE" : r.status || (r.isLocked ? "LOCKED" : "DRAFT");

                return (
                  <div
                    key={r.ruleSetId}
                    onClick={() => handleSelectRule(r)}
                    className={`p-4 transition-all cursor-pointer flex flex-col gap-2 ${
                      isSelected
                        ? "bg-zinc-800/60 border-l-4 border-l-sky-500"
                        : "hover:bg-zinc-800/20"
                    } ${r.isActive ? "bg-emerald-950/10" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-zinc-200">
                          {r.ruleSetId}
                        </span>
                        {r.isLocked && (
                          <span
                            className="text-zinc-400 text-xs inline-flex items-center gap-0.5"
                            title="Locked: referenced by an approved or submitted report"
                          >
                            🔒 <span className="text-[10px] text-zinc-500 font-medium">Locked</span>
                          </span>
                        )}
                      </div>

                      {/* Status Badge */}
                      {r.isActive ? (
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-500/30">
                          Active
                        </span>
                      ) : status === "ARCHIVED" ? (
                        <span className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                          Archived
                        </span>
                      ) : (
                        <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider border border-amber-500/30">
                          Draft
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-zinc-400 truncate">{r.edition}</div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/40">
                      <span>Effective: {r.effectiveFrom || "—"}</span>
                      <span>By: {r.createdBy || "system"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: View / Edit Rule Detail */}
        <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl shadow-xl p-6 backdrop-blur-sm space-y-5">
          {draftRule ? (
            <>
              {/* Header of Detail */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-mono font-semibold text-zinc-100">
                      {draftRule.ruleSetId}
                    </h2>
                    {draftRule.isActive && (
                      <span className="bg-emerald-500/20 text-emerald-400 text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-emerald-500/30">
                        Active
                      </span>
                    )}
                    {draftRule.isLocked && (
                      <span className="text-xs text-zinc-400 flex items-center gap-1 bg-zinc-800/80 px-2 py-0.5 rounded-full">
                        🔒 Locked
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{draftRule.edition}</p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  {!isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleStartEdit}
                        disabled={draftRule.isLocked || draftRule.isActive}
                        className={`text-xs px-3.5 py-2 rounded-xl border font-medium transition-colors ${
                          draftRule.isLocked || draftRule.isActive
                            ? "border-zinc-800 bg-zinc-900/40 text-zinc-600 cursor-not-allowed"
                            : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer"
                        }`}
                        title={
                          draftRule.isLocked
                            ? "Rule-set is locked by approved reports and cannot be edited"
                            : draftRule.isActive
                            ? "Active rule-set cannot be edited directly; create a draft"
                            : "Edit this draft rule-set"
                        }
                      >
                        {draftRule.isLocked ? "🔒 Locked (No Edit)" : "Edit Draft"}
                      </button>

                      {!draftRule.isActive && (
                        <button
                          type="button"
                          onClick={() => setConfirmActivateId(draftRule.ruleSetId)}
                          className="text-xs px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-medium cursor-pointer transition-colors"
                        >
                          Activate
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handleToggleJsonView}
                        className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-mono cursor-pointer"
                      >
                        {isJsonView ? "Structured Editor" : "JSON View"}
                      </button>
                      <button
                        type="button"
                        onClick={handleValidate}
                        className="text-xs px-3 py-1.5 rounded-lg border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 font-medium cursor-pointer"
                      >
                        Validate
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="text-xs px-3 py-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="text-xs px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-zinc-950 font-semibold cursor-pointer transition-all shadow-md"
                      >
                        Save Draft
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Validation Status Banner */}
              {validationMessages && (
                <div
                  className={`p-3.5 rounded-xl border text-xs ${
                    validationMessages.status === "success"
                      ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                      : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                  }`}
                >
                  {validationMessages.status === "success" ? (
                    <div className="font-medium flex items-center gap-2">
                      <span>✓</span> Rule-set satisfies all OIML R-76 schema and continuity requirements.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="font-semibold text-rose-200">Validation Errors:</div>
                      <ul className="list-disc list-inside space-y-0.5">
                        {validationMessages.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Editor Content Area */}
              {isJsonView ? (
                /* Raw JSON Editor */
                <div className="space-y-2">
                  <div className="text-xs text-zinc-400 flex items-center justify-between">
                    <span>Direct Rule-Set JSON Configuration:</span>
                    {isEditing ? (
                      <span className="text-amber-400">Editing enabled</span>
                    ) : (
                      <span className="text-zinc-500">Read-only formatted JSON</span>
                    )}
                  </div>
                  <textarea
                    value={jsonText}
                    readOnly={!isEditing}
                    onChange={(e) => setJsonText(e.target.value)}
                    rows={20}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-300 focus:outline-none focus:border-sky-500 transition-colors"
                    spellCheck={false}
                  />
                </div>
              ) : (
                /* Structured MPE Editor */
                <div className="space-y-5">
                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Standard
                      </label>
                      <input
                        type="text"
                        disabled={!isEditing}
                        value={draftRule.standard || ""}
                        onChange={(e) => {
                          const updated = { ...draftRule, standard: e.target.value };
                          setDraftRule(updated);
                          setJsonText(JSON.stringify(updated, null, 2));
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-sky-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Effective Date
                      </label>
                      <input
                        type="date"
                        disabled={!isEditing}
                        value={draftRule.effectiveFrom || ""}
                        onChange={(e) => {
                          const updated = { ...draftRule, effectiveFrom: e.target.value };
                          setDraftRule(updated);
                          setJsonText(JSON.stringify(updated, null, 2));
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-sky-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Warning Ratio
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.1"
                        max="1.0"
                        disabled={!isEditing}
                        value={draftRule.warningRatio ?? 0.9}
                        onChange={(e) => {
                          const updated = { ...draftRule, warningRatio: parseFloat(e.target.value) || 0.9 };
                          setDraftRule(updated);
                          setJsonText(JSON.stringify(updated, null, 2));
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-sky-500 disabled:opacity-60"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                        Created By
                      </label>
                      <div className="bg-zinc-950 border border-zinc-800/60 rounded-lg px-2.5 py-1.5 text-zinc-400 font-mono">
                        {draftRule.createdBy || "system"}
                      </div>
                    </div>
                  </div>

                  {/* Accuracy Class Tabs */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                          MPE Tolerance Table:
                        </span>
                        <div className="flex items-center gap-1">
                          {ACCURACY_CLASSES.map((cls) => (
                            <button
                              key={cls}
                              type="button"
                              onClick={() => setSelectedClassTab(cls)}
                              className={`px-3 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                                selectedClassTab === cls
                                  ? "bg-sky-500 text-zinc-950 font-bold"
                                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                              }`}
                            >
                              Class {cls}
                            </button>
                          ))}
                        </div>
                      </div>

                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => handleAddBand(selectedClassTab)}
                          className="text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
                        >
                          + Add Band
                        </button>
                      )}
                    </div>

                    {/* MPE Table for the selected class */}
                    <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-zinc-800/60 text-zinc-400 border-b border-zinc-800 text-[10px] uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-2.5">Band</th>
                            <th className="px-4 py-2.5">Min Intervals ($m/e$)</th>
                            <th className="px-4 py-2.5">Max Intervals ($m/e$)</th>
                            <th className="px-4 py-2.5">
                              Tolerance (MPE in $e$){" "}
                              <span
                                className="inline-block ml-1 px-1.5 py-0.2 rounded font-bold text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                title="D3 threshold convention"
                              >
                                D3
                              </span>
                            </th>
                            {isEditing && <th className="px-4 py-2.5 text-right">Actions</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                          {activeMpeBands.length === 0 ? (
                            <tr>
                              <td
                                colSpan={isEditing ? 5 : 4}
                                className="px-4 py-6 text-center text-zinc-500 italic"
                              >
                                No MPE bands configured for Class {selectedClassTab}.
                              </td>
                            </tr>
                          ) : (
                            activeMpeBands.map((band, idx) => (
                              <tr key={idx} className="hover:bg-zinc-800/30">
                                <td className="px-4 py-2.5 font-mono text-zinc-500">#{idx + 1}</td>
                                <td className="px-4 py-2.5">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={band.minIntervals}
                                      onChange={(e) =>
                                        handleUpdateBand(
                                          selectedClassTab,
                                          idx,
                                          "minIntervals",
                                          e.target.value
                                        )
                                      }
                                      className="w-24 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                                    />
                                  ) : (
                                    <span className="font-mono">{band.minIntervals}</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={band.maxIntervals}
                                      onChange={(e) =>
                                        handleUpdateBand(
                                          selectedClassTab,
                                          idx,
                                          "maxIntervals",
                                          e.target.value
                                        )
                                      }
                                      className="w-28 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                                    />
                                  ) : (
                                    <span className="font-mono">{band.maxIntervals}</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 font-medium">
                                  {isEditing ? (
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        step="0.5"
                                        value={band.mpeInE}
                                        onChange={(e) =>
                                          handleUpdateBand(
                                            selectedClassTab,
                                            idx,
                                            "mpeInE",
                                            e.target.value
                                          )
                                        }
                                        className="w-20 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                                      />
                                      <span className="text-zinc-500 text-xs">e</span>
                                      <span
                                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                        title="D3 threshold convention"
                                      >
                                        D3
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 font-mono">
                                      <span>±{band.mpeInE} e</span>
                                      <span
                                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40"
                                        title="D3 threshold convention"
                                      >
                                        D3
                                      </span>
                                    </div>
                                  )}
                                </td>
                                {isEditing && (
                                  <td className="px-4 py-2.5 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveBand(selectedClassTab, idx)}
                                      className="text-rose-400 hover:text-rose-300 text-xs cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Test Rules Summary Section */}
                  <div className="pt-2 space-y-2">
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      Evaluation Criteria (Test Rules)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                      <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 space-y-1">
                        <div className="text-sky-400 font-medium">Weighing Performance</div>
                        <div className="text-zinc-400 text-[11px]">
                          Criterion: {draftRule.testRules?.weighingPerformance?.criterion || "abs(observedError) <= mpe"}
                        </div>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 space-y-1">
                        <div className="text-sky-400 font-medium">Eccentricity</div>
                        <div className="text-zinc-400 text-[11px]">
                          Criterion: {draftRule.testRules?.eccentricity?.criterion || "abs(error_at_each_position) <= mpe"}
                        </div>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 space-y-1">
                        <div className="text-sky-400 font-medium">Repeatability</div>
                        <div className="text-zinc-400 text-[11px]">
                          Criterion: {draftRule.testRules?.repeatability?.criterion || "max_reading - min_reading <= mpe"}
                        </div>
                      </div>
                      <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3 space-y-1">
                        <div className="text-sky-400 font-medium">Discrimination</div>
                        <div className="text-zinc-400 text-[11px]">
                          Criterion: {draftRule.testRules?.discrimination?.criterion || "delta_indication >= 1.0 * d"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-24 text-center text-zinc-500 text-sm">
              Select a rule-set version on the left to inspect or edit.
            </div>
          )}
        </div>
      </div>

      {/* Activation Confirmation Modal */}
      {confirmActivateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <h3 className="text-lg font-light text-zinc-100">Activate Rule-Set</h3>
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed">
              New reports will use this version. Existing submitted/approved reports keep their locked version.
            </p>
            <div className="text-xs text-zinc-500 font-mono">
              Activating: <strong className="text-zinc-300">{confirmActivateId}</strong>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setConfirmActivateId(null)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteActivate}
                className="px-4 py-2 text-xs bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold rounded-xl cursor-pointer transition-all shadow-md"
              >
                Confirm Activation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
