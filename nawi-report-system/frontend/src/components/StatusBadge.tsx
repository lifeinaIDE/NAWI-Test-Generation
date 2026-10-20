import React from "react";

export type ReportStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "SUBMITTED_FOR_REVIEW"
  | "QUERY_RAISED"
  | "APPROVED"
  | "REJECTED";

interface StatusBadgeProps {
  status: ReportStatus | string;
  size?: "sm" | "md";
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  DRAFT: {
    label: "Draft",
    bg: "bg-zinc-800/80 border-zinc-700/60",
    text: "text-zinc-300",
    dot: "bg-zinc-400",
  },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "bg-sky-950/40 border-sky-800/50",
    text: "text-sky-300",
    dot: "bg-sky-400 animate-pulse",
  },
  SUBMITTED_FOR_REVIEW: {
    label: "Awaiting Review",
    bg: "bg-amber-950/40 border-amber-800/50",
    text: "text-amber-300",
    dot: "bg-amber-400",
  },
  QUERY_RAISED: {
    label: "Query Raised",
    bg: "bg-purple-950/40 border-purple-800/50",
    text: "text-purple-300",
    dot: "bg-purple-400",
  },
  APPROVED: {
    label: "Approved",
    bg: "bg-emerald-950/40 border-emerald-800/50",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
  },
  REJECTED: {
    label: "Rejected",
    bg: "bg-rose-950/40 border-rose-800/50",
    text: "text-rose-300",
    dot: "bg-rose-400",
  },
};

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status || "Unknown",
    bg: "bg-zinc-800 border-zinc-700",
    text: "text-zinc-400",
    dot: "bg-zinc-500",
  };

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full tracking-wide ${config.bg} ${config.text} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
