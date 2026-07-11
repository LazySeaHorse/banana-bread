import { useRef } from "react";
import { Settings, Upload, MessageCircleHeart } from "lucide-react";
import type { ChatIndexEntry } from "@/types";
import { Avatar } from "@/components/Avatar";
import { formatListTimestamp } from "@/lib/date";
import { cn } from "@/utils/cn";

export function ChatListSidebar({
  chats,
  activeChatId,
  onOpenChat,
  onImport,
  onOpenSettings,
}: {
  chats: ChatIndexEntry[];
  activeChatId: string | null;
  onOpenChat: (id: string) => void;
  onImport: (file: File) => void;
  onOpenSettings: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const sorted = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3.5">
        <h1 className="text-xl font-bold text-neutral-900">Chats</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fileRef.current?.click()}
            className="rounded-full p-2 text-neutral-700 hover:bg-neutral-100"
            title="Import chat export (.txt)"
          >
            <Upload size={19} />
          </button>
          <button
            onClick={onOpenSettings}
            className="rounded-full p-2 text-neutral-700 hover:bg-neutral-100"
            title="Settings"
          >
            <Settings size={19} />
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImport(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {sorted.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <MessageCircleHeart size={40} className="text-neutral-300" />
            <p className="text-sm text-neutral-400">
              Import a WhatsApp exported chat (.txt) to see it rendered here, Instagram DM style.
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-full bg-gradient-to-r from-[#5B51D8] to-[#E1306C] px-4 py-2 text-sm font-medium text-white shadow"
            >
              Import chat
            </button>
          </div>
        )}
        {sorted.map((c) => (
          <button
            key={c.id}
            onClick={() => onOpenChat(c.id)}
            className={cn(
              "flex w-full items-center gap-3 border-b border-neutral-50 px-4 py-3 text-left hover:bg-neutral-50",
              activeChatId === c.id && "bg-neutral-50"
            )}
          >
            <Avatar name={c.title} size={48} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[14px] font-semibold text-neutral-900">{c.title}</span>
                <span className="shrink-0 text-[11px] text-neutral-400">{formatListTimestamp(c.lastTs)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[12.5px] text-neutral-500">{c.lastMessagePreview || "No messages"}</p>
                {!c.me && <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] text-amber-700">set "you"</span>}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
