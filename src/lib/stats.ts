import type { ChatData, ChatStats, ParticipantStat, RawMessage } from "@/types";
import { ENGLISH_WORDS } from "./english_dictionary";

const EMOJI_RE = /(\p{Extended_Pictographic})/gu;

const CHAT_SLANG = new Set([
  "lol", "lmao", "rofl", "omg", "idk", "brb", "btw", "tbh", "imho", "pls", "thx",
  "tldr", "fyi", "wip", "aka", "asap", "wtf", "txt", "msg", "ppl", "gonna", "wanna",
  "gotta", "bruh", "ur", "ok", "okay", "yeah", "yes", "ya", "yep", "nah", "pms", "dm",
  "fb", "ig", "yt", "li", "tw", "sc", "wa", "tg", "discord", "zoom", "teams", "slack"
]);

const STOP_WORDS = new Set([
  // English
  "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", 
  "yourself", "yover", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", "herself", 
  "it", "its", "itself", "they", "them", "their", "theirs", "themselves", "what", "which", 
  "who", "whom", "this", "that", "these", "those", "am", "is", "are", "was", "were", "be", 
  "been", "being", "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", 
  "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", "at", "by", "for", 
  "with", "about", "against", "between", "into", "through", "during", "before", "after", 
  "above", "below", "to", "from", "up", "down", "in", "out", "on", "off", "over", "under", 
  "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", 
  "any", "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", 
  "only", "own", "same", "so", "than", "too", "very", "s", "t", "can", "will", "just", "don", 
  "should", "now", "d", "ll", "m", "o", "re", "ve", "y", "ain", "aren", "couldn", "didn", 
  "shouldn", "wouldn", "won", "wasn", "weren", "was", "were", "went", "got", "get", "go",
  "doing", "done", "did", "does", "would", "could", "should", "want", "like", "think", "know",
  "tell", "say", "said", "has", "have", "had", "take", "make", "come", "came", "see", "saw",
  "give", "gave", "find", "found", "look", "use", "used", "work", "people", "way", "new",
  "first", "last", "one", "two", "three", "also", "well", "even", "back", "still", "only",
  "really", "much", "good", "great", "nice", "bad", "never", "always", "sometimes", "often",
  "that's", "it's", "don't", "can't", "cant", "dont", "im", "i'm", "you're", "we're", "they're",
  "ive", "i've", "youve", "you've", "weve", "we've", "theyve", "they've", "id", "i'd", "youd",
  "you'd", "wed", "we'd", "theyd", "they'd", "ill", "i'll", "youll", "you'll", "well", "we'll",
  "theyll", "they'll", "u", "ur", "r", "c", "ok", "okay", "yeah", "yes", "no", "ya", "deleted",
  // Spanish
  "el", "la", "los", "les", "las", "un", "una", "unos", "unas", "y", "o", "pero", "si", "sí", 
  "no", "de", "en", "a", "que", "qué", "para", "por", "con", "del", "al", "lo", "como", "cómo", 
  "mas", "más", "este", "esta", "esto", "estos", "estas", "ese", "esa", "eso", "esos", "esas", 
  "mi", "mis", "tu", "tus", "tú", "su", "sus", "yo", "me", "te", "se", "nos", "os", "le", "les", 
  "ya", "hay", "tiene", "tengo", "tienen", "hacer", "hecho", "ver", "ir", "fue", "fui", "fuimos", 
  "fueron", "son", "es", "soy", "eres", "somos", "sois", "eran", "era", "e", "u", "está", "están",
  "estando", "hace", "hizo", "bueno", "bien", "todo", "todos", "toda", "todas", "otro", "otros",
  "otra", "otras", "muy", "mucho", "muchos", "mucha", "muchas", "solo", "sólo", "tan", "así",
  "entonces", "luego", "después", "antes", "aquí", "allí", "allá", "donde", "dónde", "cuando",
  "cuándo", "quien", "quién", "cual", "cuál", "nada", "algo", "alguien", "nadie", "ninguno",
  "ninguna", "alguno", "alguna", "algunos", "algunas", "mismo", "misma", "mismos", "mismas",
  "contra", "desde", "hasta", "durante", "entre", "hacia", "mediante", "sobre", "tras",
  // WhatsApp export artifacts
  "omitted", "image", "video", "audio", "sticker", "document", "contact", "location", "gif",
  "message", "was"
]);

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

  // New map-based metrics
  const emojiMessageCounts = new Map<string, number>();
  const questionMessageCounts = new Map<string, number>();
  const monthlyParticipantCounts = new Map<string, Map<string, number>>();
  const monthlyReplyTimes = new Map<string, Map<string, { totalMs: number; count: number }>>();
  const wordCounts = new Map<string, number>();

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

  let globalTotalTypos = 0;
  const globalTypoCounts = new Map<string, number>();
  const participantTypos = new Map<string, Map<string, number>>();
  const participantTotalTypos = new Map<string, number>();
  
  const participantWordCounts = new Map<string, Map<string, number>>();
  const participantWordsTotal = new Map<string, number>();

  const participantNameWords = new Set<string>();
  for (const p of chat.participants) {
    const parts = p.toLowerCase().split(/[^a-z]+/);
    for (const part of parts) {
      if (part.length > 1) {
        participantNameWords.add(part);
      }
    }
  }

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

      // Word frequencies (excluding stop words)
      if (m.text) {
        const cleanedText = m.text.toLowerCase();
        // Split by non-alphanumeric chars (including support for common Spanish accented characters)
        const tokens = cleanedText.split(/[^a-z0-9áéíóúñü']+/);
        for (const w of tokens) {
          const cleanW = w.replace(/^'+|'+$/g, "");
          if (cleanW.length >= 3 && !STOP_WORDS.has(cleanW) && !/^\d+$/.test(cleanW)) {
            wordCounts.set(cleanW, (wordCounts.get(cleanW) ?? 0) + 1);

            const pWords = participantWordCounts.get(sender) ?? new Map<string, number>();
            pWords.set(cleanW, (pWords.get(cleanW) ?? 0) + 1);
            participantWordCounts.set(sender, pWords);
            participantWordsTotal.set(sender, (participantWordsTotal.get(sender) ?? 0) + 1);
          }
        }
      }

      // Spell check for English
      if (m.text) {
        const cleanedText = m.text.toLowerCase();
        const tokens = cleanedText.split(/[^a-z']+/);
        for (const w of tokens) {
          const cleanW = w.replace(/^'+|'+$/g, "");
          if (cleanW.length > 1 && !CHAT_SLANG.has(cleanW) && !participantNameWords.has(cleanW)) {
            const deApostrophed = cleanW.replace(/'/g, "");
            const inDict = ENGLISH_WORDS.has(cleanW) || ENGLISH_WORDS.has(deApostrophed);
            if (!inDict) {
              globalTotalTypos++;
              globalTypoCounts.set(cleanW, (globalTypoCounts.get(cleanW) ?? 0) + 1);

              const pTypos = participantTypos.get(sender) ?? new Map<string, number>();
              pTypos.set(cleanW, (pTypos.get(cleanW) ?? 0) + 1);
              participantTypos.set(sender, pTypos);

              participantTotalTypos.set(sender, (participantTotalTypos.get(sender) ?? 0) + 1);
            }
          }
        }
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

      // Stacked Monthly Messages Split
      if (!monthlyParticipantCounts.has(monthKey)) {
        monthlyParticipantCounts.set(monthKey, new Map());
      }
      const pCounts = monthlyParticipantCounts.get(monthKey)!;
      pCounts.set(sender, (pCounts.get(sender) ?? 0) + 1);

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

      // Emojis per participant rate
      const emojis = m.text ? m.text.match(EMOJI_RE) : null;
      if (emojis && emojis.length > 0) {
        emojiMessageCounts.set(sender, (emojiMessageCounts.get(sender) ?? 0) + 1);
      }

      // Questions per participant rate
      if (m.text && m.text.includes("?")) {
        questionMessageCounts.set(sender, (questionMessageCounts.get(sender) ?? 0) + 1);
      }

      // Reply Times & Monthly Reply Times
      if (lastNonSystemMsg && lastNonSystemMsg.sender && lastNonSystemMsg.sender !== sender) {
        const gap = m.ts - lastNonSystemMsg.ts;
        if (gap > 0 && gap < 24 * 3600 * 1000) {
          replyTimes.set(sender, (replyTimes.get(sender) ?? 0) + gap);
          replyCounts.set(sender, (replyCounts.get(sender) ?? 0) + 1);

          // Monthly reply tracking
          if (!monthlyReplyTimes.has(monthKey)) {
            monthlyReplyTimes.set(monthKey, new Map());
          }
          const mRep = monthlyReplyTimes.get(monthKey)!;
          const repEntry = mRep.get(sender) ?? { totalMs: 0, count: 0 };
          repEntry.totalMs += gap;
          repEntry.count += 1;
          mRep.set(sender, repEntry);
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

  // Pre-calculate document frequency for TF-IDF
  const documentFrequency = new Map<string, number>();
  const activeParticipantsCount = perParticipant.size;
  for (const pWords of participantWordCounts.values()) {
    for (const w of pWords.keys()) {
      documentFrequency.set(w, (documentFrequency.get(w) ?? 0) + 1);
    }
  }

  const nonSystemTotal = messages.length - systemCount;
  const participants: ParticipantStat[] = Array.from(perParticipant.entries())
    .map(([name, v]) => {
      const doubleCount = doubleTextCounts.get(name) ?? 0;
      const nightCount = nightOwlCounts.get(name) ?? 0;
      const repTime = replyTimes.get(name) ?? 0;
      const repCount = replyCounts.get(name) ?? 0;
      const emojiMsgCount = emojiMessageCounts.get(name) ?? 0;
      const questionMsgCount = questionMessageCounts.get(name) ?? 0;

      const pTyposMap = participantTypos.get(name) ?? new Map<string, number>();
      const typoCount = participantTotalTypos.get(name) ?? 0;
      const topTypos = Array.from(pTyposMap.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const pWordsMap = participantWordCounts.get(name) ?? new Map<string, number>();
      const pTotalWords = participantWordsTotal.get(name) ?? 1;

      const tfIdfScores: { word: string; score: number }[] = [];
      for (const [w, count] of pWordsMap.entries()) {
        const tf = count / pTotalWords;
        const df = documentFrequency.get(w) ?? 1;
        const idf = Math.log(1 + activeParticipantsCount / df);
        tfIdfScores.push({ word: w, score: tf * idf });
      }

      const distinctiveWords = tfIdfScores
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((x) => x.word);

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
        emojiRate: v.count > 0 ? (emojiMsgCount / v.count) * 100 : 0,
        questionRate: v.count > 0 ? (questionMsgCount / v.count) * 100 : 0,
        mediaRate: v.count > 0 ? (v.media / v.count) * 100 : 0,
        typoCount,
        typoRate: v.words > 0 ? (typoCount / v.words) * 1000 : 0,
        topTypos,
        distinctiveWords,
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

  // Monthly Trend & splits gap filling
  const monthlyTrend: { month: string; count: number }[] = [];
  const monthlyTrendSplit: { month: string; [participant: string]: number | string }[] = [];
  const replyTimeTrend: { month: string; [participant: string]: number | null | string }[] = [];

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

      // Build split count entry
      const pCounts = monthlyParticipantCounts.get(key);
      const splitEntry: { month: string; [participant: string]: number | string } = { month: label };
      for (const p of chat.participants) {
        splitEntry[p] = pCounts ? (pCounts.get(p) ?? 0) : 0;
      }
      monthlyTrendSplit.push(splitEntry);

      // Build reply trend entry
      const mRep = monthlyReplyTimes.get(key);
      const repEntry: { month: string; [participant: string]: number | null | string } = { month: label };
      for (const p of chat.participants) {
        if (mRep && mRep.has(p)) {
          const entry = mRep.get(p)!;
          repEntry[p] = Number((entry.totalMs / entry.count / 60000).toFixed(1));
        } else {
          repEntry[p] = null;
        }
      }
      replyTimeTrend.push(repEntry);

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

  // Daily activity for calendar heatmap
  const dailyActivity: { date: string; count: number }[] = [];
  if (firstTs && lastTs) {
    const firstDate = new Date(firstTs);
    const lastDate = new Date(lastTs);
    // Normalize date cursors
    const curDate = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
    const endDate = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());

    while (curDate <= endDate) {
      const year = curDate.getFullYear();
      const month = String(curDate.getMonth() + 1).padStart(2, "0");
      const day = String(curDate.getDate()).padStart(2, "0");
      const key = `${year}-${month}-${day}`;
      const count = dayCounts.get(key) ?? 0;
      dailyActivity.push({ date: key, count });
      curDate.setDate(curDate.getDate() + 1);
    }
  }

  // Tokenized word frequencies for word cloud
  const wordCloudWords = Array.from(wordCounts.entries())
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 80);

  const topTypos = Array.from(globalTypoCounts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

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
    dailyActivity,
    monthlyTrendSplit,
    replyTimeTrend,
    wordCloudWords,
    totalTypos: globalTotalTypos,
    topTypos,
  };
}
