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
} from "lucide-react";
import type { ChatData, RawMessage } from "@/types";
import { Avatar } from "@/components/Avatar";
import { MessageBubble } from "@/components/MessageBubble";
import { MessageInput } from "@/components/MessageInput";
import { SearchPanel } from "@/components/SearchPanel";
import { formatDay } from "@/lib/date";
import { useChatStore } from "@/store/useChatStore";
import { useAIReply } from "@/hooks/useAIReply";

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
    };

const GROUP_WINDOW_MS = 5 * 60 * 1000;

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

  const feedItems = useMemo<FeedItem[]>(() => {
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
  }, [chat.messages, chat.participants.length]);

  const messageIndexById = useMemo(() => {
    const map = new Map<number, number>();
    feedItems.forEach((item, idx) => {
      if (item.type === "message") map.set(item.message.id, idx);
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
          components={{
            Header: () => <div className="h-3" />,
            Footer: () => <div className="h-3" />,
          }}
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
