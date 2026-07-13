import { useMemo } from "react";
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
  const maxVal = useMemo(() => {
    return words.length > 0 ? Math.max(...words.map((w) => w.value), 1) : 1;
  }, [words]);

  const colors = useMemo(() => {
    const from = theme.meFrom || "#5B51D8";
    const to = theme.meTo || "#E1306C";
    return [
      from,
      to,
      theme.meFrom === "#5B51D8" ? "#8A2BE2" : `${from}ee`,
      theme.meTo === "#E1306C" ? "#FF1493" : `${to}ee`,
      "#0ea5e9", // sky-500
      "#8b5cf6", // violet-500
      "#ec4899", // pink-500
      "#10b981", // emerald-500
    ];
  }, [theme]);

  // Position words in a spiral outward from the center
  const points = useMemo(() => {
    return words.map((w, idx) => {
      // Golden angle spiral distribution
      const angle = idx * 2.4; 
      // Push words outward based on their rank
      const radius = Math.pow(idx, 0.6) * 16 + 12;
      
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      // Map value logarithmically to size to keep it clean
      const minSize = 9;
      const maxSize = 26;
      const size = minSize + (Math.log(w.value) / Math.log(maxVal)) * (maxSize - minSize);
      
      // Rotated words: vertical vs horizontal (every 4th word vertical)
      const rotate = idx % 4 === 0 ? 90 : 0;

      return {
        text: w.text,
        value: w.value,
        x,
        y,
        size: Number(size.toFixed(1)),
        rotate,
        color: colors[idx % colors.length],
      };
    });
  }, [words, maxVal, colors]);

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

      <div className="h-[220px] w-full overflow-hidden rounded-xl bg-white border border-neutral-100 p-2 flex items-center justify-center">
        {words.length > 0 ? (
          <svg viewBox="-160 -110 320 220" className="w-full h-full select-none overflow-visible">
            {points.map((p, idx) => (
              <text
                key={idx}
                x={p.x}
                y={p.y}
                fontSize={`${p.size}px`}
                transform={`rotate(${p.rotate}, ${p.x}, ${p.y})`}
                textAnchor="middle"
                alignmentBaseline="middle"
                style={{
                  fill: p.color,
                  fontWeight: p.size > 18 ? "bold" : "600",
                  opacity: Math.max(0.4, 1 - (idx / words.length) * 0.5),
                  transition: "all 0.15s ease",
                }}
                className="hover:scale-115 hover:opacity-100 cursor-pointer origin-center"
              >
                {p.text}
                <title>{p.value.toLocaleString()} occurrences</title>
              </text>
            ))}
          </svg>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-neutral-400 italic">
            Not enough words to generate cloud
          </div>
        )}
      </div>
    </div>
  );
}
