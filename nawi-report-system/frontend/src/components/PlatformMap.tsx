import React from "react";

interface PositionData {
  position: string;
  error?: number | null;
  mpe?: number | null;
  result?: string;
  indication?: number | string;
  reference?: number | string;
}

interface PlatformMapProps {
  positions: PositionData[];
  worstPosition?: string;
}

export default function PlatformMap({ positions = [], worstPosition = "" }: PlatformMapProps) {
  const getPosData = (pos: string) => positions.find((p) => p.position === pos);

  const getPositionStyles = (pos: string) => {
    const data = getPosData(pos);
    const isWorst = pos === worstPosition;
    const status = data?.result;

    let fill = "#18181b"; // zinc-900
    let stroke = "#27272a"; // zinc-800
    let text = "#a1a1aa"; // zinc-400

    if (status === "PASS") {
      fill = "rgba(16, 185, 129, 0.15)";
      stroke = "rgba(16, 185, 129, 0.4)";
      text = "#34d399";
    } else if (status === "WARNING") {
      fill = "rgba(245, 158, 11, 0.15)";
      stroke = "rgba(245, 158, 11, 0.5)";
      text = "#fbbf24";
    } else if (status === "FAIL") {
      fill = "rgba(244, 63, 94, 0.15)";
      stroke = "rgba(244, 63, 94, 0.5)";
      text = "#fb7185";
    }

    if (isWorst) {
      stroke = "#f43f5e"; // highlighted worst outline
    }

    return { fill, stroke, text, isWorst, status, data };
  };

  const nodeCoords: Record<string, { cx: number; cy: number; label: string; short: string }> = {
    REAR_LEFT: { cx: 70, cy: 65, label: "Rear Left", short: "RL" },
    REAR_RIGHT: { cx: 210, cy: 65, label: "Rear Right", short: "RR" },
    CENTER: { cx: 140, cy: 125, label: "Center", short: "C" },
    FRONT_LEFT: { cx: 70, cy: 185, label: "Front Left", short: "FL" },
    FRONT_RIGHT: { cx: 210, cy: 185, label: "Front Right", short: "FR" },
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/70 border border-zinc-800/80 rounded-xl space-y-3">
      <div className="flex items-center justify-between w-full px-1">
        <span className="text-xs font-medium text-zinc-400">Platform Topography</span>
        {worstPosition && (
          <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
            Worst: {worstPosition.replace("_", " ")}
          </span>
        )}
      </div>

      <svg
        viewBox="0 0 280 250"
        className="w-full max-w-[260px] h-auto drop-shadow-md select-none"
      >
        {/* Platform Platter Outline */}
        <rect
          x="30"
          y="25"
          width="220"
          height="200"
          rx="16"
          fill="#09090b"
          stroke="#27272a"
          strokeWidth="2"
        />

        {/* Diagonal Guide Gridlines */}
        <line x1="70" y1="65" x2="210" y2="185" stroke="#18181b" strokeWidth="1.5" strokeDasharray="4 3" />
        <line x1="210" y1="65" x2="70" y2="185" stroke="#18181b" strokeWidth="1.5" strokeDasharray="4 3" />

        {/* Position Nodes */}
        {Object.entries(nodeCoords).map(([posKey, coord]) => {
          const { fill, stroke, text, isWorst, data } = getPositionStyles(posKey);

          return (
            <g key={posKey} className="transition-all duration-200">
              {/* Highlight halo for worst position */}
              {isWorst && (
                <circle
                  cx={coord.cx}
                  cy={coord.cy}
                  r="28"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                  className="animate-pulse"
                />
              )}

              {/* Main Node Circle */}
              <circle
                cx={coord.cx}
                cy={coord.cy}
                r="22"
                fill={fill}
                stroke={stroke}
                strokeWidth={isWorst ? "2.5" : "1.5"}
              />

              {/* Position Code */}
              <text
                x={coord.cx}
                y={coord.cy - 1}
                textAnchor="middle"
                dominantBaseline="central"
                fill={text}
                fontSize="11"
                fontWeight="700"
                fontFamily="sans-serif"
              >
                {coord.short}
              </text>

              {/* Error Value Tag if available */}
              {data && data.error !== undefined && data.error !== null && (
                <text
                  x={coord.cx}
                  y={coord.cy + 12}
                  textAnchor="middle"
                  fill="#71717a"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {data.error > 0 ? `+${data.error}` : `${data.error}`}
                </text>
              )}

              {/* Worst Position Tag */}
              {isWorst && (
                <g transform={`translate(${coord.cx - 24}, ${coord.cy - 34})`}>
                  <rect
                    width="48"
                    height="14"
                    rx="3"
                    fill="#e11d48"
                    stroke="#fda4af"
                    strokeWidth="0.5"
                  />
                  <text
                    x="24"
                    y="7.5"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                    fontSize="7.5"
                    fontWeight="700"
                  >
                    WORST
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      <div className="flex items-center gap-4 text-[10px] text-zinc-500 pt-1">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> PASS
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span> WARNING
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500"></span> FAIL
        </span>
      </div>
    </div>
  );
}
