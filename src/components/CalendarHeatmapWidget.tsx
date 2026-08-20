import { useMemo, useState } from "react";
import type { BubbleTheme } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  // Construct the calendar grid aligned by columns (weeks)
  const gridData = useMemo(() => {
    let start: Date;
    let end: Date;

    if (selectedYear === "last365") {
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setDate(today.getDate() - 365);
      start = oneYearAgo;
      end = today;
    } else {
      const yearNum = Number(selectedYear);
      start = new Date(yearNum, 0, 1);
      end = new Date(yearNum, 11, 31);
    }

    // Align start date to the beginning of the week (Sunday = 0)
    const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    const endDayOfWeek = endDate.getDay();
    endDate.setDate(endDate.getDate() + (6 - endDayOfWeek));

    const countsMap = new Map<string, number>();
    for (const d of filteredData) {
      countsMap.set(d.date, d.count);
    }

    const days: { date: Date; dateStr: string; count: number }[] = [];
    const cur = new Date(startDate.getTime());
    while (cur <= endDate) {
      const yr = cur.getFullYear();
      const mo = String(cur.getMonth() + 1).padStart(2, "0");
      const dy = String(cur.getDate()).padStart(2, "0");
      const key = `${yr}-${mo}-${dy}`;
      days.push({
        date: new Date(cur.getTime()),
        dateStr: key,
        count: countsMap.get(key) ?? 0,
      });
      cur.setDate(cur.getDate() + 1);
    }

    const weeks: { dateStr: string; count: number; date: Date }[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return weeks;
  }, [filteredData, selectedYear]);

  const monthLabels = useMemo(() => {
    const labels: { label: string; colIndex: number }[] = [];
    let prevMonth = -1;
    gridData.forEach((week, colIdx) => {
      const firstDayOfWeek = week[0]?.date;
      if (firstDayOfWeek) {
        const curMonth = firstDayOfWeek.getMonth();
        if (curMonth !== prevMonth) {
          const label = firstDayOfWeek.toLocaleDateString("en-US", { month: "short" });
          if (labels.length === 0 || colIdx - labels[labels.length - 1].colIndex > 2) {
            labels.push({ label, colIndex: colIdx });
            prevMonth = curMonth;
          }
        }
      }
    });
    return labels;
  }, [gridData]);

  const themeStyles = useMemo(() => {
    const from = theme.meFrom || "#5B51D8";
    const to = theme.meTo || "#E1306C";
    return {
      "--color-empty": "#e5e7eb",
      "--color-scale-1": `${from}30`,
      "--color-scale-2": `${from}75`,
      "--color-scale-3": `${from}c8`,
      "--color-scale-4": to,
    } as React.CSSProperties;
  }, [theme]);

  const totalMessagesInPeriod = useMemo(() => {
    return filteredData.reduce((acc, curr) => acc + curr.count, 0);
  }, [filteredData]);

  const scaleStep = maxCount / 4;

  const getScaleLevel = (count: number) => {
    if (count === 0) return 0;
    return Math.min(4, Math.ceil(count / scaleStep));
  };

  const getBgStyle = (level: number) => {
    if (level === 0) return "var(--color-empty)";
    return `var(--color-scale-${level})`;
  };

  const cellSize = 10;
  const gap = 2;
  const paddingLeft = 30;
  const paddingTop = 16;

  return (
    <Card
      className="relative rounded-2xl bg-neutral-50 p-4 border border-neutral-100 select-none shadow-none"
      style={themeStyles}
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">Chat Heatmap</h4>
          <p className="text-[11px] text-neutral-400">
            {totalMessagesInPeriod.toLocaleString()} messages in selected period
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          <Button
            variant={selectedYear === "last365" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedYear("last365")}
            className="h-7 rounded-lg px-2.5 text-xs font-medium"
          >
            Last Year
          </Button>
          {years.map((yr) => (
            <Button
              key={yr}
              variant={selectedYear === yr ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedYear(yr)}
              className="h-7 rounded-lg px-2.5 text-xs font-medium"
            >
              {yr}
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto scrollbar-none py-1">
        <div style={{ minWidth: "640px" }}>
          <svg
            width={gridData.length * (cellSize + gap) + paddingLeft}
            height={7 * (cellSize + gap) + paddingTop}
            className="overflow-visible"
          >
            {/* Weekday labels */}
            <text x="0" y={paddingTop + cellSize - 1} className="text-[8px] fill-neutral-400 font-medium">Sun</text>
            <text x="0" y={paddingTop + 3 * (cellSize + gap) + cellSize - 1} className="text-[8px] fill-neutral-400 font-medium">Wed</text>
            <text x="0" y={paddingTop + 5 * (cellSize + gap) + cellSize - 1} className="text-[8px] fill-neutral-400 font-medium">Fri</text>

            {/* Month labels */}
            {monthLabels.map((lbl, idx) => (
              <text
                key={idx}
                x={lbl.colIndex * (cellSize + gap) + paddingLeft}
                y="10"
                className="text-[9px] fill-neutral-400 font-semibold"
              >
                {lbl.label}
              </text>
            ))}

            {/* Heatmap Grid */}
            {gridData.map((week, colIdx) => (
              <g key={colIdx} transform={`translate(${colIdx * (cellSize + gap) + paddingLeft}, ${paddingTop})`}>
                {week.map((day, rowIdx) => {
                  const level = getScaleLevel(day.count);
                  const bg = getBgStyle(level);
                  
                  const tooltipText = `${day.date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}: ${day.count.toLocaleString()} message${day.count === 1 ? "" : "s"}`;

                  return (
                    <rect
                      key={rowIdx}
                      x="0"
                      y={rowIdx * (cellSize + gap)}
                      width={cellSize}
                      height={cellSize}
                      rx="1.5"
                      ry="1.5"
                      fill={bg}
                      className="cursor-pointer transition-colors duration-150 hover:stroke-zinc-600 hover:stroke-[1px]"
                    >
                      <title>{tooltipText}</title>
                    </rect>
                  );
                })}
              </g>
            ))}
          </svg>
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
    </Card>
  );
}
