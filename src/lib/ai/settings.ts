export type AIProviderId = "gemini" | "openai" | "cohere" | "groq";

export interface ProviderConfig {
  apiKey: string;
  model: string;
}

export interface AISettings {
  activeProvider: AIProviderId;
  providers: Record<AIProviderId, ProviderConfig>;
  maxContextTokens: number;
}

export const PROVIDER_LABELS: Record<AIProviderId, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  cohere: "Cohere",
  groq: "Groq",
};

export const DEFAULT_MODELS: Record<AIProviderId, string> = {
  gemini: "gemini-3.5-flash",
  openai: "gpt-5-mini",
  cohere: "command-a-plus-05-2026",
  groq: "llama-3.3-70b-versatile",
};

export const PROVIDER_MODEL_OPTIONS: Record<AIProviderId, string[]> = {
  gemini: [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemma-4-31b-it",
    "gemma-4-26b-a4b-it",
    "gemma-4-12b-it",
    "gemma-4-4b-it",
  ],
  openai: [
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-5",
    "gpt-5.4-mini",
    "gpt-5.4",
    "gpt-5.6",
    "o4-mini",
    "o3",
  ],
  cohere: ["command-a-plus-05-2026", "command-r-plus", "command-r"],
  groq: [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "google/gemma-4-31b-it",
    "google/gemma-4-26b-a4b-it",
    "qwen/qwen3-32b",
  ],
};

export const DEFAULT_MAX_CONTEXT_TOKENS = 4000;
export const MIN_MAX_CONTEXT_TOKENS = 256;
export const MAX_MAX_CONTEXT_TOKENS = 128000;

const SETTINGS_KEY = "wadms:ai-settings:v1";

const PROVIDER_IDS: AIProviderId[] = ["gemini", "openai", "cohere", "groq"];

function emptyProviderConfig(provider: AIProviderId): ProviderConfig {
  return { apiKey: "", model: DEFAULT_MODELS[provider] };
}

export function defaultAISettings(): AISettings {
  const providers = {} as Record<AIProviderId, ProviderConfig>;
  for (const p of PROVIDER_IDS) providers[p] = emptyProviderConfig(p);
  return {
    activeProvider: "gemini",
    providers,
    maxContextTokens: DEFAULT_MAX_CONTEXT_TOKENS,
  };
}

function isProviderId(value: unknown): value is AIProviderId {
  return (
    typeof value === "string" && (PROVIDER_IDS as string[]).includes(value)
  );
}

function sanitizeProviderConfig(
  provider: AIProviderId,
  raw: unknown,
): ProviderConfig {
  const fallback = emptyProviderConfig(provider);
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Record<string, unknown>;
  return {
    apiKey: typeof obj.apiKey === "string" ? obj.apiKey : fallback.apiKey,
    model:
      typeof obj.model === "string" && obj.model.trim()
        ? obj.model
        : fallback.model,
  };
}

function sanitizeSettings(raw: unknown): AISettings {
  const defaults = defaultAISettings();
  if (!raw || typeof raw !== "object") return defaults;
  const obj = raw as Record<string, unknown>;

  const activeProvider = isProviderId(obj.activeProvider)
    ? obj.activeProvider
    : defaults.activeProvider;

  const providers = {} as Record<AIProviderId, ProviderConfig>;
  const rawProviders = (
    obj.providers && typeof obj.providers === "object" ? obj.providers : {}
  ) as Record<string, unknown>;
  for (const p of PROVIDER_IDS) {
    providers[p] = sanitizeProviderConfig(p, rawProviders[p]);
  }

  let maxContextTokens = defaults.maxContextTokens;
  if (
    typeof obj.maxContextTokens === "number" &&
    Number.isFinite(obj.maxContextTokens)
  ) {
    maxContextTokens = Math.min(
      MAX_MAX_CONTEXT_TOKENS,
      Math.max(MIN_MAX_CONTEXT_TOKENS, Math.round(obj.maxContextTokens)),
    );
  }

  return { activeProvider, providers, maxContextTokens };
}

export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaultAISettings();
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return defaultAISettings();
  }
}

export function saveAISettings(settings: AISettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors (e.g. quota exceeded, private browsing)
  }
}

export function getActiveProviderConfig(settings: AISettings): ProviderConfig {
  return (
    settings.providers[settings.activeProvider] ??
    emptyProviderConfig(settings.activeProvider)
  );
}

export function isProviderConfigured(
  settings: AISettings,
  provider: AIProviderId,
): boolean {
  return !!settings.providers[provider]?.apiKey.trim();
}
