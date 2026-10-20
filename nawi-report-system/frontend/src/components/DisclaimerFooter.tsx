import React from "react";
import { D1 } from "../constants/disclaimers";

interface DisclaimerFooterProps {
  className?: string;
}

export default function DisclaimerFooter({ className = "" }: DisclaimerFooterProps) {
  return (
    <footer className={`mt-auto pt-8 pb-6 border-t border-zinc-800/60 text-center ${className}`}>
      <div className="max-w-4xl mx-auto px-4">
        <p className="text-[11px] leading-relaxed text-zinc-500 font-normal">
          <span className="font-semibold text-zinc-400">Notice:</span> {D1}
        </p>
      </div>
    </footer>
  );
}
