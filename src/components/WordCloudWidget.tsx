import { useMemo } from "react";
import ReactWordcloud from "react-wordcloud";
import type { BubbleTheme } from "@/types";

interface WordItem {
  text: string;
  value: number;
}

export function WordCloudWidget({
  words,
  theme,
}: {
  words: WordItem[];
  theme: BubbleTheme;
}) {
  const options = useMemo(() => {
    // Generate a cohesive color palette based on active theme
    const colors = [
      theme.meFrom,
      theme.meTo,
      theme.meFrom === "#5B51D8" ? "#8A2BE2" : `${theme.meFrom}ee`,
      theme.meTo === "#E1306C" ? "#FF1493" : `${theme.meTo}ee`,
      "#0ea5e9", // sky-500
      "#8b5cf6", // violet-500
      "#ec4899", // pink-500
      "#10b981", // emerald-500
    ];

    return {
      colors,
      deterministic: true,
      enableTooltip: true,
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSizes: [14, 48] as [number, number],
      fontStyle: "normal",
      fontWeight: "600",
      padding: 3,
      rotations: 2,
      rotationAngles: [0, 90] as [number, number],
      scale: "log" as const,
      spiral: "archimedean" as const,
      transitionDuration: 600,
    };
  }, [theme]);

  return (
    <div className="relative rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
      <div className="mb-2">
        <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
          Topic Word Cloud
        </h4>
        <p className="text-[11px] text-neutral-400">
          Most frequent words used (excluding common stop words)
        </p>
      </div>

      <div className="h-[220px] w-full overflow-hidden rounded-xl bg-white border border-neutral-100 p-2">
        {words.length > 0 ? (
          <ReactWordcloud words={words} options={options} />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-neutral-400 italic">
            Not enough words to generate cloud
          </div>
        )}
      </div>
    </div>
  );
}
