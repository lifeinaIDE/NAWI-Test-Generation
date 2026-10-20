import React from "react";

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-zinc-800/60 rounded-lg ${className}`} />
  );
}

export default function SkeletonLoader({ count = 3, className = "" }: SkeletonProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 space-y-3 animate-pulse">
          <div className="h-4 bg-zinc-800/80 rounded w-1/3" />
          <div className="h-8 bg-zinc-800/50 rounded w-1/2" />
          <div className="h-3 bg-zinc-800/40 rounded w-3/4" />
        </div>
      ))}
    </div>
  );
}
