import { gzipSync, gunzipSync, strToU8, strFromU8 } from "fflate";
import type { ChatData, ChatIndexEntry } from "@/types";

const INDEX_KEY = "wadms:index:v1";
const CHAT_PREFIX = "wadms:chat:v1:";

function u8ToBase64(u8: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < u8.length; i += chunkSize) {
    const chunk = u8.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToU8(b64: string): Uint8Array {
  const binary = atob(b64);
  const u8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) u8[i] = binary.charCodeAt(i);
  return u8;
}

export function compressJSON(data: unknown): string {
  const json = JSON.stringify(data);
  const gz = gzipSync(strToU8(json), { level: 6 });
  return u8ToBase64(gz);
}

export function decompressJSON<T>(b64: string): T {
  const gz = base64ToU8(b64);
  const json = strFromU8(gunzipSync(gz));
  return JSON.parse(json) as T;
}

export class StorageQuotaError extends Error {}

export function readIndex(): ChatIndexEntry[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const entries = JSON.parse(raw) as ChatIndexEntry[];
    for (const entry of entries) {
      if (!Array.isArray(entry.aiPersonas)) entry.aiPersonas = [];
    }
    return entries;
  } catch {
    return [];
  }
}

function writeIndex(entries: ChatIndexEntry[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
}

export function saveChat(chat: ChatData): { ok: boolean; error?: string } {
  try {
    const compressed = compressJSON(chat);
    localStorage.setItem(CHAT_PREFIX + chat.id, compressed);
    const index = readIndex().filter((c) => c.id !== chat.id);
    const { messages: _m, reactions: _r, ...meta } = chat;
    index.push(meta as ChatIndexEntry);
    writeIndex(index);
    return { ok: true };
  } catch (e) {
    const err = e as Error;
    const isQuota =
      err.name === "QuotaExceededError" ||
      err.message?.toLowerCase().includes("quota") ||
      err.message?.toLowerCase().includes("exceeded");
    return {
      ok: false,
      error: isQuota
        ? "Storage is full. Free up space in Settings (clear old chats) and try again."
        : `Could not save chat: ${err.message}`,
    };
  }
}

export function loadChat(id: string): ChatData | null {
  try {
    const raw = localStorage.getItem(CHAT_PREFIX + id);
    if (!raw) return null;
    const chat = decompressJSON<ChatData>(raw);
    if (!Array.isArray(chat.aiPersonas)) chat.aiPersonas = [];
    return chat;
  } catch {
    return null;
  }
}

export function removeChat(id: string) {
  localStorage.removeItem(CHAT_PREFIX + id);
  writeIndex(readIndex().filter((c) => c.id !== id));
}

export function clearAllStorage() {
  const index = readIndex();
  for (const c of index) localStorage.removeItem(CHAT_PREFIX + c.id);
  localStorage.removeItem(INDEX_KEY);
  // Also sweep any stray keys from this app just in case.
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key && key.startsWith("wadms:")) localStorage.removeItem(key);
  }
}

export function estimateStorageUsage(): { bytes: number; chats: number } {
  let bytes = 0;
  let chats = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("wadms:")) {
      bytes += (localStorage.getItem(key)?.length ?? 0) * 2;
      if (key.startsWith(CHAT_PREFIX)) chats++;
    }
  }
  return { bytes, chats };
}
