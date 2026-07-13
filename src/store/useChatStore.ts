import { create } from "zustand";
import type {
  ChatData,
  ChatIndexEntry,
  RawMessage,
  Reaction,
  BubbleTheme,
} from "@/types";
import { parseChatFile } from "@/lib/parseChat";
import {
  readIndex,
  saveChat,
  loadChat,
  removeChat,
  clearAllStorage as clearStorageLib,
} from "@/lib/storage";
import { defaultTheme } from "@/lib/colors";

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function deriveTitle(participants: string[], fileName: string): string {
  const match = fileName.match(/^WhatsApp chat with\s+(.+)$/i);
  if (match) {
    const derived = match[1].replace(/\.txt$/i, "").trim();
    if (derived) {
      return derived;
    }
  }
  if (participants.length > 0) return participants.slice(0, 3).join(", ");
  return fileName.replace(/\.txt$/i, "");
}

function lastPreview(messages: RawMessage[]): { preview: string; ts: number } {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.deleted) continue;
    if (m.system) return { preview: m.text.slice(0, 80), ts: m.ts };
    const text = m.isMedia
      ? "📷 Media"
      : m.text.replace(/\n+/g, " ").slice(0, 80);
    return { preview: text, ts: m.ts };
  }
  return { preview: "", ts: 0 };
}

interface ImportProgress {
  fileName: string;
  processed: number;
  total: number;
}

interface ChatStoreState {
  index: ChatIndexEntry[];
  chats: Record<string, ChatData>;
  activeChatId: string | null;
  importProgress: ImportProgress | null;
  toast: string | null;

  init: () => void;
  setActiveChat: (id: string | null) => void;
  importFile: (file: File) => Promise<void>;
  ensureLoaded: (id: string) => ChatData | null;
  setMe: (chatId: string, me: string | null) => void;
  setTheme: (chatId: string, theme: BubbleTheme) => void;
  setAIPersonas: (chatId: string, personas: string[]) => void;
  addMessage: (chatId: string, sender: string, text: string) => void;
  editMessage: (chatId: string, messageId: number, text: string) => void;
  deleteMessage: (chatId: string, messageId: number) => void;
  toggleReaction: (
    chatId: string,
    messageId: number,
    emoji: string,
    by: string,
  ) => void;
  removeChatEntirely: (chatId: string) => void;
  clearAllStorage: () => void;
  setToast: (msg: string | null) => void;
  persist: (chatId: string) => void;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  index: [],
  chats: {},
  activeChatId: null,
  importProgress: null,
  toast: null,

  init: () => {
    set({ index: readIndex() });
  },

  setActiveChat: (id) => set({ activeChatId: id }),

  setToast: (msg) => set({ toast: msg }),

  importFile: async (file: File) => {
    set({ importProgress: { fileName: file.name, processed: 0, total: 1 } });
    try {
      const text = await file.text();
      const { messages, participants } = await parseChatFile(text, {
        onProgress: (processed, total) =>
          set({ importProgress: { fileName: file.name, processed, total } }),
      });
      const id = makeId();
      const now = Date.now();
      const { preview, ts } = lastPreview(messages);
      const chat: ChatData = {
        id,
        title: deriveTitle(participants, file.name),
        fileName: file.name,
        participants,
        me: null,
        messageCount: messages.length,
        lastMessagePreview: preview,
        lastTs: ts,
        createdAt: now,
        updatedAt: now,
        theme: defaultTheme(),
        aiPersonas: [],
        messages,
        reactions: {},
      };
      set((s) => ({
        chats: { ...s.chats, [id]: chat },
        activeChatId: id,
        importProgress: null,
      }));
      const result = saveChat(chat);
      set((s) => ({
        index: [...s.index.filter((c) => c.id !== id), toIndexEntry(chat)],
      }));
      if (!result.ok) set({ toast: result.error ?? "Could not save chat." });
    } catch (e) {
      set({
        importProgress: null,
        toast: `Failed to parse file: ${(e as Error).message}`,
      });
    }
  },

