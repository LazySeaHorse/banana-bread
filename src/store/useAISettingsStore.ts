import { create } from "zustand";
import type { AIProviderId, AISettings, ProviderConfig } from "@/lib/ai/settings";
import {
  DEFAULT_MODELS,
  MAX_MAX_CONTEXT_TOKENS,
  MIN_MAX_CONTEXT_TOKENS,
  loadAISettings,
  saveAISettings,
} from "@/lib/ai/settings";

interface AISettingsStoreState {
  settings: AISettings;
  setActiveProvider: (provider: AIProviderId) => void;
  setProviderApiKey: (provider: AIProviderId, apiKey: string) => void;
  setProviderModel: (provider: AIProviderId, model: string) => void;
  setMaxContextTokens: (tokens: number) => void;
  resetProvider: (provider: AIProviderId) => void;
}

function clampTokens(tokens: number): number {
  if (!Number.isFinite(tokens)) return MIN_MAX_CONTEXT_TOKENS;
  return Math.min(MAX_MAX_CONTEXT_TOKENS, Math.max(MIN_MAX_CONTEXT_TOKENS, Math.round(tokens)));
}

export const useAISettingsStore = create<AISettingsStoreState>((set, get) => ({
  settings: loadAISettings(),

  setActiveProvider: (provider) => {
    const settings: AISettings = { ...get().settings, activeProvider: provider };
    set({ settings });
    saveAISettings(settings);
  },

  setProviderApiKey: (provider, apiKey) => {
    const current = get().settings;
    const providers: Record<AIProviderId, ProviderConfig> = {
      ...current.providers,
      [provider]: { ...current.providers[provider], apiKey },
    };
    const settings: AISettings = { ...current, providers };
    set({ settings });
    saveAISettings(settings);
  },

  setProviderModel: (provider, model) => {
    const current = get().settings;
    const trimmed = model.trim();
    const providers: Record<AIProviderId, ProviderConfig> = {
      ...current.providers,
      [provider]: { ...current.providers[provider], model: trimmed || DEFAULT_MODELS[provider] },
    };
    const settings: AISettings = { ...current, providers };
    set({ settings });
    saveAISettings(settings);
  },

  setMaxContextTokens: (tokens) => {
    const settings: AISettings = { ...get().settings, maxContextTokens: clampTokens(tokens) };
    set({ settings });
    saveAISettings(settings);
  },

  resetProvider: (provider) => {
    const current = get().settings;
    const providers: Record<AIProviderId, ProviderConfig> = {
      ...current.providers,
      [provider]: { apiKey: "", model: DEFAULT_MODELS[provider] },
    };
    const settings: AISettings = { ...current, providers };
    set({ settings });
    saveAISettings(settings);
  },
}));
