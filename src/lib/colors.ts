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
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    meFrom: "#f43f5e",
    meTo: "#06b6d4",
    meText: "#ffffff",
    themBg: "#EFEFEF",
    themText: "#1c1c1c",
  },
  {
    id: "bubblegum",
    label: "Bubblegum",
    meFrom: "#ec4899",
    meTo: "#f472b6",
    meText: "#ffffff",
    themBg: "#EFEFEF",
    themText: "#1c1c1c",
  },
  {
    id: "candyfloss",
    label: "Candy Floss",
    meFrom: "#a855f7",
    meTo: "#f472b6",
    meText: "#ffffff",
    themBg: "#EFEFEF",
    themText: "#1c1c1c",
  },
  {
    id: "volcano",
    label: "Volcano",
    meFrom: "#f97316",
    meTo: "#dc2626",
    meText: "#ffffff",
    themBg: "#EFEFEF",
    themText: "#1c1c1c",
  },
  {
    id: "mint-teal",
    label: "Mint & Teal",
    meFrom: "#0d9488",
    meTo: "#10b981",
    meText: "#ffffff",
    themBg: "#EFEFEF",
    themText: "#1c1c1c",
  },
  {
    id: "luxury-gold",
    label: "Gold & Amber",
    meFrom: "#fbbf24",
    meTo: "#d97706",
    meText: "#ffffff",
    themBg: "#EFEFEF",
    themText: "#1c1c1c",
  },
  {
    id: "midnight",
    label: "Midnight Blue",
    meFrom: "#1e1b4b",
    meTo: "#4f46e5",
    meText: "#ffffff",
    themBg: "#EFEFEF",
    themText: "#1c1c1c",
  },
  {
    id: "steel",
    label: "Steel Slate",
    meFrom: "#475569",
    meTo: "#94a3b8",
    meText: "#ffffff",
    themBg: "#EFEFEF",
    themText: "#1c1c1c",
  },
  {
    id: "rose-gold",
    label: "Rose Gold",
    meFrom: "#f43f5e",
    meTo: "#fda4af",
    meText: "#ffffff",
    themBg: "#EFEFEF",
    themText: "#1c1c1c",
  },
];

export function defaultTheme(): BubbleTheme {
  return BUBBLE_THEMES[0];
}

export function randomTheme(): BubbleTheme {
  const index = Math.floor(Math.random() * BUBBLE_THEMES.length);
  return BUBBLE_THEMES[index];
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (val: number) => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getHarmonicPalette(theme: BubbleTheme, count: number): string[] {
  const baseColor = theme.meFrom;
  const { h, s, l } = hexToHsl(baseColor);
  
  const palette: string[] = [];
  palette.push(baseColor);
  
  const meToHex = theme.meTo;
  if (meToHex.toLowerCase() !== baseColor.toLowerCase() && count > 1) {
    palette.push(meToHex);
  }

  const hueStep = Math.max(30, Math.floor(360 / Math.max(count, 5)));
  
  let i = 1;
  while (palette.length < count) {
    const direction = i % 2 === 0 ? 1 : -1;
    const stepMultiplier = Math.ceil(i / 2);
    const newHue = (h + direction * stepMultiplier * hueStep + 360) % 360;
    
    const hex = hslToHex(newHue, s, l);
    if (!palette.some(c => c.toLowerCase() === hex.toLowerCase())) {
      palette.push(hex);
    }
    i++;
    if (i > 100) break;
  }
  
  while (palette.length < count) {
    palette.push(hslToHex((h + palette.length * 45) % 360, Math.max(30, s - 10), Math.max(30, l - 10)));
  }

  return palette.slice(0, count);
}
