import type { ChatData, ChatStats, ParticipantStat, RawMessage } from "@/types";

const EMOJI_RE = /(\p{Extended_Pictographic})/gu;

export function computeStats(chat: ChatData): ChatStats {
  const messages = chat.messages;
  const perParticipant = new Map<string, { count: number; words: number; media: number }>();
  const hourHistogram = new Array(24).fill(0);
  const weekdayHistogram = new Array(7).fill(0);
  const emojiCounts = new Map<string, number>();
  const dayCounts = new Map<string, number>();

  const doubleTextCounts = new Map<string, number>();
  const nightOwlCounts = new Map<string, number>();
  const replyTimes = new Map<string, number>();
  const replyCounts = new Map<string, number>();
  const startersCounts = new Map<string, number>();
  const monthlyCounts = new Map<string, number>();

  let totalWords = 0;
  let mediaCount = 0;
  let systemCount = 0;
  let firstTs: number | null = null;
  let lastTs: number | null = null;
  let longest: { sender: string; length: number; preview: string } | null = null;

  let longestSilenceMs = 0;
  let lastNonSystemMsg: RawMessage | null = null;
  let lastTsForSilence = 0;
  let lastMsgTs = 0;

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

      // Monthly Trend Map
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyCounts.set(monthKey, (monthlyCounts.get(monthKey) ?? 0) + 1);

      // Night Owl Score: message sent between 00:00 and 04:59 (inclusive)
      const hour = d.getHours();
      if (hour >= 0 && hour < 5) {
        nightOwlCounts.set(sender, (nightOwlCounts.get(sender) ?? 0) + 1);
      }

      // Conversation Starters: first message or message after > 6 hours of silence
      if (lastMsgTs === 0 || (m.ts - lastMsgTs > 6 * 3600 * 1000)) {
        startersCounts.set(sender, (startersCounts.get(sender) ?? 0) + 1);
      }
      lastMsgTs = m.ts;

      // Reply Times: sender switches, gap < 24 hours
      if (lastNonSystemMsg && lastNonSystemMsg.sender && lastNonSystemMsg.sender !== sender) {
        const gap = m.ts - lastNonSystemMsg.ts;
        if (gap > 0 && gap < 24 * 3600 * 1000) {
          replyTimes.set(sender, (replyTimes.get(sender) ?? 0) + gap);
          replyCounts.set(sender, (replyCounts.get(sender) ?? 0) + 1);
        }
      }

      // Double-texting: same sender sends consecutive messages
      if (lastNonSystemMsg && lastNonSystemMsg.sender === sender) {
        doubleTextCounts.set(sender, (doubleTextCounts.get(sender) ?? 0) + 1);
      }

      // Longest silence: gap between consecutive messages
      if (lastTsForSilence > 0) {
        const silenceGap = m.ts - lastTsForSilence;
        if (silenceGap > longestSilenceMs) {
          longestSilenceMs = silenceGap;
        }
      }
      lastTsForSilence = m.ts;
      lastNonSystemMsg = m;
    }
  }

  const nonSystemTotal = messages.length - systemCount;
  const participants: ParticipantStat[] = Array.from(perParticipant.entries())
    .map(([name, v]) => {
      const doubleCount = doubleTextCounts.get(name) ?? 0;
      const nightCount = nightOwlCounts.get(name) ?? 0;
      const repTime = replyTimes.get(name) ?? 0;
      const repCount = replyCounts.get(name) ?? 0;

      return {
        name,
        count: v.count,
        pct: nonSystemTotal ? (v.count / nonSystemTotal) * 100 : 0,
        words: v.words,
        mediaCount: v.media,
        avgWordsPerMessage: v.count > 0 ? v.words / v.count : 0,
        doubleTextRate: v.count > 0 ? (doubleCount / v.count) * 100 : 0,
        nightOwlScore: v.count > 0 ? (nightCount / v.count) * 100 : 0,
        avgReplyMinutes: repCount > 0 ? (repTime / repCount) / 60000 : 0,
      };
    })
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

  // Monthly Trend gap filling
  const monthlyTrend: { month: string; count: number }[] = [];
  if (firstTs && lastTs) {
    const firstDate = new Date(firstTs);
    const lastDate = new Date(lastTs);
    let curY = firstDate.getFullYear();
    let curM = firstDate.getMonth();
    const endY = lastDate.getFullYear();
    const endM = lastDate.getMonth();

    while (curY < endY || (curY === endY && curM <= endM)) {
      const key = `${curY}-${String(curM + 1).padStart(2, "0")}`;
      const count = monthlyCounts.get(key) ?? 0;
      const dateObj = new Date(curY, curM, 1);
      const label = dateObj.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      monthlyTrend.push({ month: label, count });

      curM++;
      if (curM > 11) {
        curM = 0;
        curY++;
      }
    }
  }

  // Conversation Starters
  const conversationStarters = Array.from(startersCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Longest active streak (consecutive days)
  const dayIndices = Array.from(dayCounts.keys())
    .map((dateStr) => {
      const [y, m, d] = dateStr.split("-").map(Number);
      return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
    })
    .sort((a, b) => a - b);

  let longestStreakDays = 0;
  let currentStreak = 0;
  let prevIdx = -999;
  for (const idx of dayIndices) {
    if (idx === prevIdx + 1) {
      currentStreak++;
    } else {
      currentStreak = 1;
    }
    if (currentStreak > longestStreakDays) {
      longestStreakDays = currentStreak;
    }
    prevIdx = idx;
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
    monthlyTrend,
    conversationStarters,
    longestSilenceMs,
    longestStreakDays,
  };
}
