import { useState } from "react";
import {
  X,
  Trash2,
  HardDrive,
  AlertTriangle,
  Bot,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { useChatStore } from "@/store/useChatStore";
import { useAISettingsStore } from "@/store/useAISettingsStore";
import { estimateStorageUsage } from "@/lib/storage";
import {
  PROVIDER_LABELS,
  PROVIDER_MODEL_OPTIONS,
  MIN_MAX_CONTEXT_TOKENS,
  MAX_MAX_CONTEXT_TOKENS,
  type AIProviderId,
} from "@/lib/ai/settings";
import { cn } from "@/utils/cn";

const PROVIDER_IDS: AIProviderId[] = ["gemini", "openai", "cohere", "groq"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const clearAllStorage = useChatStore((s) => s.clearAllStorage);
  const index = useChatStore((s) => s.index);
  const [confirming, setConfirming] = useState(false);
  const usage = estimateStorageUsage();

  const aiSettings = useAISettingsStore((s) => s.settings);
  const setActiveProvider = useAISettingsStore((s) => s.setActiveProvider);
  const setProviderApiKey = useAISettingsStore((s) => s.setProviderApiKey);
  const setProviderModel = useAISettingsStore((s) => s.setProviderModel);
  const setMaxContextTokens = useAISettingsStore((s) => s.setMaxContextTokens);

  const [activeTab, setActiveTab] = useState<AIProviderId>(
    aiSettings.activeProvider,
  );
  const [showKey, setShowKey] = useState(false);
  const [customModel, setCustomModel] = useState(false);

  const activeConfig = aiSettings.providers[activeTab];
  const modelOptions = PROVIDER_MODEL_OPTIONS[activeTab];
  const isKnownModel = modelOptions.includes(activeConfig.model);

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-black/30 md:items-center md:justify-center">
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl md:h-auto md:max-h-[85vh] md:rounded-2xl">
        <div className="sticky top-0 flex items-center gap-3 border-b border-neutral-100 bg-white px-4 py-3">
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-900"
          >
            <X size={20} />
          </button>
          <h2 className="text-[15px] font-semibold">Settings</h2>
        </div>

        <section className="border-b border-neutral-100 px-4 py-4">
          <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            <HardDrive size={13} /> Storage
          </h3>
          <p className="text-sm text-neutral-600">
            {index.length} chat{index.length === 1 ? "" : "s"} saved locally,
            using approximately <b>{formatBytes(usage.bytes)}</b> of browser
            storage (gzip compressed).
          </p>
        </section>

        <section className="border-b border-neutral-100 px-4 py-4">
          <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            <Bot size={13} /> AI personas
          </h3>
          <p className="mb-3 text-sm text-neutral-600">
            Bring your own API key to have an AI write messages as one or more
            people in a chat. Pick which provider to use, then choose which
            participants are AI-controlled from that chat's info panel.
          </p>

          <div className="mb-3 flex gap-1 rounded-xl bg-neutral-100 p-1">
            {PROVIDER_IDS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setActiveTab(p);
                  setShowKey(false);
                  setCustomModel(false);
                }}
                className={cn(
                  "flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                  activeTab === p
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800",
                )}
              >
                {PROVIDER_LABELS[p]}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 rounded-xl bg-neutral-50 p-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-neutral-600">
                API key
              </span>
              <div className="flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-2 ring-1 ring-neutral-200 focus-within:ring-neutral-400">
                <KeyRound size={14} className="shrink-0 text-neutral-400" />
                <input
                  type={showKey ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  value={activeConfig.apiKey}
                  onChange={(e) => setProviderApiKey(activeTab, e.target.value)}
                  placeholder={`Your ${PROVIDER_LABELS[activeTab]} API key`}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="shrink-0 text-neutral-400 hover:text-neutral-700"
                  title={showKey ? "Hide key" : "Show key"}
                >
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-neutral-600">
                Model
              </span>
              {customModel || !isKnownModel ? (
                <input
                  type="text"
                  value={activeConfig.model}
                  onChange={(e) => setProviderModel(activeTab, e.target.value)}
                  placeholder="Model name"
                  className="rounded-lg bg-white px-2.5 py-2 text-sm outline-none ring-1 ring-neutral-200 focus:ring-neutral-400"
                />
              ) : (
                <select
                  value={activeConfig.model}
                  onChange={(e) => setProviderModel(activeTab, e.target.value)}
                  className="rounded-lg bg-white px-2.5 py-2 text-sm outline-none ring-1 ring-neutral-200 focus:ring-neutral-400"
                >
                  {modelOptions.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={() => setCustomModel((v) => !v)}
                className="self-start text-[11px] text-neutral-400 hover:text-neutral-700"
              >
                {customModel || !isKnownModel
                  ? "Choose from list instead"
                  : "Enter a custom model name"}
              </button>
            </label>

            <label className="flex items-center gap-2 pt-1">
              <input
                type="radio"
                name="active-provider"
                checked={aiSettings.activeProvider === activeTab}
                onChange={() => setActiveProvider(activeTab)}
                className="h-3.5 w-3.5"
              />
              <span className="text-xs text-neutral-600">
                Use <b>{PROVIDER_LABELS[activeTab]}</b> for AI personas
              </span>
            </label>
          </div>

          <div className="mt-3 flex flex-col gap-1.5 rounded-xl bg-neutral-50 p-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium text-neutral-600">
                Max context tokens per AI turn
              </span>
              <span className="text-xs font-semibold text-neutral-800">
                {aiSettings.maxContextTokens.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={MIN_MAX_CONTEXT_TOKENS}
              max={MAX_MAX_CONTEXT_TOKENS}
              step={256}
              value={aiSettings.maxContextTokens}
              onChange={(e) => setMaxContextTokens(Number(e.target.value))}
              className="w-full accent-neutral-800"
            />
            <p className="text-[11px] text-neutral-400">
              Controls roughly how much recent chat history is sent to the model
              on each AI-generated reply. Higher values give the AI more context
              (better continuity) but cost more per request and may hit provider
              limits.
            </p>
          </div>

          <p className="mt-3 text-[11px] text-neutral-400">
            Keys are stored only in this browser's local storage and sent
            directly to the provider's API — never to any other server. Anyone
            with access to this browser/device could read them, so avoid using
            high-privilege keys.
          </p>
        </section>

        <section className="px-4 py-4">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Danger zone
          </h3>
          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              <Trash2 size={16} /> Clear all local storage
            </button>
          ) : (
            <div className="rounded-xl bg-red-50 p-3">
              <p className="mb-3 flex items-start gap-2 text-sm text-red-700">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                This deletes every imported chat, edit, and reaction from this
                browser. This can't be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirming(false)}
                  className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-medium text-neutral-600 ring-1 ring-neutral-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    clearAllStorage();
                    setConfirming(false);
                    onClose();
                  }}
                  className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Yes, clear everything
                </button>
              </div>
            </div>
          )}
        </section>

        <p className="px-4 pb-4 text-center text-[11px] text-neutral-300">
          Chats never leave your browser — everything is parsed and stored
          locally.
        </p>
      </div>
    </div>
  );
}
