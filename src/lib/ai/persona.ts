import type { ChatData, RawMessage } from "@/types";
import type { ChatMessage } from "@/lib/ai/providers";
import { fitToTokenBudget } from "@/lib/ai/tokens";

/**
 * Turns raw WhatsApp-style chat history into a persona roleplay prompt for an
 * LLM: a system prompt describing who the model should "be", plus a list of
 * user/assistant turns built from the real conversation so far.
 *
 * The core idea: from the AI persona's point of view, everything *it* said is
 * an "assistant" turn, and everything anyone else said is a "user" turn
 * (prefixed with the sender's name so multi-person group chats stay legible).
 * This lets us reuse a single-persona chat completion API to simulate any one
 * participant, one at a time.
 */

export interface PersonaPromptOptions {
  /** The participant name the AI should imitate. */
  persona: string;
  /** The full chat this persona belongs to. */
  chat: ChatData;
  /** Max estimated tokens to spend on conversation history. */
  maxContextTokens: number;
  /** Optional extra instructions appended to the generated system prompt. */
  extraInstructions?: string;
}

export interface PersonaPromptResult {
  systemPrompt: string;
  messages: ChatMessage[];
}

const MAX_HISTORY_MESSAGES = 400;

/**
 * Build the system prompt that tells the model who to roleplay as.
 */
export function buildPersonaSystemPrompt(opts: {
  persona: string;
  participants: string[];
  chatTitle: string;
  extraInstructions?: string;
}): string {
  const { persona, participants, chatTitle, extraInstructions } = opts;
  const others = participants.filter((p) => p !== persona);
  const isGroup = participants.length > 2;

  const lines: string[] = [];

  lines.push(
    `You are roleplaying as "${persona}" in a real chat conversation${
      isGroup ? ` called "${chatTitle}"` : ""
    }.`,
  );

  if (isGroup) {
    lines.push(
      `This is a group chat. The other participants are: ${others.join(", ")}.`,
    );
  } else if (others.length === 1) {
    lines.push(`You are chatting one-on-one with "${others[0]}".`);
  }

  lines.push(
    "Study the tone, vocabulary, slang, punctuation habits, emoji usage, typical message length, and personality that " +
      `"${persona}" displays in the conversation history below, and reply exactly the way "${persona}" would — ` +
      "matching their voice as closely as possible.",
  );

  lines.push(
    "Write only the next chat message(s) that " +
      `"${persona}" would send next. Do not narrate, do not describe actions, and do not break character. ` +
      "Do not prefix your reply with your name or a role label — just write the message text itself, the way it " +
      "would actually appear in the chat.",
  );

  lines.push(
    "Keep replies casual and conversational, similar in length and style to this person's real messages — " +
      "usually short. If it feels natural for this person to split their thought into multiple short consecutive " +
      "texts, you may separate them with a newline, but don't overdo it.",
  );

  if (extraInstructions?.trim()) {
    lines.push(extraInstructions.trim());
  }

  return lines.join("\n\n");
}

function messageDisplayText(m: RawMessage): string {
  if (m.deleted) return "";
  if (m.system) return "";
  if (m.isMedia) {
    const caption = m.text.split("\n").slice(1).join(" ").trim();
    return caption ? `[sent media] ${caption}` : "[sent media]";
  }
  return m.text.trim();
}

/**
 * Convert raw chat history into ChatMessage turns from the point of view of
 * `persona`: their own messages become "assistant" turns, everyone else's
 * messages become "user" turns (annotated with sender name in group chats).
 */
function historyToTurns(
  persona: string,
  participants: string[],
  messages: RawMessage[],
): ChatMessage[] {
  const isGroup = participants.length > 2;
  const turns: ChatMessage[] = [];

  for (const m of messages) {
    if (m.system || m.deleted) continue;
    const text = messageDisplayText(m);
    if (!text) continue;

    if (m.sender === persona) {
      turns.push({ role: "assistant", content: text });
      continue;
    }

    const sender = m.sender ?? "Someone";
    const content = isGroup ? `${sender}: ${text}` : text;
    turns.push({ role: "user", content });
  }

  // Merge consecutive same-role turns into one message, since real chat
  // "runs" of messages from the same person are conceptually one turn and
  // this keeps the conversation shape closer to typical chat-completion
  // expectations (roles should generally alternate).
  const merged: ChatMessage[] = [];
  for (const turn of turns) {
    const last = merged[merged.length - 1];
    if (last && last.role === turn.role) {
      last.content = `${last.content}\n${turn.content}`;
    } else {
      merged.push({ ...turn });
    }
  }

  return merged;
}

/**
 * Build the full persona prompt (system prompt + budgeted conversation
 * history) ready to hand to an AI provider.
 */
export function buildPersonaPrompt(
  opts: PersonaPromptOptions,
): PersonaPromptResult {
  const { persona, chat, maxContextTokens, extraInstructions } = opts;

  const systemPrompt = buildPersonaSystemPrompt({
    persona,
    participants: chat.participants,
    chatTitle: chat.title,
    extraInstructions,
  });

  // Only look at a bounded window of the most recent raw messages before
  // turning them into turns, so extremely long chat histories don't cost a
  // lot of time to process on every AI turn.
  const recentRaw = chat.messages.slice(-MAX_HISTORY_MESSAGES);
  const allTurns = historyToTurns(persona, chat.participants, recentRaw);

  const systemPromptTokenOverhead = Math.ceil(systemPrompt.length / 4) + 8;
  const budget = Math.max(0, maxContextTokens - systemPromptTokenOverhead);

  const messages = fitToTokenBudget(allTurns, (t) => t.content, budget);

  // The API expects turns to start with a "user" message (most providers
  // will error or behave oddly otherwise). Drop any leading assistant turns
  // left over after budgeting/truncation.
  let startIndex = 0;
  while (startIndex < messages.length && messages[startIndex].role !== "user") {
    startIndex++;
  }

  return { systemPrompt, messages: messages.slice(startIndex) };
}

/**
 * Given the list of AI-controlled persona names and the chat's message
 * history, determine which persona should generate the next message.
 *
 * Turn order is round-robin based on the order personas appear in
 * `aiPersonas`, continuing from whoever sent the most recent eligible
 * message. If the most recent real message wasn't sent by any persona in
 * the rotation (e.g. a human "me" message), turn order restarts from the
 * first persona in the list.
 */
export function pickNextAIPersona(
  aiPersonas: string[],
  messages: RawMessage[],
): string | null {
  if (aiPersonas.length === 0) return null;

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.system || m.deleted) continue;
    if (!m.sender) continue;

    const idx = aiPersonas.indexOf(m.sender);
    if (idx !== -1) {
      return aiPersonas[(idx + 1) % aiPersonas.length];
    }

    // Most recent real message came from someone outside the AI rotation
    // (e.g. the human user) — restart the rotation from the top.
    break;
  }

  return aiPersonas[0];
}
