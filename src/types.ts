export interface RawMessage {
  id: number;
  ts: number; // epoch ms, NaN if unknown
  sender: string | null; // null = system message
  text: string;
  isMedia: boolean;
  mediaKind?: string;
  system?: boolean;
  edited?: boolean;
  deleted?: boolean;
  custom?: boolean; // added inside the app (not from the original export)
}

export interface Reaction {
  emoji: string;
  by: string;
}

export interface BubbleTheme {
  id: string;
  label: string;
  meFrom: string;
  meTo: string;
  meText: string;
  themBg: string;
  themText: string;
}

export interface ChatIndexEntry {
  id: string;
  title: string;
  fileName: string;
  participants: string[];
  me: string | null;
  messageCount: number;
  lastMessagePreview: string;
  lastTs: number;
  createdAt: number;
  updatedAt: number;
  theme: BubbleTheme;
  aiPersonas: string[];
}

export interface ChatData extends ChatIndexEntry {
  messages: RawMessage[];
  reactions: Record<number, Reaction[]>;
}

export interface ParticipantStat {
  name: string;
  count: number;
  pct: number;
  words: number;
  mediaCount: number;
  avgWordsPerMessage: number;
  doubleTextRate: number;
  nightOwlScore: number;
  avgReplyMinutes: number;
  emojiRate: number;
  questionRate: number;
  mediaRate: number;
  typoCount: number;
  typoRate: number;
  topTypos: { word: string; count: number }[];
  distinctiveWords: string[];
  sentimentScore: number;
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
  monthlyTrend: { month: string; count: number }[];
  conversationStarters: { name: string; count: number }[];
  longestSilenceMs: number;
  longestStreakDays: number;
  dailyActivity: { date: string; count: number }[];
  monthlyTrendSplit: { month: string; [participant: string]: number | string }[];
  replyTimeTrend: { month: string; [participant: string]: number | null | string }[];
  wordCloudWords: { text: string; value: number }[];
  totalTypos: number;
  topTypos: { word: string; count: number }[];
  monthlySentimentSplit: { month: string; [participant: string]: number | string }[];
}


export interface ParseProgress {
  processed: number;
  total: number;
}

export interface ParseResult {
  messages: RawMessage[];
  participants: string[];
}
