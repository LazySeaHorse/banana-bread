import type { BubbleTheme } from "@/types";

const PALETTE = [
  "#F58529",
  "#DD2A7B",
  "#8134AF",
  "#515BD4",
  "#FEDA77",
  "#2B9AF3",
  "#22C55E",
  "#F97316",
  "#EF4444",
  "#14B8A6",
  "#A855F7",
  "#0EA5E9",
];

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function colorForName(name: string): string {
  return PALETTE[hashString(name) % PALETTE.length];
}

export function initialsForName(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return "?";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const BUBBLE_THEMES: BubbleTheme[] = [
  {
    id: "ig-classic",
    label: "Instagram",
    meFrom: "#5B51D8",
    meTo: "#E1306C",
    meText: "#ffffff",
    themBg: "#EFEFEF",
    themText: "#1c1c1c",
  },
  {
    id: "sunset",
    label: "Sunset",
    meFrom: "#F58529",
    meTo: "#DD2A7B",
    meText: "#ffffff",
    themBg: "#EFEFEF",
    themText: "#1c1c1c",
  },
  {
    id: "ocean",
    label: "Ocean",
    meFrom: "#2193b0",
    meTo: "#6dd5ed",
    meText: "#ffffff",
    themBg: "#EFEFEF",
    themText: "#1c1c1c",
  },
  {
    id: "forest",
    label: "Forest",
    meFrom: "#11998e",
    meTo: "#38ef7d",
    meText: "#ffffff",
    themBg: "#EFEFEF",
    themText: "#1c1c1c",
  },
  {
    id: "grape",
    label: "Grape",
    meFrom: "#8E2DE2",
    meTo: "#4A00E0",
    meText: "#ffffff",
    themBg: "#EFEFEF",
    themText: "#1c1c1c",
  },
  {
    id: "mono",
    label: "Classic Blue",
    meFrom: "#3897F0",
    meTo: "#3897F0",
    meText: "#ffffff",
    themBg: "#EFEFEF",
    themText: "#1c1c1c",
  },
];

export function defaultTheme(): BubbleTheme {
  return BUBBLE_THEMES[0];
}
