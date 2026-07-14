import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  LineChart,
  Line,
} from "recharts";
import type { ChatStats, BubbleTheme } from "@/types";

interface ChartProps {
  stats: ChatStats;
  theme: BubbleTheme;
}

// Helper to generate colors for participants
function getParticipantColors(participants: string[], theme: BubbleTheme) {
  const baseColors = [
    theme.meFrom,
    theme.meTo,
    "#10b981", // emerald-500
    "#0ea5e9", // sky-500
    "#f59e0b", // amber-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
  ];

  const colorMap: Record<string, { stroke: string; fill: string }> = {};
  participants.forEach((name, idx) => {
    const color = baseColors[idx % baseColors.length];
    colorMap[name] = {
      stroke: color,
      fill: `${color}33`, // 20% opacity
    };
  });
  return colorMap;
}

// Custom Tooltip component for recharts
function CustomChartTooltip({ active, payload, label, suffix = "" }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-neutral-100 bg-white p-3 shadow-lg">
        <p className="mb-1 text-[11px] font-semibold text-neutral-500">{label}</p>
        <div className="flex flex-col gap-1">
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-neutral-800">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.stroke || entry.color }}
                />
                {entry.name}:
              </span>
              <span className="ml-auto font-bold text-neutral-900">
                {entry.value !== null && entry.value !== undefined
                  ? `${Number(entry.value).toLocaleString()}${suffix}`
                  : "N/A"}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export function StackedAreaVolumeChart({
  stats,
  theme,
  selectedParticipants,
}: ChartProps & { selectedParticipants: string[] }) {
  const participants = useMemo(() => {
    const all = stats.participants.map((p) => p.name);
    return all.filter((p) => selectedParticipants.includes(p));
  }, [stats, selectedParticipants]);
  const colors = useMemo(() => getParticipantColors(stats.participants.map((p) => p.name), theme), [stats, theme]);

  if (stats.monthlyTrendSplit.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-xs text-neutral-400 italic">
        No monthly trends available.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
          Monthly Messages Stacked
        </h4>
        <p className="text-[11px] text-neutral-400">Message share over time</p>
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={stats.monthlyTrendSplit}
            margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 9, fill: "#a3a3a3" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "#a3a3a3" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
            />
            <Tooltip content={<CustomChartTooltip />} />
            {participants.map((p) => (
              <Area
                key={p}
                type="monotone"
                dataKey={p}
                stackId="1"
                stroke={colors[p].stroke}
                fill={colors[p].stroke}
                fillOpacity={0.2}
                name={p}
              />
            ))}
            <Legend
              iconSize={8}
              iconType="circle"
              wrapperStyle={{ fontSize: 10, paddingTop: 10 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ParticipantRadarChart({
  stats,
  theme,
  selectedParticipants,
}: ChartProps & { selectedParticipants: string[] }) {
  const colorMap = useMemo(
    () => getParticipantColors(stats.participants.map((p) => p.name), theme),
    [stats, theme]
  );

  const filteredParticipants = useMemo(() => {
    return stats.participants.filter((p) => selectedParticipants.includes(p.name));
  }, [stats, selectedParticipants]);

  const radarData = useMemo(() => {
    const parts = filteredParticipants;
    if (parts.length === 0) return [];

    // Calculate maximums for normalization
    const maxPct = Math.max(...parts.map((p) => p.pct), 1);
    const maxWords = Math.max(...parts.map((p) => p.avgWordsPerMessage), 1);
    const maxEmoji = Math.max(...parts.map((p) => p.emojiRate), 1);
    const maxQuestion = Math.max(...parts.map((p) => p.questionRate), 1);
    const maxMedia = Math.max(...parts.map((p) => p.mediaRate), 1);
    const maxReply = Math.max(...parts.map((p) => p.avgReplyMinutes), 1);

    const axes = [
      { subject: "Message Share", key: "pct", max: maxPct },
      { subject: "Avg Words/Msg", key: "avgWordsPerMessage", max: maxWords },
      { subject: "Emoji Rate", key: "emojiRate", max: maxEmoji },
      { subject: "Questions Rate", key: "questionRate", max: maxQuestion },
      { subject: "Media Share", key: "mediaRate", max: maxMedia },
      { subject: "Reply Speed", key: "replySpeed", max: maxReply },
    ];

    return axes.map((axis) => {
      const entry: any = { subject: axis.subject };
      parts.forEach((p) => {
        if (axis.key === "replySpeed") {
          // Reply speed normalization (lower reply time = faster score)
          const score = p.avgReplyMinutes > 0 ? (1 - (p.avgReplyMinutes / axis.max) * 0.9) * 100 : 0;
          entry[p.name] = Number(score.toFixed(0));
        } else {
          const val = p[axis.key as keyof typeof p] as number;
          entry[p.name] = Number(((val / axis.max) * 100).toFixed(0));
        }
      });
      return entry;
    });
  }, [stats]);

  if (stats.participants.length < 2) {
    return null; // Radar is not useful for single participant chats
  }

  return (
    <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
          Participant Personality
        </h4>
        <p className="text-[11px] text-neutral-400">Relative chat traits (normalized 0-100)</p>
      </div>

      <div className="h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="47%" outerRadius="70%" data={radarData}>
            <PolarGrid stroke="#e5e5e5" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#737373" }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            {filteredParticipants.map((p) => (
              <Radar
                key={p.name}
                name={p.name}
                dataKey={p.name}
                stroke={colorMap[p.name].stroke}
                fill={colorMap[p.name].stroke}
                fillOpacity={0.15}
              />
            ))}
            <Legend
              iconSize={8}
              iconType="circle"
              wrapperStyle={{ fontSize: 10, paddingTop: 5 }}
            />
            <Tooltip content={<CustomChartTooltip suffix="%" />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ReplyTimeTrendChart({
  stats,
  theme,
  selectedParticipants,
}: ChartProps & { selectedParticipants: string[] }) {
  const participants = useMemo(() => {
    const all = stats.participants.map((p) => p.name);
    return all.filter((p) => selectedParticipants.includes(p));
  }, [stats, selectedParticipants]);
  const colors = useMemo(() => getParticipantColors(stats.participants.map((p) => p.name), theme), [stats, theme]);

  if (stats.replyTimeTrend.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-xs text-neutral-400 italic">
        No reply speed trends available.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
          Reply Time Over Time
        </h4>
        <p className="text-[11px] text-neutral-400">Average response speed in minutes</p>
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={stats.replyTimeTrend}
            margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 9, fill: "#a3a3a3" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "#a3a3a3" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 60 ? `${(v / 60).toFixed(0)}h` : `${v}m`)}
            />
            <Tooltip content={<CustomChartTooltip suffix=" min" />} />
            {participants.map((p) => (
              <Line
                key={p}
                type="monotone"
                dataKey={p}
                stroke={colors[p].stroke}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
                connectNulls={true}
                name={p}
              />
            ))}
            <Legend
              iconSize={8}
              iconType="circle"
              wrapperStyle={{ fontSize: 10, paddingTop: 10 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SentimentTrendChart({
  stats,
  theme,
  selectedParticipants,
}: ChartProps & { selectedParticipants: string[] }) {
  const participants = useMemo(() => {
    const all = stats.participants.map((p) => p.name);
    return all.filter((p) => selectedParticipants.includes(p));
  }, [stats, selectedParticipants]);
  const colors = useMemo(() => getParticipantColors(stats.participants.map((p) => p.name), theme), [stats, theme]);

  if (!stats.monthlySentimentSplit || stats.monthlySentimentSplit.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-xs text-neutral-400 italic">
        No sentiment trends available.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
          Sentiment Score Over Time
        </h4>
        <p className="text-[11px] text-neutral-400">Average tone (positive &gt; 0, negative &lt; 0)</p>
      </div>

      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={stats.monthlySentimentSplit}
            margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 9, fill: "#a3a3a3" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "#a3a3a3" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomChartTooltip />} />
            {participants.map((p) => (
              <Line
                key={p}
                type="monotone"
                dataKey={p}
                stroke={colors[p].stroke}
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1 }}
                activeDot={{ r: 5 }}
                connectNulls={true}
                name={p}
              />
            ))}
            <Legend
              iconSize={8}
              iconType="circle"
              wrapperStyle={{ fontSize: 10, paddingTop: 10 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
