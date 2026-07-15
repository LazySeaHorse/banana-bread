import { useMemo, useState, useId } from "react";
import type { BubbleTheme } from "@/types";

export function RadialActivityClock({
  hourHistogram,
  theme,
}: {
  hourHistogram: number[];
  theme: BubbleTheme;
}) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const uniqueId = useId();

  const radialGradId = `radialGrad-${uniqueId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const glowGradId = `glowGrad-${uniqueId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const maxVal = useMemo(() => {
    return Math.max(...hourHistogram, 1);
  }, [hourHistogram]);

  const totalHourMsgs = useMemo(() => {
    return hourHistogram.reduce((a, b) => a + b, 0);
  }, [hourHistogram]);

  // SVG dimensions
  const size = 220;
  const center = size / 2;
  const maxRadius = 80;
  const innerRadius = 24;

  const points = useMemo(() => {
    return hourHistogram.map((count, h) => {
      // 12 AM is at the top, which is -90 degrees
      const angleDeg = h * 15 - 90;
      const angleRad = (angleDeg * Math.PI) / 180;
      const length = innerRadius + (count / maxVal) * (maxRadius - innerRadius);

      return {
        hour: h,
        count,
        xInner: center + innerRadius * Math.cos(angleRad),
        yInner: center + innerRadius * Math.sin(angleRad),
        xOuter: center + length * Math.cos(angleRad),
        yOuter: center + length * Math.sin(angleRad),
        xMax: center + maxRadius * Math.cos(angleRad),
        yMax: center + maxRadius * Math.sin(angleRad),
        angleDeg,
      };
    });
  }, [hourHistogram, maxVal, center]);

  // Polygon path string connecting all outer points
  const polygonPath = useMemo(() => {
    if (points.length === 0) return "";
    return (
      points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.xOuter} ${p.yOuter}`).join(" ") + " Z"
    );
  }, [points]);

  const formatHourLabel = (h: number) => {
    if (h === 0) return "12 AM";
    if (h === 12) return "12 PM";
    return h > 12 ? `${h - 12} PM` : `${h} AM`;
  };

  const activeSpoke = hoveredHour !== null ? points[hoveredHour] : null;

  return (
    <div className="relative rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
      <div className="mb-2">
        <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
          24-Hour Activity Clock
        </h4>
        <p className="text-[11px] text-neutral-400">Radial view of daily routine</p>
      </div>

      <div className="relative flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full overflow-visible select-none"
        >
          <defs>
            <linearGradient id={radialGradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.meFrom} stopOpacity={0.65} />
              <stop offset="100%" stopColor={theme.meTo} stopOpacity={0.15} />
            </linearGradient>
            <radialGradient id={glowGradId}>
              <stop offset="70%" stopColor="#ffffff" stopOpacity={1} />
              <stop offset="100%" stopColor="#f4f4f5" stopOpacity={0.9} />
            </radialGradient>
          </defs>

          {/* Background Grid Circles */}
          {[0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
            const r = innerRadius + ratio * (maxRadius - innerRadius);
            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke="#e5e5e5"
                strokeWidth={1}
                strokeDasharray="2,3"
              />
            );
          })}

          {/* Background clock markings: every 3 hours */}
          {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => {
            const angleRad = ((h * 15 - 90) * Math.PI) / 180;
            const x1 = center + innerRadius * Math.cos(angleRad);
            const y1 = center + innerRadius * Math.sin(angleRad);
            const x2 = center + maxRadius * Math.cos(angleRad);
            const y2 = center + maxRadius * Math.sin(angleRad);
            return (
              <line
                key={h}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="#e4e4e7"
                strokeWidth={1}
                strokeOpacity={0.6}
              />
            );
          })}

          {/* Filled polygon for entire activity profile */}
          <path
            d={polygonPath}
            fill={`url(#${radialGradId})`}
            stroke={theme.meFrom}
            strokeWidth={1.5}
            strokeOpacity={0.8}
            className="transition-all duration-300"
          />

          {/* Activity Spokes */}
          {points.map((p) => {
            const isHovered = hoveredHour === p.hour;
            return (
              <g key={p.hour}>
                {/* Visual Spoke Line */}
                <line
                  x1={p.xInner}
                  y1={p.yInner}
                  x2={p.xOuter}
                  y2={p.yOuter}
                  stroke={isHovered ? theme.meTo : theme.meFrom}
                  strokeWidth={isHovered ? 4.5 : 2.5}
                  strokeLinecap="round"
                  className="transition-all duration-150 pointer-events-none"
                  opacity={hoveredHour === null ? 0.9 : isHovered ? 1 : 0.4}
                />

                {/* Invisible larger hover area spoke */}
                <line
                  x1={p.xInner}
                  y1={p.yInner}
                  x2={p.xMax}
                  y2={p.yMax}
                  stroke="transparent"
                  strokeWidth={10}
                  strokeLinecap="round"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredHour(p.hour)}
                  onMouseLeave={() => setHoveredHour(null)}
                />
              </g>
            );
          })}

          {/* Central Watch Face Circle */}
          <circle
            cx={center}
            cy={center}
            r={innerRadius - 1}
            fill={`url(#${glowGradId})`}
            stroke="#e4e4e7"
            strokeWidth={1.5}
            className="shadow-sm"
          />

          {/* Text Clock Labels */}
          <text
            x={center}
            y={center - maxRadius - 6}
            textAnchor="middle"
            className="text-[9px] font-semibold fill-neutral-400"
          >
            12
          </text>
          <text
            x={center + maxRadius + 10}
            y={center + 3}
            textAnchor="middle"
            className="text-[9px] font-semibold fill-neutral-400"
          >
            6
          </text>
          <text
            x={center}
            y={center + maxRadius + 12}
            textAnchor="middle"
            className="text-[9px] font-semibold fill-neutral-400"
          >
            12
          </text>
          <text
            x={center - maxRadius - 10}
            y={center + 3}
            textAnchor="middle"
            className="text-[9px] font-semibold fill-neutral-400"
          >
            6
          </text>
        </svg>

        {/* Dynamic Central Information Overlay */}
        <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
          {activeSpoke ? (
            <>
              <span className="text-[10px] font-bold text-neutral-800 leading-none">
                {formatHourLabel(activeSpoke.hour)}
              </span>
              <span className="text-[9px] font-medium text-neutral-500 mt-0.5 leading-none">
                {activeSpoke.count.toLocaleString()} msg
              </span>
            </>
          ) : (
            <>
              <span className="text-[8px] font-semibold uppercase tracking-wider text-neutral-400 leading-none">
                Routine
              </span>
              <span className="text-[9px] font-bold text-neutral-600 mt-0.5 leading-none">
                {totalHourMsgs.toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend details */}
      <div className="mt-2 flex justify-between text-[9px] text-neutral-400">
        <span>Night (12am-6am)</span>
        <span>Work (9am-5pm)</span>
      </div>
    </div>
  );
}
