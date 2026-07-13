import { useMemo, useState } from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";
import type { BubbleTheme } from "@/types";

interface ActivityDay {
  date: string;
  count: number;
}

export function CalendarHeatmapWidget({
  dailyActivity,
  theme,
}: {
  dailyActivity: ActivityDay[];
  theme: BubbleTheme;
}) {
  // Filter out which years are available in the data
  const years = useMemo(() => {
    const yrs = new Set<string>();
    for (const d of dailyActivity) {
      const yr = d.date.split("-")[0];
      if (yr) yrs.add(yr);
    }
    return Array.from(yrs).sort((a, b) => b.localeCompare(a));
  }, [dailyActivity]);

  const [selectedYear, setSelectedYear] = useState<string>("last365");

  const filteredData = useMemo(() => {
    if (selectedYear === "last365") {
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setDate(today.getDate() - 365);
      return dailyActivity.filter((d) => new Date(d.date) >= oneYearAgo);
    }
    return dailyActivity.filter((d) => d.date.startsWith(selectedYear));
  }, [dailyActivity, selectedYear]);

  const maxCount = useMemo(() => {
    const counts = filteredData.map((d) => d.count);
    return counts.length > 0 ? Math.max(...counts, 1) : 1;
  }, [filteredData]);

  // Determine starting and ending dates for rendering
  const dateRange = useMemo(() => {
    if (filteredData.length === 0) {
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setDate(today.getDate() - 365);
      return { start: oneYearAgo, end: today };
    }
    
    if (selectedYear === "last365") {
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setDate(today.getDate() - 365);
      return { start: oneYearAgo, end: today };
    }
    
    // For a specific year, display Jan 1 to Dec 31
    const yearNum = Number(selectedYear);
    return {
      start: new Date(yearNum, 0, 1),
      end: new Date(yearNum, 11, 31),
    };
  }, [filteredData, selectedYear]);

  // CSS variables for matching the bubble color theme dynamically
  const inlineStyles = useMemo(() => {
    const from = theme.meFrom || "#5B51D8";
    const to = theme.meTo || "#E1306C";
    
    return {
      "--color-empty": "#e5e7eb", // gray-200
      "--color-scale-1": `${from}30`, // ~19% opacity
      "--color-scale-2": `${from}75`, // ~46% opacity
      "--color-scale-3": `${from}c8`, // ~78% opacity
      "--color-scale-4": to,          // 100% of 'to' color
    } as React.CSSProperties;
  }, [theme]);

  const totalMessagesInPeriod = useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + curr.count, 0);
  }, [filteredData]);

  // Scale levels
  const scaleStep = maxCount / 4;

  return (
    <div className="relative rounded-2xl bg-neutral-50 p-4 border border-neutral-100" style={inlineStyles}>
      <style>{`
        .theme-matched-heatmap .react-calendar-heatmap .color-empty { fill: var(--color-empty); }
        .theme-matched-heatmap .react-calendar-heatmap .color-scale-1 { fill: var(--color-scale-1); }
        .theme-matched-heatmap .react-calendar-heatmap .color-scale-2 { fill: var(--color-scale-2); }
        .theme-matched-heatmap .react-calendar-heatmap .color-scale-3 { fill: var(--color-scale-3); }
        .theme-matched-heatmap .react-calendar-heatmap .color-scale-4 { fill: var(--color-scale-4); }
        .theme-matched-heatmap .react-calendar-heatmap rect {
          rx: 2px;
          ry: 2px;
          transition: fill 0.15s ease;
        }
        .theme-matched-heatmap .react-calendar-heatmap rect:hover {
          stroke: #374151;
          stroke-width: 1px;
        }
      `}</style>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">Chat Heatmap</h4>
          <p className="text-[11px] text-neutral-400">
            {totalMessagesInPeriod.toLocaleString()} messages in selected period
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedYear("last365")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
              selectedYear === "last365"
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-white text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 border border-neutral-200"
            }`}
          >
            Last Year
          </button>
          {years.map((yr) => (
            <button
              key={yr}
              onClick={() => setSelectedYear(yr)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                selectedYear === yr
                  ? "bg-neutral-900 text-white shadow-sm"
                  : "bg-white text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 border border-neutral-200"
              }`}
            >
              {yr}
            </button>
          ))}
        </div>
      </div>

      <div className="theme-matched-heatmap select-none overflow-x-auto scrollbar-none py-1">
        <div style={{ minWidth: "560px" }}>
          <CalendarHeatmap
            startDate={dateRange.start}
            endDate={dateRange.end}
            values={filteredData}
            classForValue={(value) => {
              if (!value || value.count === 0) {
                return "color-empty";
              }
              const level = Math.min(4, Math.ceil(value.count / scaleStep));
              return `color-scale-${level}`;
            }}
            titleForValue={(value) => {
              if (!value) return "No messages";
              const formattedDate = new Date(value.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              return `${formattedDate}: ${value.count.toLocaleString()} message${value.count === 1 ? "" : "s"}`;
            }}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-neutral-400">
        <div>
          Active days: {filteredData.filter((d) => d.count > 0).length} days
        </div>
        <div className="flex items-center gap-1">
          <span>Less</span>
          <div className="h-2.5 w-2.5 rounded bg-zinc-200" />
          <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: `${theme.meFrom}30` }} />
          <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: `${theme.meFrom}75` }} />
          <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: `${theme.meFrom}c8` }} />
          <div className="h-2.5 w-2.5 rounded" style={{ backgroundColor: theme.meTo }} />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
