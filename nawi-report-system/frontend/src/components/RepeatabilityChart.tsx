import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface RepeatabilityChartProps {
  readings: (number | string)[];
  maxVal?: number | null;
  minVal?: number | null;
}

export default function RepeatabilityChart({
  readings,
  maxVal = null,
  minVal = null,
}: RepeatabilityChartProps) {
  const chartData = readings
    .map((r, i) => {
      const val = typeof r === "number" ? r : parseFloat(String(r));
      return {
        rep: `Rep ${i + 1}`,
        reading: isNaN(val) ? null : val,
      };
    })
    .filter((d) => d.reading !== null);

  if (chartData.length < 2) {
    return (
      <div className="h-44 flex flex-col items-center justify-center bg-zinc-950/40 border border-dashed border-zinc-800 rounded-xl text-zinc-600 text-xs p-4 text-center">
        <span>Enter at least 2 readings to generate the repeatability curve.</span>
      </div>
    );
  }

  // Calculate chart Y domain boundaries
  const values = chartData.map((d) => d.reading as number);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const padding = (dataMax - dataMin) * 0.2 || 0.5;
  const yDomain = [dataMin - padding, dataMax + padding];

  return (
    <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-zinc-400">Repeatability Dispersion Curve</span>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          {maxVal !== null && maxVal !== undefined && (
            <span className="text-rose-400">Max: {maxVal}</span>
          )}
          {minVal !== null && minVal !== undefined && (
            <span className="text-sky-400">Min: {minVal}</span>
          )}
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="rep"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
            />
            <YAxis
              domain={yDomain}
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#27272a" }}
              tickFormatter={(v) => (typeof v === "number" ? v.toFixed(2) : String(v))}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#09090b",
                border: "1px solid #27272a",
                borderRadius: "8px",
                fontSize: "12px",
                color: "#f4f4f5",
              }}
              formatter={(val: any) => [val, "Reading"]}
            />
            {maxVal !== null && maxVal !== undefined && (
              <ReferenceLine
                y={maxVal}
                stroke="#f43f5e"
                strokeDasharray="4 4"
                label={{
                  value: `Max (${maxVal})`,
                  fill: "#f43f5e",
                  fontSize: 10,
                  position: "insideTopRight",
                }}
              />
            )}
            {minVal !== null && minVal !== undefined && (
              <ReferenceLine
                y={minVal}
                stroke="#38bdf8"
                strokeDasharray="4 4"
                label={{
                  value: `Min (${minVal})`,
                  fill: "#38bdf8",
                  fontSize: 10,
                  position: "insideBottomRight",
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="reading"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3, fill: "#60a5fa", stroke: "#1e3a8a", strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: "#93c5fd" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
