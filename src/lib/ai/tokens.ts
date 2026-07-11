/**
 * Lightweight, dependency-free token estimation.
 *
 * We don't ship a real tokenizer (tiktoken, etc.) because it would bloat the
 * single-file build. Instead we approximate token counts using a blend of
 * character and word heuristics that tends to track GPT/Gemini/Cohere style
 * BPE tokenizers reasonably well for typical chat text:
 *
 *   - English prose tends to average ~4 characters per token.
 *   - Very short/punctuation-heavy text (emoji, "lol", etc.) skews lower.
 *
 * This is only used for client-side budgeting (deciding how many chat
 * messages to include in a prompt), so perfect accuracy isn't required —
 * just a reasonably stable, monotonic estimate.
 */

const CHARS_PER_TOKEN = 4;

/**
 * Estimate the number of tokens a given string would consume.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;

  const trimmed = text.trim();
  if (!trimmed) return 0;

  // Word-based estimate: most tokenizers split roughly along word/punctuation
  // boundaries, with an average of somewhat more than 1 token per word once
  // you account for punctuation and sub-word splits.
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordEstimate = words.length * 1.3;

  // Character-based estimate as a sanity floor/ceiling companion.
  const charEstimate = trimmed.length / CHARS_PER_TOKEN;

  // Blend the two estimates and round up so we never under-budget.
  const blended = (wordEstimate + charEstimate) / 2;

  return Math.max(1, Math.ceil(blended));
}

/**
 * Estimate the total tokens for a list of strings (e.g. formatted chat
 * messages), including a small per-item overhead to account for role labels,
 * separators, and message framing that the real API request will add.
 */
export function estimateTokensForList(items: string[], perItemOverhead = 4): number {
  let total = 0;
  for (const item of items) {
    total += estimateTokens(item) + perItemOverhead;
  }
  return total;
}

/**
 * Given a list of items (ordered oldest-first) and a token budget, return the
 * largest suffix of items (i.e. the most recent messages) whose combined
 * estimated token count fits within the budget.
 *
 * This is the core primitive used to decide how much chat history to send to
 * an LLM per turn, based on the user's configured max context tokens.
 */
export function fitToTokenBudget<T>(
  items: T[],
  toText: (item: T) => string,
  maxTokens: number,
  perItemOverhead = 4
): T[] {
  if (items.length === 0 || maxTokens <= 0) return [];

  const result: T[] = [];
  let used = 0;

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    const cost = estimateTokens(toText(item)) + perItemOverhead;
    if (used + cost > maxTokens && result.length > 0) break;
    result.unshift(item);
    used += cost;
    if (used >= maxTokens) break;
  }

  return result;
}
