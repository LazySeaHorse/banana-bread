import { useMemo } from "react";
import { X, Check, Trash2, Bot } from "lucide-react";
import type { ChatData } from "@/types";
import { Avatar } from "@/components/Avatar";
import { computeStats } from "@/lib/stats";
import { formatFullDate, WEEKDAY_LABELS } from "@/lib/date";
import { BUBBLE_THEMES } from "@/lib/colors";
import { useChatStore } from "@/store/useChatStore";
import { cn } from "@/utils/cn";

function Bar({ pct, color }: { pct: number; color?: string }) {
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.max(pct, 2)}%`,
          background: color ?? "linear-gradient(90deg,#5B51D8,#E1306C)",
        }}
      />
    </div>
  );
}

export function AboutChatModal({
  chat,
  onClose,
}: {
  chat: ChatData;
  onClose: () => void;
}) {
  const setMe = useChatStore((s) => s.setMe);
  const setTheme = useChatStore((s) => s.setTheme);
  const setAIPersonas = useChatStore((s) => s.setAIPersonas);
  const removeChatEntirely = useChatStore((s) => s.removeChatEntirely);
  const stats = useMemo(() => computeStats(chat), [chat]);

  const aiPersonas = chat.aiPersonas ?? [];
  const allSelected =
    chat.participants.length > 0 &&
    aiPersonas.length === chat.participants.length;

  const togglePersona = (name: string) => {
    const next = aiPersonas.includes(name)
      ? aiPersonas.filter((p) => p !== name)
      : [...aiPersonas, name];
    setAIPersonas(chat.id, next);
  };

  const toggleAll = () => {
    setAIPersonas(chat.id, allSelected ? [] : [...chat.participants]);
  };

  const maxHour = Math.max(...stats.hourHistogram, 1);
  const maxWeekday = Math.max(...stats.weekdayHistogram, 1);

  return (
    <div className="fixed inset-0 z-40 flex items-stretch justify-end bg-black/30 md:items-center md:justify-center">
      <div className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-white shadow-2xl md:h-[88vh] md:rounded-2xl">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-neutral-100 bg-white px-4 py-3">
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-900"
          >
            <X size={20} />
          </button>
          <h2 className="text-[15px] font-semibold">Chat info</h2>
        </div>

        <div className="flex flex-col items-center gap-2 border-b border-neutral-100 px-4 py-6">
          <Avatar name={chat.title} size={72} />
          <div className="text-lg font-semibold">{chat.title}</div>
          <div className="text-xs text-neutral-400">
            {formatFullDate(stats.firstTs)} — {formatFullDate(stats.lastTs)} ·{" "}
            {stats.durationDays} days
          </div>
        </div>

        {/* who am i */}
        <section className="border-b border-neutral-100 px-4 py-4">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Who are you?
          </h3>
          <div className="flex flex-col gap-1">
            {chat.participants.map((p) => (
              <button
                key={p}
                onClick={() => setMe(chat.id, chat.me === p ? null : p)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-neutral-50",
                  chat.me === p && "bg-neutral-50",
                )}
              >
                <Avatar name={p} size={34} />
                <span className="flex-1 text-sm font-medium text-neutral-800">
                  {p}
                </span>
                {chat.me === p && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-white">
                    <Check size={12} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* AI personas */}
        <section className="border-b border-neutral-100 px-4 py-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              <Bot size={13} /> AI-controlled
            </h3>
            <button
              onClick={toggleAll}
              className="text-[11px] font-medium text-neutral-500 hover:text-neutral-800"
            >
              {allSelected ? "Select none" : "Select all"}
            </button>
          </div>
          <p className="mb-2 text-xs text-neutral-400">
            Pick which participants the AI should write messages as. Configure
            your API key and model in Settings.
          </p>
          <div className="flex flex-col gap-1">
            {chat.participants.map((p) => {
              const isAI = aiPersonas.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => togglePersona(p)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-neutral-50",
                    isAI && "bg-neutral-50",
                  )}
                >
                  <Avatar name={p} size={34} />
                  <span className="flex-1 text-sm font-medium text-neutral-800">
                    {p}
                  </span>
                  {isAI && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#5B51D8] to-[#E1306C] text-white">
                      <Bot size={12} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* theme */}
        <section className="border-b border-neutral-100 px-4 py-4">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Bubble color
          </h3>
          <div className="flex flex-wrap gap-2">
            {BUBBLE_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(chat.id, t)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full ring-2 ring-offset-2",
                  chat.theme.id === t.id
                    ? "ring-neutral-800"
                    : "ring-transparent",
                )}
                title={t.label}
                style={{
                  background: `linear-gradient(135deg, ${t.meFrom}, ${t.meTo})`,
                }}
              >
                {chat.theme.id === t.id && (
                  <Check size={16} className="text-white" />
                )}
              </button>
            ))}
          </div>
          <CustomGradientPicker
            chatId={chat.id}
            theme={chat.theme}
            onChange={(t) => setTheme(chat.id, t)}
          />
        </section>

        {/* overview */}
        <section className="grid grid-cols-3 gap-2 border-b border-neutral-100 px-4 py-4 text-center">
          <Stat label="Messages" value={stats.totalMessages.toLocaleString()} />
          <Stat label="Words" value={stats.totalWords.toLocaleString()} />
          <Stat label="Media" value={stats.mediaCount.toLocaleString()} />
          <Stat label="Avg/day" value={stats.avgPerDay.toFixed(1)} />
          <Stat label="Participants" value={String(chat.participants.length)} />
          <Stat label="Days active" value={String(stats.durationDays)} />
        </section>

        {/* per participant */}
        <section className="border-b border-neutral-100 px-4 py-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Messages by participant
          </h3>
          <div className="flex flex-col gap-3">
            {stats.participants.map((p) => (
              <div key={p.name} className="flex items-center gap-2">
                <Avatar name={p.name} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-baseline justify-between text-xs">
                    <span className="truncate font-medium text-neutral-700">
                      {p.name}
                    </span>
                    <span className="text-neutral-400">
                      {p.count.toLocaleString()} · {p.pct.toFixed(0)}%
                    </span>
                  </div>
                  <Bar pct={p.pct} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* hour histogram */}
        <section className="border-b border-neutral-100 px-4 py-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Activity by hour
          </h3>
          <div className="flex h-16 items-end gap-0.5">
            {stats.hourHistogram.map((v, h) => (
              <div
                key={h}
                title={`${h}:00 — ${v} messages`}
                className="flex-1 rounded-t bg-gradient-to-t from-[#5B51D8] to-[#E1306C]"
                style={{
                  height: `${(v / maxHour) * 100}%`,
                  minHeight: v > 0 ? 3 : 1,
                  opacity: v > 0 ? 1 : 0.15,
                }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-neutral-300">
            <span>12am</span>
            <span>12pm</span>
            <span>11pm</span>
          </div>
        </section>

        {/* weekday histogram */}
        <section className="border-b border-neutral-100 px-4 py-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Activity by weekday
          </h3>
          <div className="flex h-16 items-end gap-1.5">
            {stats.weekdayHistogram.map((v, d) => (
              <div key={d} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-gradient-to-t from-[#2193b0] to-[#6dd5ed]"
                  style={{
                    height: `${(v / maxWeekday) * 48}px`,
                    minHeight: v > 0 ? 3 : 1,
                    opacity: v > 0 ? 1 : 0.15,
                  }}
                />
                <span className="text-[9px] text-neutral-400">
                  {WEEKDAY_LABELS[d]}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* emojis */}
        {stats.topEmojis.length > 0 && (
          <section className="border-b border-neutral-100 px-4 py-4">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Top emoji
            </h3>
            <div className="flex flex-wrap gap-2">
              {stats.topEmojis.map((e) => (
                <div
                  key={e.emoji}
                  className="flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-sm"
                >
                  <span>{e.emoji}</span>
                  <span className="text-xs text-neutral-500">{e.count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* fun facts */}
        <section className="border-b border-neutral-100 px-4 py-4 text-sm text-neutral-600">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Fun facts
          </h3>
          {stats.mostActiveDay && (
            <p className="mb-1">
              🔥 Most active day:{" "}
              <b>{new Date(stats.mostActiveDay.date).toLocaleDateString()}</b>{" "}
              with {stats.mostActiveDay.count} messages
            </p>
          )}
          {stats.longest && (
            <p>
              ✍️ Longest message by <b>{stats.longest.sender}</b> (
              {stats.longest.length} chars)
            </p>
          )}
        </section>

        <section className="px-4 py-4">
          <button
            onClick={() => {
              removeChatEntirely(chat.id);
              onClose();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            <Trash2 size={16} /> Delete this chat
          </button>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-neutral-50 px-2 py-3">
      <div className="text-base font-semibold text-neutral-900">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-neutral-400">
        {label}
      </div>
    </div>
  );
}

function CustomGradientPicker({
  theme,
  onChange,
}: {
  chatId: string;
  theme: ChatData["theme"];
  onChange: (t: ChatData["theme"]) => void;
}) {
  return (
    <div className="mt-3 flex items-center gap-3 rounded-xl bg-neutral-50 p-2.5">
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={theme.meFrom}
          onChange={(e) =>
            onChange({
              ...theme,
              id: "custom",
              label: "Custom",
              meFrom: e.target.value,
            })
          }
          className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
        />
        <input
          type="color"
          value={theme.meTo}
          onChange={(e) =>
            onChange({
              ...theme,
              id: "custom",
              label: "Custom",
              meTo: e.target.value,
            })
          }
          className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
        />
      </div>
      <span className="text-xs text-neutral-500">Pick custom colors</span>
      <div
        className="ml-auto h-7 w-14 rounded-full"
        style={{
          background: `linear-gradient(135deg, ${theme.meFrom}, ${theme.meTo})`,
        }}
      />
    </div>
  );
}
