import type { ChatData } from "@/types";

export interface ParticipantStat {
  name: string;
  count: number;
  pct: number;
  words: number;
  mediaCount: number;
}

export interface ChatStats {
  totalMessages: number;
  totalWords: number;
  mediaCount: number;
  systemCount: number;
  firstTs: number | null;
  lastTs: number | null;
  durationDays: number;
  avgPerDay: number;
  participants: ParticipantStat[];
  hourHistogram: number[]; // 24
  weekdayHistogram: number[]; // 7 (0 = Sunday)
  topEmojis: { emoji: string; count: number }[];
  longest: { sender: string; length: number; preview: string } | null;
  mostActiveDay: { date: string; count: number } | null;
}

const EMOJI_RE = /(\p{Extended_Pictographic})/gu;

export function computeStats(chat: ChatData): ChatStats {
  const messages = chat.messages;
  const perParticipant = new Map<string, { count: number; words: number; media: number }>();
  const hourHistogram = new Array(24).fill(0);
  const weekdayHistogram = new Array(7).fill(0);
  const emojiCounts = new Map<string, number>();
  const dayCounts = new Map<string, number>();

  let totalWords = 0;
  let mediaCount = 0;
  let systemCount = 0;
  let firstTs: number | null = null;
  let lastTs: number | null = null;
  let longest: { sender: string; length: number; preview: string } | null = null;

  for (const m of messages) {
    if (m.system) {
      systemCount++;
      continue;
    }
    const sender = m.sender ?? "Unknown";
    const entry = perParticipant.get(sender) ?? { count: 0, words: 0, media: 0 };
    entry.count++;
    if (m.isMedia) {
      entry.media++;
      mediaCount++;
    } else {
      const words = m.text.trim().length ? m.text.trim().split(/\s+/).length : 0;
      entry.words += words;
      totalWords += words;
      if (!longest || m.text.length > longest.length) {
        longest = { sender, length: m.text.length, preview: m.text.slice(0, 80) };
      }
      const emojis = m.text.match(EMOJI_RE);
      if (emojis) {
        for (const e of emojis) emojiCounts.set(e, (emojiCounts.get(e) ?? 0) + 1);
      }
    }
    perParticipant.set(sender, entry);

    if (!Number.isNaN(m.ts) && m.ts) {
      if (firstTs === null || m.ts < firstTs) firstTs = m.ts;
      if (lastTs === null || m.ts > lastTs) lastTs = m.ts;
      const d = new Date(m.ts);
      hourHistogram[d.getHours()]++;
      weekdayHistogram[d.getDay()]++;
      const dayKey = d.toISOString().slice(0, 10);
      dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
    }
  }

  const nonSystemTotal = messages.length - systemCount;
  const participants: ParticipantStat[] = Array.from(perParticipant.entries())
    .map(([name, v]) => ({
      name,
      count: v.count,
      pct: nonSystemTotal ? (v.count / nonSystemTotal) * 100 : 0,
      words: v.words,
      mediaCount: v.media,
    }))
    .sort((a, b) => b.count - a.count);

  const durationDays = dayCounts.size;

  const topEmojis = Array.from(emojiCounts.entries())
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  let mostActiveDay: { date: string; count: number } | null = null;
  for (const [date, count] of dayCounts.entries()) {
    if (!mostActiveDay || count > mostActiveDay.count) mostActiveDay = { date, count };
  }

  return {
    totalMessages: nonSystemTotal,
    totalWords,
    mediaCount,
    systemCount,
    firstTs,
    lastTs,
    durationDays,
    avgPerDay: durationDays ? nonSystemTotal / durationDays : 0,
    participants,
    hourHistogram,
    weekdayHistogram,
    topEmojis,
    longest,
    mostActiveDay,
  };
}
