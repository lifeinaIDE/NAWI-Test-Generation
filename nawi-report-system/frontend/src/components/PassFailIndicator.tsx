import React from "react";
import type { CalculationResult } from "../types";
import { D3 } from "../constants/disclaimers";

interface PassFailIndicatorProps {
  result: CalculationResult | null;
  loading?: boolean;
  error?: string | null;
  ruleSetId?: string;
  customMessages?: { level: "ERROR" | "WARNING" | "INFO"; message: string }[];
}

export default function PassFailIndicator({
  result,
  loading = false,
  error = null,
  ruleSetId,
  customMessages = [],
}: PassFailIndicatorProps) {
  const status = result?.result || (loading ? "CALCULATING" : "INCOMPLETE");
  const effectiveRuleSet = result?.ruleSetVersion || ruleSetId || "OIML-R76-PROTOTYPE-V1";

  // Color theme mapping
  const badgeColors: Record<string, string> = {
    PASS: "bg-emerald-500/10 text-emerald-400 text-green-400 border-emerald-500/25 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
    WARNING: "bg-amber-500/10 text-amber-400 border-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
    FAIL: "bg-rose-500/10 text-rose-400 text-red-400 border-rose-500/25 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
    CALCULATING: "bg-sky-500/10 text-sky-400 border-sky-500/25 animate-pulse",
    INCOMPLETE: "bg-zinc-800/80 text-zinc-400 border-zinc-700/80",
  };

  const badgeClass = badgeColors[status] || badgeColors.INCOMPLETE;

  // Extract MPE directly from backend fields without rounding/arithmetic
  const mpeValue = result?.maxPermissibleError ?? result?.mpe ?? null;

  return (
    <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4 space-y-3">
      {/* Header bar: Status badge, server tag, rule-set version, MPE + D3 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold tracking-wider uppercase border transition-all ${badgeClass}`}
            data-testid="pass-fail-badge"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg
                  className="animate-spin h-3 w-3 text-sky-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Calculating
              </span>
            ) : (
              status
            )}
          </span>

          {/* "Calculated by server" provenance tag */}
          <span
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-400"
            data-testid="server-tag"
          >
            <svg
              className="w-3 h-3 text-sky-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
            Calculated by server
          </span>
        </div>

        {/* Rule-set version & MPE metadata */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span
            className="text-zinc-500 font-mono text-[11px] bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800"
            data-testid="ruleset-tag"
          >
            {effectiveRuleSet}
          </span>

          {mpeValue !== null && mpeValue !== undefined && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-[11px]"
              data-testid="mpe-tag"
            >
              MPE: ±{mpeValue}
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-sans font-semibold text-amber-400/90 bg-amber-500/10 px-1 rounded border border-amber-500/20 cursor-help"
                title={`D3: ${D3}`}
                data-testid="d3-tag"
              >
                D3
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Criterion string rendered directly from backend */}
      {result?.criterion && (
        <div
          className="text-xs text-zinc-400 flex items-center gap-1.5 font-mono bg-zinc-900/40 px-3 py-1.5 rounded border border-zinc-900"
          data-testid="criterion-text"
        >
          <span className="text-zinc-500 uppercase tracking-wider text-[10px] font-sans font-medium">
            Limit Checked:
          </span>
          <span>{result.criterion}</span>
        </div>
      )}

      {/* Failure reason if FAIL */}
      {result?.result === "FAIL" && result?.failureReason && (
        <div
          className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-lg text-xs text-rose-300 space-y-1"
          data-testid="failure-reason-box"
        >
          <div className="font-semibold text-rose-400 flex items-center gap-1.5">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Compliance Non-conformity Detected
          </div>
          <div>{result.failureReason}</div>
        </div>
      )}

      {/* Server messages shown inline */}
      {result?.messages && result.messages.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {result.messages.map((msg, i) => {
            const isWarning =
              msg.toLowerCase().includes("warning") ||
              msg.toLowerCase().includes("90%") ||
              result.result === "WARNING";
            const isError =
              msg.toLowerCase().includes("exceeds") ||
              msg.toLowerCase().includes("error") ||
              msg.toLowerCase().includes("missing");

            const colorClass = isError
              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
              : isWarning
              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
              : "bg-sky-500/10 text-sky-400 border-sky-500/20";

            return (
              <div
                key={i}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center gap-2 ${colorClass}`}
                data-testid="server-message"
              >
                <span>{msg}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Custom messages (e.g., testLoad > maxCapacity) */}
      {customMessages.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {customMessages.map((cm, i) => (
            <div
              key={i}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center gap-2 ${
                cm.level === "ERROR"
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : cm.level === "WARNING"
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  : "bg-sky-500/10 text-sky-400 border-sky-500/20"
              }`}
              data-testid="custom-message"
            >
              <span>{cm.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Network or calculation error */}
      {error && (
        <div className="text-xs px-3 py-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg">
          Calculation service warning: {error}
        </div>
      )}
    </div>
  );
}
