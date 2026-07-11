import { PROVIDER_LABELS, type AIProviderId } from "@/lib/ai/settings";

/**
 * Unified, dependency-free client for calling LLM chat-completion style APIs
 * directly from the browser using the user's own (BYOK) API key.
 *
 * IMPORTANT: Because this app has no backend, API keys are used directly
 * from client-side JavaScript. That's an inherent tradeoff of a fully local,
 * serverless app — keys are stored in localStorage and only ever sent
 * directly to the provider's own API over HTTPS, never to any third party.
 * Users should be comfortable with that tradeoff (e.g. using low-quota /
 * restricted keys) before entering a key in Settings.
 */

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface GenerateReplyParams {
  provider: AIProviderId;
  apiKey: string;
  model: string;
  /** Persona / behavior instructions, sent as a system message. */
  systemPrompt: string;
  /** Conversation turns, oldest first. Any "system" entries are ignored. */
  messages: ChatMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export class AIProviderError extends Error {
  readonly provider: AIProviderId;
  readonly status?: number;

  constructor(provider: AIProviderId, message: string, status?: number) {
    super(message);
    this.name = "AIProviderError";
    this.provider = provider;
    this.status = status;
  }
}

const DEFAULT_TIMEOUT_MS = 45000;
const DEFAULT_TEMPERATURE = 0.9;

export async function generateReply(params: GenerateReplyParams): Promise<string> {
  const { provider, apiKey, model, systemPrompt, messages, maxOutputTokens, temperature, signal } = params;

  if (!apiKey?.trim()) {
    throw new AIProviderError(provider, "No API key configured for this provider. Add one in Settings.");
  }
  if (!model?.trim()) {
    throw new AIProviderError(provider, "No model configured for this provider. Pick one in Settings.");
  }

  const cleanMessages = messages.filter((m) => m.role !== "system" && m.content.trim().length > 0);
  if (cleanMessages.length === 0) {
    throw new AIProviderError(provider, "No conversation history available to respond to.");
  }

  const temp = temperature ?? DEFAULT_TEMPERATURE;

  try {
    switch (provider) {
      case "gemini":
        return await callGemini(apiKey, model, systemPrompt, cleanMessages, maxOutputTokens, temp, signal);
      case "openai":
        return await callOpenAICompatible(
          "openai",
          "https://api.openai.com/v1",
          apiKey,
          model,
          systemPrompt,
          cleanMessages,
          maxOutputTokens,
          temp,
          signal
        );
      case "groq":
        return await callOpenAICompatible(
          "groq",
          "https://api.groq.com/openai/v1",
          apiKey,
          model,
          systemPrompt,
          cleanMessages,
          maxOutputTokens,
          temp,
          signal
        );
      case "cohere":
        return await callCohere(apiKey, model, systemPrompt, cleanMessages, maxOutputTokens, temp, signal);
      default:
        throw new AIProviderError(provider, `Unsupported provider: ${provider}`);
    }
  } catch (e) {
    if (e instanceof AIProviderError) throw e;
    const message = e instanceof Error ? e.message : String(e);
    throw new AIProviderError(
      provider,
      `Could not reach ${PROVIDER_LABELS[provider]}: ${message}. This can happen if you're offline, the request timed out, or the provider is blocking direct browser requests.`
    );
  }
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  maxOutputTokens: number | undefined,
  temperature: number,
  signal: AbortSignal | undefined
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const body = {
    systemInstruction: systemPrompt.trim() ? { parts: [{ text: systemPrompt }] } : undefined,
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      maxOutputTokens,
      temperature,
    },
  };

  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    },
    signal
  );

  const data = await parseJsonResponse(res, "gemini");
  if (!res.ok) {
    throw new AIProviderError(
      "gemini",
      extractErrorMessage(data) ?? friendlyStatusMessage(res.status) ?? res.statusText,
      res.status
    );
  }

  const candidate = data?.candidates?.[0];
  if (!candidate) {
    const blockReason = data?.promptFeedback?.blockReason;
    throw new AIProviderError(
      "gemini",
      blockReason ? `Gemini blocked the request (${blockReason}).` : "Gemini returned no candidates."
    );
  }

  const parts = candidate.content?.parts ?? [];
  const text = parts
    .map((p: { text?: string }) => p.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new AIProviderError(
      "gemini",
      `Gemini returned an empty response (finishReason: ${candidate.finishReason ?? "unknown"}).`
    );
  }

  return text;
}

