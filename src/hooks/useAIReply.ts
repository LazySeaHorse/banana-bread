import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatData } from "@/types";
import { useChatStore } from "@/store/useChatStore";
import { useAISettingsStore } from "@/store/useAISettingsStore";
import {
  getActiveProviderConfig,
  isProviderConfigured,
  PROVIDER_LABELS,
} from "@/lib/ai/settings";
import { generateReply, AIProviderError } from "@/lib/ai/providers";
import { buildPersonaPrompt, pickNextAIPersona } from "@/lib/ai/persona";

export interface UseAIReplyResult {
  /** True while an AI reply is actively being generated. */
  isGenerating: boolean;
  /** The persona currently being generated for, if any. */
  generatingPersona: string | null;
  /** True while auto-play (chained AI turns) is active. */
  isAutoPlaying: boolean;
  /** Message from the last failed generation attempt, if any. */
  error: string | null;
  /** Whether the active provider currently has an API key configured. */
  isConfigured: boolean;
  /**
   * Generate a single AI reply. If `persona` is omitted, the next persona in
   * the chat's AI rotation (based on turn order) is used.
   */
  generateFor: (persona?: string) => Promise<void>;
  /**
   * Start auto-play: keep chaining AI replies for as long as the next
   * participant in turn order is AI-controlled, pausing briefly between
   * turns so the conversation reads naturally.
   */
  startAutoPlay: () => void;
  /** Stop auto-play and/or cancel an in-flight generation request. */
  stop: () => void;
  /** Clear the last error message. */
  clearError: () => void;
}

const AUTO_PLAY_DELAY_MS = 1200;
/** Safety cap so an all-AI chat can't auto-play forever unattended. */
const AUTO_PLAY_MAX_TURNS = 40;

/**
 * Drives AI persona replies for a given chat: single one-off turns, or a
 * chained "auto-play" mode that keeps generating consecutive AI turns until
 * a human-controlled participant is next in rotation (or the user stops it).
 */
export function useAIReply(chat: ChatData | null | undefined): UseAIReplyResult {
  const addMessage = useChatStore((s) => s.addMessage);
  const aiSettings = useAISettingsStore((s) => s.settings);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingPersona, setGeneratingPersona] = useState<string | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const autoPlayRef = useRef(false);
  const autoPlayTurnsRef = useRef(0);
  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep a live ref to the current chat so async callbacks (which close over
  // stale props otherwise) always see the latest messages/personas.
  const chatRef = useRef(chat);
  chatRef.current = chat;

  const providerConfig = getActiveProviderConfig(aiSettings);
  const isConfigured = isProviderConfigured(aiSettings, aiSettings.activeProvider);

  const clearError = useCallback(() => setError(null), []);

  const stopAutoPlayFlag = useCallback(() => {
    autoPlayRef.current = false;
    autoPlayTurnsRef.current = 0;
    setIsAutoPlaying(false);
    if (delayTimeoutRef.current) {
      clearTimeout(delayTimeoutRef.current);
      delayTimeoutRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    stopAutoPlayFlag();
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsGenerating(false);
    setGeneratingPersona(null);
  }, [stopAutoPlayFlag]);

  // Stop any in-flight work if the active chat changes or this hook unmounts.
  useEffect(() => {
    return () => {
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat?.id]);

  const runOneTurn = useCallback(
    async (personaOverride?: string): Promise<boolean> => {
      const currentChat = chatRef.current;
      if (!currentChat) return false;

      const aiPersonas = currentChat.aiPersonas ?? [];
      const persona = personaOverride ?? pickNextAIPersona(aiPersonas, currentChat.messages);
      if (!persona) {
        setError("No AI-controlled participants selected. Pick some from this chat's info panel.");
        return false;
      }

      if (!providerConfig.apiKey.trim()) {
        setError(
          `No API key configured for ${PROVIDER_LABELS[aiSettings.activeProvider]}. Add one in Settings.`
        );
        return false;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setIsGenerating(true);
      setGeneratingPersona(persona);
      setError(null);

      try {
        const { systemPrompt, messages } = buildPersonaPrompt({
          persona,
          chat: currentChat,
          maxContextTokens: aiSettings.maxContextTokens,
        });

        const reply = await generateReply({
          provider: aiSettings.activeProvider,
          apiKey: providerConfig.apiKey,
          model: providerConfig.model,
          systemPrompt,
          messages,
          signal: controller.signal,
        });

        if (controller.signal.aborted) return false;

        const text = reply.trim();
        if (!text) {
          setError(`${persona} (AI) returned an empty reply.`);
          return false;
        }

        addMessage(currentChat.id, persona, text);
        return true;
      } catch (e) {
        if (controller.signal.aborted) return false;
        const message =
          e instanceof AIProviderError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Something went wrong generating a reply.";
        setError(message);
        return false;
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setIsGenerating(false);
        setGeneratingPersona(null);
      }
    },
    [addMessage, aiSettings, providerConfig]
  );

  const generateFor = useCallback(
    async (persona?: string) => {
      if (isGenerating || autoPlayRef.current) return;
      await runOneTurn(persona);
    },
    [isGenerating, runOneTurn]
  );

  const autoPlayStep = useCallback(async () => {
    if (!autoPlayRef.current) return;

    const currentChat = chatRef.current;
    if (!currentChat) {
      stopAutoPlayFlag();
      return;
    }

    if (autoPlayTurnsRef.current >= AUTO_PLAY_MAX_TURNS) {
      setError(`Stopped auto-play after ${AUTO_PLAY_MAX_TURNS} turns to avoid runaway usage. Start it again to continue.`);
      stopAutoPlayFlag();
      return;
    }

    const aiPersonas = currentChat.aiPersonas ?? [];
    const nextPersona = pickNextAIPersona(aiPersonas, currentChat.messages);
    if (!nextPersona) {
      stopAutoPlayFlag();
      return;
    }

    autoPlayTurnsRef.current += 1;
    const ok = await runOneTurn(nextPersona);
    if (!autoPlayRef.current) return;

    if (!ok) {
      // Stop on failure rather than looping silently on repeated errors.
      stopAutoPlayFlag();
      return;
    }

    delayTimeoutRef.current = setTimeout(() => {
      void autoPlayStep();
    }, AUTO_PLAY_DELAY_MS);
  }, [runOneTurn, stopAutoPlayFlag]);

  const startAutoPlay = useCallback(() => {
    const currentChat = chatRef.current;
    if (!currentChat) return;

    const aiPersonas = currentChat.aiPersonas ?? [];
    if (aiPersonas.length === 0) {
      setError("No AI-controlled participants selected. Pick some from this chat's info panel.");
      return;
    }
    if (autoPlayRef.current) return;

    autoPlayRef.current = true;
    autoPlayTurnsRef.current = 0;
    setIsAutoPlaying(true);
    setError(null);
    void autoPlayStep();
  }, [autoPlayStep]);

  return {
    isGenerating,
    generatingPersona,
    isAutoPlaying,
    error,
    isConfigured,
    generateFor,
    startAutoPlay,
    stop,
    clearError,
  };
}
