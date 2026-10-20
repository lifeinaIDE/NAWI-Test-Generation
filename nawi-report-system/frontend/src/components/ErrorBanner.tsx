import React from "react";
import type { ValidationMessage } from "../types";

interface ErrorBannerProps {
  title?: string;
  message?: string;
  messages?: ValidationMessage[];
  onDismiss?: () => void;
  className?: string;
}

export default function ErrorBanner({
  title = "Error Encountered",
  message,
  messages,
  onDismiss,
  className = "",
}: ErrorBannerProps) {
  if (!message && (!messages || messages.length === 0)) {
    return null;
  }

  return (
    <div
      className={`bg-rose-950/40 border border-rose-800/60 rounded-2xl p-4 text-rose-200 ${className}`}
      role="alert"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 mt-0.5 rounded-full bg-rose-900/80 flex items-center justify-center text-rose-300 shrink-0">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-rose-100">{title}</h4>
            {message && <p className="text-xs text-rose-300/90 mt-1">{message}</p>}
            {messages && messages.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-rose-300/80 list-disc list-inside">
                {messages.map((m, idx) => (
                  <li key={idx}>
                    {m.field ? <span className="font-semibold text-rose-200">{m.field}: </span> : null}
                    {m.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-rose-400 hover:text-rose-200 transition-colors p-1"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
