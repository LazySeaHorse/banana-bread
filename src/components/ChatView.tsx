import { useMemo, useRef, useState, useEffect } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import {
  ArrowLeft,
  Info,
  Search,
  Bot,
  Sparkles,
  Play,
  Square,
  Loader2,
  AlertCircle,
  X,
  GitBranch,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ChatData, RawMessage, ActiveThread } from "@/types";
import { Avatar } from "@/components/Avatar";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageInput } from "@/components/MessageInput";
import { SearchPanel } from "@/components/SearchPanel";
import { formatDay, formatFullDate, formatTime } from "@/lib/date";
import { useChatStore } from "@/store/useChatStore";
import { useAIReply } from "@/hooks/useAIReply";
import { computeActiveThreads } from "@/lib/stats";
import { cn } from "@/utils/cn";

type FeedItem =
  | { type: "separator"; key: string; label: string }
  | {
      type: "message";
      key: string;
      message: RawMessage;
      groupedWithPrev: boolean;
      groupedWithNext: boolean;
      showAvatar: boolean;
      showSenderName: boolean;
    }
  | {
      type: "thread";
      key: string;
      thread: ActiveThread;
      messages: RawMessage[];
    }
  | {
      type: "non-thread-group";
      key: string;
      messages: RawMessage[];
    };

const GROUP_WINDOW_MS = 5 * 60 * 1000;

const VirtuosoComponents = {
  Header: () => <div className="h-3" />,
  Footer: () => <div className="h-3" />,
};

