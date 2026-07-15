import { useState, useMemo } from "react";
import { BarChart2, Brain, PenTool } from "lucide-react";
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
import { getHarmonicPalette } from "@/lib/colors";

interface ChartProps {
  stats: ChatStats;
  theme: BubbleTheme;
}

// Helper to generate colors for participants
function getParticipantColors(participants: string[], theme: BubbleTheme) {
  const baseColors = getHarmonicPalette(theme, participants.length);

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
  const [activeTab, setActiveTab] = useState<"chatStats" | "bigFive" | "writingStyle">("chatStats");

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
    const maxDoubleText = Math.max(...parts.map((p) => p.doubleTextRate), 1);
    const maxTypo = Math.max(...parts.map((p) => p.typoRate), 1);
    const maxNightOwl = Math.max(...parts.map((p) => p.nightOwlScore), 1);
    const maxGhost = Math.max(...parts.map((p) => p.ghostingRate), 1);
    const maxAllCaps = Math.max(...parts.map((p) => p.allCapsRate), 1);
    const maxSlang = Math.max(...parts.map((p) => p.slangRate), 1);
    const maxExclamation = Math.max(...parts.map((p) => p.exclamationRate), 1);

    const sentiments = parts.map((p) => p.sentimentScore);
    const minSent = Math.min(...sentiments, 0);
    const maxSent = Math.max(...sentiments, 1);

    if (activeTab === "chatStats") {
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
            const score = p.avgReplyMinutes > 0 ? (1 - (p.avgReplyMinutes / axis.max) * 0.9) * 100 : 0;
            entry[p.name] = Number(score.toFixed(0));
          } else {
            const val = p[axis.key as keyof typeof p] as number;
            entry[p.name] = Number(((val / axis.max) * 100).toFixed(0));
          }
        });
        return entry;
      });
    } else if (activeTab === "bigFive") {
      const axes = [
        { subject: "Extraversion", key: "extraversion" },
        { subject: "Agreeableness", key: "agreeableness" },
        { subject: "Conscientiousness", key: "conscientiousness" },
        { subject: "Reactivity", key: "reactivity" },
        { subject: "Openness", key: "openness" },
      ];

      return axes.map((axis) => {
        const entry: any = { subject: axis.subject };
        parts.forEach((p) => {
          let score = 0;
          if (axis.key === "extraversion") {
            const relPct = p.pct / maxPct;
            const relDouble = p.doubleTextRate / maxDoubleText;
            const relReply = p.avgReplyMinutes > 0 ? (1 - (p.avgReplyMinutes / maxReply) * 0.9) : 0;
            score = (relPct * 0.4 + relDouble * 0.3 + relReply * 0.3) * 100;
          } else if (axis.key === "agreeableness") {
            const relSent = (p.sentimentScore - minSent) / (maxSent - minSent || 1);
            const relEmoji = p.emojiRate / maxEmoji;
            score = (relSent * 0.6 + relEmoji * 0.4) * 100;
          } else if (axis.key === "conscientiousness") {
            const relTypoInv = 1 - (p.typoRate / maxTypo) * 0.8;
            const relDayOwl = 1 - (p.nightOwlScore / maxNightOwl) * 0.8;
            score = (relTypoInv * 0.5 + relDayOwl * 0.5) * 100;
          } else if (axis.key === "reactivity") {
            const relDouble = p.doubleTextRate / maxDoubleText;
            const relGhost = p.ghostingRate / maxGhost;
            score = (relDouble * 0.5 + relGhost * 0.5) * 100;
          } else if (axis.key === "openness") {
            const relWords = p.avgWordsPerMessage / maxWords;
            const relQuestion = p.questionRate / maxQuestion;
            score = (relWords * 0.5 + relQuestion * 0.5) * 100;
          }
          entry[p.name] = Math.round(score);
        });
        return entry;
      });
    } else {
      // writingStyle
      const axes = [
        { subject: "Loudness", key: "loudness" },
        { subject: "Expressiveness", key: "expressiveness" },
        { subject: "Slang Density", key: "slang" },
        { subject: "Exclamations", key: "exclamations" },
        { subject: "Fragmentation", key: "fragmentation" },
      ];

      return axes.map((axis) => {
        const entry: any = { subject: axis.subject };
        parts.forEach((p) => {
          let score = 0;
          if (axis.key === "loudness") {
            score = (p.allCapsRate / maxAllCaps) * 100;
          } else if (axis.key === "expressiveness") {
            const relEmoji = p.emojiRate / maxEmoji;
            const relMedia = p.mediaRate / maxMedia;
            score = (relEmoji * 0.5 + relMedia * 0.5) * 100;
          } else if (axis.key === "slang") {
            score = (p.slangRate / maxSlang) * 100;
          } else if (axis.key === "exclamations") {
            score = (p.exclamationRate / maxExclamation) * 100;
          } else if (axis.key === "fragmentation") {
            score = (p.doubleTextRate / maxDoubleText) * 100;
          }
          entry[p.name] = Math.round(score);
        });
        return entry;
      });
    }
  }, [filteredParticipants, activeTab]);

  if (stats.participants.length < 2) {
    return null; // Radar is not useful for single participant chats
  }

  return (
    <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
            Participant Personality
          </h4>
          <p className="text-[11px] text-neutral-400">Relative chat traits (normalized 0-100)</p>
        </div>
        <div className="flex flex-wrap gap-1 text-[10px] font-semibold">
          <button
            onClick={() => setActiveTab("chatStats")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer border ${
              activeTab === "chatStats"
                ? "bg-neutral-900 border-neutral-900 text-white"
                : "bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <BarChart2 size={11} />
            Stats
          </button>
          <button
            onClick={() => setActiveTab("bigFive")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer border ${
              activeTab === "bigFive"
                ? "bg-neutral-900 border-neutral-900 text-white"
                : "bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <Brain size={11} />
            Big Five
          </button>
          <button
            onClick={() => setActiveTab("writingStyle")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer border ${
              activeTab === "writingStyle"
                ? "bg-neutral-900 border-neutral-900 text-white"
                : "bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <PenTool size={11} />
            Habits
          </button>
        </div>
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
