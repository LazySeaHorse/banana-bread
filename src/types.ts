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
}

export interface ChatData extends ChatIndexEntry {
  messages: RawMessage[];
  reactions: Record<number, Reaction[]>;
}

export interface ParseProgress {
  processed: number;
  total: number;
}

export interface ParseResult {
  messages: RawMessage[];
  participants: string[];
}