export function ChatView({
  chat,
  onBack,
  onOpenAbout,
}: {
  chat: ChatData;
  onBack: () => void;
  onOpenAbout: () => void;
}) {
  const editMessage = useChatStore((s) => s.editMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const toggleReaction = useChatStore((s) => s.toggleReaction);
  const addMessage = useChatStore((s) => s.addMessage);
  const jumpTargetId = useChatStore((s) => s.jumpTargetId);
  const setJumpTargetId = useChatStore((s) => s.setJumpTargetId);

  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<number | null>(null);
  const [sendAs, setSendAs] = useState(chat.me || chat.participants[0] || "Me");
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const aiPersonas = chat.aiPersonas ?? [];
  const hasAIPersonas = aiPersonas.length > 0;
  const ai = useAIReply(chat);

  useEffect(() => {
    setSendAs(chat.me || chat.participants[0] || "Me");
  }, [chat.id, chat.me]);

  const [threadedView, setThreadedView] = useState(false);

  const threadInfo = useMemo(() => {
    if (!threadedView) {
      return {
        activeThreads: [],
        msgIdToThread: new Map<number, ActiveThread>(),
        threadIdMap: new Map<string, ActiveThread>(),
      };
    }
    const activeThreads = computeActiveThreads(chat);
    const msgIdToThread = new Map<number, ActiveThread>();
    const threadIdMap = new Map<string, ActiveThread>();
    for (const t of activeThreads) {
      threadIdMap.set(t.id, t);
      for (const mId of t.messageIds) {
        msgIdToThread.set(mId, t);
      }
    }
    return { activeThreads, msgIdToThread, threadIdMap };
  }, [chat, threadedView]);

  const feedItems = useMemo<FeedItem[]>(() => {
    if (!threadedView) {
      const items: FeedItem[] = [];
      let lastDay: string | null = null;
      for (let i = 0; i < chat.messages.length; i++) {
        const m = chat.messages[i];
        if (!Number.isNaN(m.ts) && m.ts) {
          const dayKey = new Date(m.ts).toDateString();
          if (dayKey !== lastDay) {
            items.push({
              type: "separator",
              key: `sep-${m.ts}-${i}`,
              label: formatDay(m.ts),
            });
            lastDay = dayKey;
          }
        }
        const prev = chat.messages[i - 1];
        const next = chat.messages[i + 1];
        const groupedWithPrev = !!(
          prev &&
          !prev.system &&
          !m.system &&
          prev.sender === m.sender &&
          m.ts - prev.ts < GROUP_WINDOW_MS
        );
        const groupedWithNext = !!(
          next &&
          !next.system &&
          !m.system &&
          next.sender === m.sender &&
          next.ts - m.ts < GROUP_WINDOW_MS
        );
        items.push({
          type: "message",
          key: `m-${m.id}`,
          message: m,
          groupedWithPrev,
          groupedWithNext,
          showAvatar: !groupedWithNext,
          showSenderName: !groupedWithPrev && chat.participants.length > 2,
        });
      }
      return items;
    } else {
      const items: FeedItem[] = [];
      const renderedThreads = new Set<string>();
      let lastDay: string | null = null;

      for (let i = 0; i < chat.messages.length; i++) {
        const m = chat.messages[i];
        if (m.system || m.deleted) continue;

        const thread = threadInfo.msgIdToThread.get(m.id);
        if (thread) {
          if (!renderedThreads.has(thread.id)) {
            renderedThreads.add(thread.id);

            // Add date separator if date changes
            if (!Number.isNaN(thread.startTs) && thread.startTs) {
              const dayKey = new Date(thread.startTs).toDateString();
              if (dayKey !== lastDay) {
                items.push({
                  type: "separator",
                  key: `sep-thread-${thread.id}`,
                  label: formatDay(thread.startTs),
                });
                lastDay = dayKey;
              }
            }

            // Push the thread item
            items.push({
              type: "thread",
              key: `thread-container-${thread.id}`,
              thread,
              messages: chat.messages.filter((msg) => thread.messageIds.includes(msg.id)),
            });
          }
        } else {
          // Non-thread message (consecutive grouping)
          const lastItem = items[items.length - 1];
          if (lastItem && lastItem.type === "non-thread-group") {
            lastItem.messages.push(m);
          } else {
            if (!Number.isNaN(m.ts) && m.ts) {
              const dayKey = new Date(m.ts).toDateString();
              if (dayKey !== lastDay) {
                items.push({
                  type: "separator",
                  key: `sep-${m.ts}-${i}`,
                  label: formatDay(m.ts),
                });
                lastDay = dayKey;
              }
            }
            items.push({
              type: "non-thread-group",
              key: `non-thread-group-${m.id}`,
              messages: [m],
            });
          }
        }
      }
      return items;
    }
  }, [chat.messages, chat.participants.length, threadedView, threadInfo]);

  const messageIndexById = useMemo(() => {
    const map = new Map<number, number>();
    feedItems.forEach((item, idx) => {
      if (item.type === "message") {
        map.set(item.message.id, idx);
      } else if (item.type === "non-thread-group") {
        for (const msg of item.messages) {
          map.set(msg.id, idx);
        }
      } else if (item.type === "thread") {
        for (const mId of item.thread.messageIds) {
          map.set(mId, idx);
        }
      }
    });
    return map;
  }, [feedItems]);

  const handleJump = (messageId: number) => {
    const idx = messageIndexById.get(messageId);
    if (idx === undefined) return;
    setHighlightId(messageId);
    requestAnimationFrame(() => {
      virtuosoRef.current?.scrollToIndex({
        index: idx,
        align: "center",
        behavior: "auto",
      });
    });
    setTimeout(() => setHighlightId(null), 1800);
  };

  useEffect(() => {
    if (jumpTargetId !== null) {
      handleJump(jumpTargetId);
      setJumpTargetId(null);
    }
  }, [jumpTargetId, setJumpTargetId]);

  const isGroup = chat.participants.length > 2;
  const headerName = chat.title;

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-white">
      {/* header */}
      <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2.5">
        <button onClick={onBack} className="p-1 text-neutral-700 md:hidden">
          <ArrowLeft size={22} />
        </button>
        <button
          className="flex min-w-0 flex-1 items-center gap-2.5"
          onClick={onOpenAbout}
        >
          <Avatar name={headerName} size={36} />
          <div className="min-w-0 text-left">
            <div className="flex items-center gap-1.5 truncate text-[14px] font-semibold text-neutral-900">
              {headerName}
              {hasAIPersonas && (
                <span
                  title={`AI-controlled: ${aiPersonas.join(", ")}`}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5B51D8] to-[#E1306C] text-white"
                >
                  <Bot size={10} />
                </span>
              )}
            </div>
            <div className="truncate text-[11.5px] text-neutral-400">
              {ai.isGenerating && ai.generatingPersona
                ? `${ai.generatingPersona} is typing…`
                : isGroup
                  ? `${chat.participants.length} participants`
                  : chat.me
                    ? "Active"
                    : "Tap for chat info"}
            </div>
          </div>
        </button>
        {hasAIPersonas && (
          <button
            onClick={() => (ai.isAutoPlaying ? ai.stop() : ai.startAutoPlay())}
            className={`rounded-full p-1.5 ${
              ai.isAutoPlaying
                ? "bg-neutral-900 text-white"
                : "text-neutral-700 hover:text-black"
            }`}
            title={
              ai.isAutoPlaying ? "Stop AI auto-play" : "Auto-play AI replies"
            }
          >
            {ai.isAutoPlaying ? <Square size={18} /> : <Play size={18} />}
          </button>
        )}
        <button
          onClick={() => setThreadedView(!threadedView)}
          className={`p-1.5 rounded-full transition-all border ${
            threadedView
              ? "bg-amber-100 border-amber-200 text-amber-800 hover:bg-amber-200"
              : "bg-white border-transparent text-neutral-700 hover:text-black hover:bg-neutral-100"
          }`}
          title={threadedView ? "Switch to standard view" : "Switch to condensed thread view"}
        >
          <GitBranch size={20} />
        </button>
        <button
          onClick={() => setSearchOpen(true)}
          className="p-1.5 text-neutral-700 hover:text-black"
        >
          <Search size={20} />
        </button>
        <button
          onClick={onOpenAbout}
          className="p-1.5 text-neutral-700 hover:text-black"
        >
          <Info size={20} />
        </button>
      </div>

      {/* messages */}
      <div className="relative min-h-0 flex-1">
        <Virtuoso
          ref={virtuosoRef}
          data={feedItems}
          initialTopMostItemIndex={feedItems.length - 1}
          followOutput="smooth"
          className="h-full"
          components={VirtuosoComponents}
          itemContent={(_, item) => {
            if (item.type === "separator") {
              return (
                <div className="flex justify-center py-2">
                  <span className="rounded-full bg-neutral-100 px-3 py-1 text-[11px] font-medium text-neutral-500">
                    {item.label}
                  </span>
                </div>
              );
            }
            if (item.type === "thread") {
              return (
                <ThreadContainer
                  thread={item.thread}
                  messages={item.messages}
                  chat={chat}
                  highlightId={highlightId}
                  sendAs={sendAs}
                />
              );
            }
            if (item.type === "non-thread-group") {
              return (
                <NonThreadGroup
                  messages={item.messages}
                  chat={chat}
                  highlightId={highlightId}
                />
              );
            }
            const m = item.message;
            const mine = chat.me !== null && m.sender === chat.me;
            return (
              <MessageBubble
                message={m}
                mine={mine}
                showAvatar={item.showAvatar}
                showSenderName={item.showSenderName}
                groupedWithPrev={item.groupedWithPrev}
                groupedWithNext={item.groupedWithNext}
                theme={chat.theme}
                reactions={chat.reactions[m.id] ?? []}
                highlighted={highlightId === m.id}
                onEdit={(text) => editMessage(chat.id, m.id, text)}
                onDelete={() => deleteMessage(chat.id, m.id)}
                onReact={(emoji) =>
                  toggleReaction(chat.id, m.id, emoji, sendAs)
                }
              />
            );
          }}
        />
        {searchOpen && (
          <SearchPanel
            messages={chat.messages}
            onJump={handleJump}
            onClose={() => setSearchOpen(false)}
          />
        )}
      </div>

      {ai.error && (
        <div className="flex items-start gap-2 border-t border-red-100 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span className="flex-1">{ai.error}</span>
          <button
            onClick={ai.clearError}
            className="shrink-0 text-red-400 hover:text-red-700"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {hasAIPersonas && (
        <div className="flex items-center gap-2 border-t border-neutral-100 bg-neutral-50 px-3 py-1.5">
          <Bot size={14} className="shrink-0 text-neutral-400" />
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-neutral-500">
            {ai.isGenerating
              ? `Generating as ${ai.generatingPersona}…`
              : ai.isAutoPlaying
                ? "Auto-play running…"
                : `AI-controlled: ${aiPersonas.join(", ")}`}
          </span>
          <button
            onClick={() => void ai.generateFor()}
            disabled={ai.isGenerating || ai.isAutoPlaying}
            className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11.5px] font-medium text-neutral-700 shadow-sm ring-1 ring-neutral-200 hover:bg-neutral-100 disabled:opacity-50"
            title="Generate the next AI reply"
          >
            {ai.isGenerating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            Reply
          </button>
        </div>
      )}

      <MessageInput
        participants={chat.participants.length ? chat.participants : ["Me"]}
        sendAs={sendAs}
        onChangeSendAs={setSendAs}
        onSend={(text) => addMessage(chat.id, sendAs, text)}
        gradient={`linear-gradient(135deg, ${chat.theme.meFrom}, ${chat.theme.meTo})`}
      />
    </div>
  );
}

function ThreadContainer({
  thread,
  messages,
  chat,
  highlightId,
  sendAs,
}: {
  thread: ActiveThread;
  messages: RawMessage[];
  chat: ChatData;
  highlightId: number | null;
  sendAs: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const editMessage = useChatStore((s) => s.editMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const toggleReaction = useChatStore((s) => s.toggleReaction);

  const participantColors = useMemo(() => {
    const baseColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
    const colors: Record<string, string> = {};
    chat.participants.forEach((p, idx) => {
      colors[p] = baseColors[idx % baseColors.length];
    });
    return colors;
  }, [chat.participants]);

  const totalMsgs = thread.messageCount;
  const participantShares = Object.entries(thread.participantCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: (count / totalMsgs) * 100,
      color: participantColors[name] ?? "#a3a3a3",
    }))
    .sort((a, b) => b.count - a.count);

  const dateStr = formatFullDate(thread.startTs);
  const timeRange = `${formatTime(thread.startTs)} – ${formatTime(thread.endTs)}`;

  useEffect(() => {
    if (highlightId !== null && messages.some((m) => m.id === highlightId)) {
      setIsExpanded(true);
    }
  }, [highlightId, messages]);

  return (
    <div className="mx-4 my-3 rounded-2xl border border-neutral-200 bg-neutral-50/50 p-4 select-none hover:bg-neutral-50 transition-all shadow-xs">
      {/* Header: Date, times and Toggle */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold text-neutral-600">
          <span className="text-neutral-500">{dateStr}</span>
          <span className="text-neutral-300">•</span>
          <span className="text-neutral-500">{timeRange}</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-900 hover:text-white transition-all cursor-pointer shadow-sm ring-1 ring-neutral-200"
        >
          <span>{isExpanded ? "Collapse" : "Expand"}</span>
          {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>
      </div>

      {/* Stats badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="inline-flex items-center rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 ring-1 ring-neutral-200/60">
          {thread.messageCount} messages
        </span>
        <span className="inline-flex items-center rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 ring-1 ring-neutral-200/60">
          {thread.durationMinutes} min
        </span>
        <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-600/10">
          {thread.velocity} msg/min
        </span>
      </div>

      {/* Multi-colored participation share bar */}
      <div className="mb-3">
        <div className="h-1.5 w-full flex overflow-hidden rounded-full bg-neutral-200/50">
          {participantShares.map((p) => (
            <div
              key={p.name}
              style={{
                width: `${p.percentage}%`,
                backgroundColor: p.color,
              }}
              className="h-full transition-all duration-300"
              title={`${p.name}: ${p.count} messages (${Math.round(p.percentage)}%)`}
            />
          ))}
        </div>
        {/* Labels/Legend */}
        <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1">
          {participantShares.slice(0, 4).map((p) => (
            <div key={p.name} className="flex items-center gap-1 text-[9.5px] text-neutral-500 font-semibold">
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: p.color }}
              />
              <span className="truncate max-w-[70px] text-neutral-700">{p.name}</span>
              <span className="text-neutral-400 font-normal">({Math.round(p.percentage)}%)</span>
            </div>
          ))}
          {participantShares.length > 4 && (
            <span className="text-[9.5px] text-neutral-400 font-semibold">
              +{participantShares.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Preview text when collapsed */}
      {!isExpanded && thread.previewText && (
        <p className="mt-3 text-[11px] italic text-neutral-400 border-l border-neutral-200 pl-2 leading-relaxed">
          "{thread.previewText}"
        </p>
      )}

      {/* Distinctive keywords / topics tags */}
      {thread.distinctiveWords && thread.distinctiveWords.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 mr-0.5">
            Topics:
          </span>
          {thread.distinctiveWords.map((word) => (
            <span
              key={word}
              className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[9.5px] font-medium text-neutral-500 ring-1 ring-neutral-200/50"
            >
              #{word}
            </span>
          ))}
        </div>
      )}

      {/* Expanded messages */}
      {isExpanded && (
        <div className="mt-4 border-l-2 border-amber-300 ml-1.5 pl-4 py-1.5 flex flex-col gap-2.5 bg-amber-50/[0.02] rounded-r-xl">
          {messages.map((m, idx) => {
            const mine = chat.me !== null && m.sender === chat.me;
            const prev = messages[idx - 1];
            const next = messages[idx + 1];
            const groupedWithPrev = !!(
              prev &&
              !prev.system &&
              !m.system &&
              prev.sender === m.sender &&
              m.ts - prev.ts < 5 * 60 * 1000
            );
            const groupedWithNext = !!(
              next &&
              !next.system &&
              !m.system &&
              next.sender === m.sender &&
              next.ts - m.ts < 5 * 60 * 1000
            );
            return (
              <MessageBubble
                key={m.id}
                message={m}
                mine={mine}
                showAvatar={!groupedWithNext}
                showSenderName={!groupedWithPrev && chat.participants.length > 2}
                groupedWithPrev={groupedWithPrev}
                groupedWithNext={groupedWithNext}
                theme={chat.theme}
                reactions={chat.reactions[m.id] ?? []}
                highlighted={highlightId === m.id}
                onEdit={(text) => editMessage(chat.id, m.id, text)}
                onDelete={() => deleteMessage(chat.id, m.id)}
                onReact={(emoji) => toggleReaction(chat.id, m.id, emoji, sendAs)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function NonThreadGroup({
  messages,
  chat,
  highlightId,
}: {
  messages: RawMessage[];
  chat: ChatData;
  highlightId: number | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (highlightId !== null && messages.some((m) => m.id === highlightId)) {
      setIsExpanded(true);
    }
  }, [highlightId, messages]);

  if (messages.length === 0) return null;

  if (!isExpanded) {
    return (
      <div className="px-4 py-1.5 flex justify-center">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1.5 rounded-xl border border-neutral-200/60 bg-neutral-50 px-3 py-1.5 text-[11px] font-semibold text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition-all cursor-pointer shadow-2xs"
        >
          <span>Show {messages.length} background message{messages.length === 1 ? "" : "s"}</span>
          <ChevronDown size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 my-1.5">
      <div className="px-4 flex justify-center mb-1">
        <button
          onClick={() => setIsExpanded(false)}
          className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-100 px-3 py-1 text-[10px] font-semibold text-neutral-500 hover:bg-neutral-200 transition-all cursor-pointer shadow-2xs"
        >
          <span>Hide background messages</span>
          <ChevronUp size={10} />
        </button>
      </div>
      {messages.map((m) => {
        const mine = chat.me !== null && m.sender === chat.me;
        return (
          <div key={m.id} className="px-4 py-0.5 flex">
            <div className={cn(
              "rounded-2xl border border-neutral-200/50 bg-neutral-50/40 p-2 px-3 text-xs opacity-50 shadow-2xs max-w-[75%]",
              mine ? "ml-auto bg-neutral-100/30 border-neutral-200/50" : "mr-auto"
            )}>
              <div className="text-[9px] font-semibold text-neutral-400 mb-0.5 flex justify-between gap-4">
                <span>{m.sender || "System"}</span>
                <span>{new Date(m.ts).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <div className="text-neutral-500 break-words leading-relaxed">{m.text}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