// ---------------------------------------------------------------------------
// OpenAI / Groq (both expose an OpenAI-compatible /chat/completions endpoint)
// ---------------------------------------------------------------------------

async function callOpenAICompatible(
  provider: AIProviderId,
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  maxOutputTokens: number | undefined,
  temperature: number,
  signal: AbortSignal | undefined
): Promise<string> {
  const url = `${baseUrl}/chat/completions`;

  const body = {
    model,
    messages: [
      ...(systemPrompt.trim() ? [{ role: "system", content: systemPrompt }] : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature,
    max_tokens: maxOutputTokens,
  };

  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    },
    signal
  );

  const data = await parseJsonResponse(res, provider);
  if (!res.ok) {
    throw new AIProviderError(
      provider,
      extractErrorMessage(data) ?? friendlyStatusMessage(res.status) ?? res.statusText,
      res.status
    );
  }

  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new AIProviderError(provider, "The provider returned an empty response.");
  }

  return text.trim();
}

// ---------------------------------------------------------------------------
// Cohere (v2 chat API)
// ---------------------------------------------------------------------------

async function callCohere(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[],
  maxOutputTokens: number | undefined,
  temperature: number,
  signal: AbortSignal | undefined
): Promise<string> {
  const url = "https://api.cohere.com/v2/chat";

  const body = {
    model,
    messages: [
      ...(systemPrompt.trim() ? [{ role: "system", content: systemPrompt }] : []),
      ...messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    ],
    max_tokens: maxOutputTokens,
    temperature,
  };

  const res = await fetchWithTimeout(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    },
    signal
  );

  const data = await parseJsonResponse(res, "cohere");
  if (!res.ok) {
    throw new AIProviderError(
      "cohere",
      extractErrorMessage(data) ?? friendlyStatusMessage(res.status) ?? res.statusText,
      res.status
    );
  }

  const parts = data?.message?.content;
  const text = Array.isArray(parts)
    ? parts
        .map((p: { text?: string }) => p?.text ?? "")
        .join("")
        .trim()
    : "";

  if (!text) {
    throw new AIProviderError("cohere", "Cohere returned an empty response.");
  }

  return text;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  externalSignal: AbortSignal | undefined,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error("Request timed out")), timeoutMs);

  const onExternalAbort = () => controller.abort(externalSignal?.reason);
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort(externalSignal.reason);
    else externalSignal.addEventListener("abort", onExternalAbort);
  }

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      if (reason instanceof Error) throw reason;
      throw new Error(typeof reason === "string" ? reason : "Request aborted");
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
    if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);
  }
}

async function parseJsonResponse(res: Response, provider: AIProviderId): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    if (!res.ok) {
      throw new AIProviderError(provider, text.slice(0, 300) || res.statusText, res.status);
    }
    throw new AIProviderError(provider, "Received a non-JSON response from the provider.");
  }
}

function extractErrorMessage(data: any): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  if (typeof data.message === "string" && data.message.trim()) return data.message;
  if (data.error) {
    if (typeof data.error === "string" && data.error.trim()) return data.error;
    if (typeof data.error.message === "string" && data.error.message.trim()) return data.error.message;
  }
  return undefined;
}

function friendlyStatusMessage(status: number): string | undefined {
  switch (status) {
    case 401:
    case 403:
      return "Authentication failed. Double check the API key in Settings.";
    case 404:
      return "Model not found. Double check the model name in Settings.";
    case 429:
      return "Rate limited by the provider. Wait a moment and try again.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "The provider's servers are having issues right now. Try again shortly.";
    default:
      return undefined;
  }
}
