import type { ParseResult, RawMessage } from "@/types";

// Strip BOM + invisible bidi marks WhatsApp sometimes injects.
const INVISIBLE = /[\u200e\u200f\ufeff]/g;

// Android / most exports: "23/12/2024, 3:07 pm - Alex: text"
const ANDROID_RE =
  /^(\d{1,4}[/.\-]\d{1,4}[/.\-]\d{1,4}),\s?(\d{1,2}:\d{2}(?::\d{2})?(?:[\s\u202f]?[AaPp]\.?[Mm]\.?)?)\s?[-–]\s(.*)$/;

// iOS exports: "[23/12/2024, 3:07:00 PM] Alex: text"
const IOS_RE =
  /^\[(\d{1,4}[/.\-]\d{1,4}[/.\-]\d{1,4}),\s?(\d{1,2}:\d{2}(?::\d{2})?(?:[\s\u202f]?[AaPp]\.?[Mm]\.?)?)\]\s?(.*)$/;

const SENDER_RE = /^([^:\n]{1,42}):\s([\s\S]*)$/;

const MEDIA_RE = /^<[^<>]{1,80}>$/;

function detectMediaKind(text: string): string | undefined {
  const t = text.toLowerCase();
  if (t.includes("image") || t.includes("photo") || t.includes("imagen") || t.includes("immagine")) return "image";
  if (t.includes("video") || t.includes("vidéo")) return "video";
  if (t.includes("gif")) return "gif";
  if (t.includes("sticker") || t.includes("figurinha") || t.includes("autocollant")) return "sticker";
  if (t.includes("audio") || t.includes("voice") || t.includes("ptt") || t.includes("aufnahme")) return "audio";
  if (t.includes("document") || t.includes("documento")) return "document";
  if (t.includes("contact") || t.includes("contacto") || t.includes("vcard")) return "contact";
  return undefined;
}

function splitDateParts(datePart: string): [number, number, number] {
  const parts = datePart.split(/[/.\-]/).map((p) => parseInt(p, 10));
  return [parts[0] ?? 1, parts[1] ?? 1, parts[2] ?? 1970];
}

function normalizeYear(y: number): number {
  if (y < 100) return y < 70 ? 2000 + y : 1900 + y;
  return y;
}

function parseTime(timePart: string): { h: number; m: number; s: number } {
  const cleaned = timePart.replace(/[\u202f\u00a0]/g, " ").trim();
  const ampmMatch = cleaned.match(/([AaPp])\.?[Mm]\.?$/);
  const numeric = cleaned.replace(/[\s\u202f]?[AaPp]\.?[Mm]\.?$/, "").trim();
  const bits = numeric.split(":").map((n) => parseInt(n, 10));
  let h = bits[0] ?? 0;
  const m = bits[1] ?? 0;
  const s = bits[2] ?? 0;
  if (ampmMatch) {
    const isPM = ampmMatch[1].toLowerCase() === "p";
    if (isPM && h !== 12) h += 12;
    if (!isPM && h === 12) h = 0;
  }
  return { h, m, s };
}

interface DateSniff {
  dayFirst: boolean;
}

function sniffDateOrder(lines: string[]): DateSniff {
  let aOver12 = false;
  let bOver12 = false;
  let checked = 0;
  for (const line of lines) {
    if (checked > 300) break;
    const m = ANDROID_RE.exec(line) || IOS_RE.exec(line);
    if (!m) continue;
    const [a, b] = splitDateParts(m[1]);
    if (a > 12) aOver12 = true;
    if (b > 12) bOver12 = true;
    checked++;
  }
  // Default: day-first (most common globally). Switch only if evidence of US format.
  if (!aOver12 && bOver12) return { dayFirst: false };
  return { dayFirst: true };
}

function buildTimestamp(datePart: string, timePart: string, dayFirst: boolean): number {
  const [a, b, c] = splitDateParts(datePart);
  const year = normalizeYear(c);
  const day = dayFirst ? a : b;
  const month = dayFirst ? b : a;
  const { h, m, s } = parseTime(timePart);
  const d = new Date(year, Math.max(0, month - 1), day, h, m, s);
  return d.getTime();
}

export interface ParseChatOptions {
  onProgress?: (processed: number, total: number) => void;
}

/**
 * Parses raw WhatsApp export text into structured messages.
 * Processes in chunks (yielding to the event loop) so very large files
 * (multi-MB, 100k+ lines) don't freeze the UI.
 */
export async function parseChatFile(raw: string, opts: ParseChatOptions = {}): Promise<ParseResult> {
  const text = raw.replace(INVISIBLE, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n");
  const order = sniffDateOrder(lines.slice(0, 500));

  const messages: RawMessage[] = [];
  const participantSet = new Set<string>();

  let current: RawMessage | null = null;
  let id = 0;
  const total = lines.length;
  const CHUNK = 4000;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = ANDROID_RE.exec(line) || IOS_RE.exec(line);
    if (m) {
      if (current) messages.push(current);
      const ts = buildTimestamp(m[1], m[2], order.dayFirst);
      const rest = m[3];
      const senderMatch = SENDER_RE.exec(rest);
      let sender: string | null = null;
      let body = rest;
      if (senderMatch && !/\.\s/.test(senderMatch[1]) && senderMatch[1].trim().length > 0) {
        sender = senderMatch[1].trim();
        body = senderMatch[2];
      }
      const trimmedBody = body.trim();
      const isMedia = MEDIA_RE.test(trimmedBody);
      current = {
        id: id++,
        ts,
        sender,
        text: body,
        isMedia,
        mediaKind: isMedia ? detectMediaKind(trimmedBody) : undefined,
        system: sender === null,
      };
      if (sender) participantSet.add(sender);
    } else if (current) {
      current.text += "\n" + line;
    }
    // else: stray content before the first message — ignore

    if (i % CHUNK === 0 && i > 0) {
      opts.onProgress?.(i, total);
      // yield to event loop to keep UI responsive
      await new Promise((r) => setTimeout(r, 0));
    }
  }
  if (current) messages.push(current);
  opts.onProgress?.(total, total);

  return { messages, participants: Array.from(participantSet) };
}