  ensureLoaded: (id: string) => {
    const state = get();
    if (state.chats[id]) return state.chats[id];
    const loaded = loadChat(id);
    if (loaded) {
      set((s) => ({ chats: { ...s.chats, [id]: loaded } }));
      return loaded;
    }
    return null;
  },

  setMe: (chatId, me) => {
    updateChat(set, get, chatId, (chat) => ({ ...chat, me }));
  },

  setTheme: (chatId, theme) => {
    updateChat(set, get, chatId, (chat) => ({ ...chat, theme }));
  },

  setAIPersonas: (chatId, personas) => {
    updateChat(set, get, chatId, (chat) => ({ ...chat, aiPersonas: personas }));
  },

  addMessage: (chatId, sender, text) => {
    updateChat(set, get, chatId, (chat) => {
      const nextId = chat.messages.length
        ? Math.max(...chat.messages.map((m) => m.id)) + 1
        : 0;
      const msg: RawMessage = {
        id: nextId,
        ts: Date.now(),
        sender,
        text,
        isMedia: false,
        custom: true,
      };
      const messages = [...chat.messages, msg];
      const { preview, ts } = lastPreview(messages);
      return {
        ...chat,
        messages,
        messageCount: messages.length,
        lastMessagePreview: preview,
        lastTs: ts,
      };
    });
  },

  editMessage: (chatId, messageId, text) => {
    updateChat(set, get, chatId, (chat) => {
      const messages = chat.messages.map((m) =>
        m.id === messageId ? { ...m, text, edited: true } : m,
      );
      const { preview, ts } = lastPreview(messages);
      return { ...chat, messages, lastMessagePreview: preview, lastTs: ts };
    });
  },

  deleteMessage: (chatId, messageId) => {
    updateChat(set, get, chatId, (chat) => {
      const messages = chat.messages.map((m) =>
        m.id === messageId ? { ...m, deleted: true, text: "" } : m,
      );
      const { preview, ts } = lastPreview(messages);
      return { ...chat, messages, lastMessagePreview: preview, lastTs: ts };
    });
  },

  toggleReaction: (chatId, messageId, emoji, by) => {
    updateChat(set, get, chatId, (chat) => {
      const existing = chat.reactions[messageId] ?? [];
      const already = existing.find((r) => r.by === by && r.emoji === emoji);
      let next: Reaction[];
      if (already) {
        next = existing.filter((r) => !(r.by === by && r.emoji === emoji));
      } else {
        next = [...existing.filter((r) => r.by !== by), { emoji, by }];
      }
      return { ...chat, reactions: { ...chat.reactions, [messageId]: next } };
    });
  },

  removeChatEntirely: (chatId) => {
    removeChat(chatId);
    set((s) => {
      const chats = { ...s.chats };
      delete chats[chatId];
      return {
        chats,
        index: s.index.filter((c) => c.id !== chatId),
        activeChatId: s.activeChatId === chatId ? null : s.activeChatId,
      };
    });
  },

  clearAllStorage: () => {
    clearStorageLib();
    set({
      chats: {},
      index: [],
      activeChatId: null,
      toast: "Storage cleared.",
    });
  },

  persist: (chatId) => {
    const chat = get().chats[chatId];
    if (!chat) return;
    const result = saveChat(chat);
    if (!result.ok) set({ toast: result.error ?? "Could not save chat." });
  },
}));

function toIndexEntry(chat: ChatData): ChatIndexEntry {
  const { messages: _m, reactions: _r, ...meta } = chat;
  return meta;
}

function updateChat(
  set: (
    fn:
      | ((s: ChatStoreState) => Partial<ChatStoreState>)
      | Partial<ChatStoreState>,
  ) => void,
  get: () => ChatStoreState,
  chatId: string,
  updater: (chat: ChatData) => ChatData,
) {
  const state = get();
  const chat = state.chats[chatId] ?? loadChat(chatId);
  if (!chat) return;
  const updated = { ...updater(chat), updatedAt: Date.now() };
  set((s) => ({
    chats: { ...s.chats, [chatId]: updated },
    index: [...s.index.filter((c) => c.id !== chatId), toIndexEntry(updated)],
  }));
  const result = saveChat(updated);
  if (!result.ok) set({ toast: result.error ?? "Could not save chat." });
}
