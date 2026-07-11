import { useState } from "react";
import type { BubbleTheme, RawMessage, Reaction } from "@/types";
import { MediaPlaceholder } from "@/components/MediaPlaceholder";
import { Avatar } from "@/components/Avatar";
import { formatTime } from "@/lib/date";
import { cn } from "@/utils/cn";
import { Pencil, SmilePlus, Trash2, Check, X } from "lucide-react";

const QUICK_EMOJIS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

export function MessageBubble({
  message,
  mine,
  showAvatar,
  showSenderName,
  groupedWithPrev,
  groupedWithNext,
  theme,
  reactions,
  highlighted,
  onEdit,
  onDelete,
  onReact,
}: {
  message: RawMessage;
  mine: boolean;
  showAvatar: boolean;
  showSenderName: boolean;
  groupedWithPrev: boolean;
  groupedWithNext: boolean;
  theme: BubbleTheme;
  reactions: Reaction[];
  highlighted?: boolean;
  onEdit: (text: string) => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}) {
  const [pinned, setPinned] = useState(false);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [draft, setDraft] = useState(message.text);

  if (message.system) {
    return (
      <div className="my-2 flex justify-center px-6">
        <span className="rounded-full bg-black/5 px-3 py-1 text-center text-[11px] text-neutral-500">
          {message.text}
        </span>
      </div>
    );
  }

  const radiusBig = "18px";
  const radiusSmall = "4px";
  let borderRadius: string;
  if (mine) {
    // top-left, top-right, bottom-right, bottom-left
    borderRadius = `${radiusBig} ${groupedWithPrev ? radiusSmall : radiusBig} ${
      groupedWithNext ? radiusSmall : radiusBig
    } ${radiusBig}`;
  } else {
    borderRadius = `${groupedWithPrev ? radiusSmall : radiusBig} ${radiusBig} ${radiusBig} ${
      groupedWithNext ? radiusSmall : radiusBig
    }`;
  }

  const bubbleStyle: React.CSSProperties = mine
    ? {
        background: `linear-gradient(135deg, ${theme.meFrom}, ${theme.meTo})`,
        color: theme.meText,
        borderRadius,
      }
    : {
        background: theme.themBg,
        color: theme.themText,
        borderRadius,
      };

  const marginTop = groupedWithPrev ? "mt-0.5" : "mt-2.5";

  if (message.deleted) {
    return (
      <div className={cn("flex px-3", marginTop, mine ? "justify-end" : "justify-start")}>
        <div className="rounded-2xl bg-black/5 px-3.5 py-2 text-[13px] italic text-neutral-400">
          This message was deleted
        </div>
      </div>
    );
  }

  const restLines = message.text.split("\n").slice(1);
  const caption = message.isMedia ? restLines.join("\n").trim() : "";

  return (
    <div
      className={cn("group relative flex px-3", marginTop, mine ? "justify-end" : "justify-start")}
      onClick={() => setPinned((p) => !p)}
    >
      {!mine && (
        <div className="mr-2 flex w-7 shrink-0 items-end">
          {showAvatar && <Avatar name={message.sender ?? "?"} size={26} />}
        </div>
      )}

      <div className={cn("flex max-w-[78%] flex-col sm:max-w-[65%]", mine ? "items-end" : "items-start")}>
        {showSenderName && !mine && (
          <span className="mb-0.5 ml-1 text-[11px] font-semibold text-neutral-500">{message.sender}</span>
        )}

        <div className="relative">
          {editing ? (
            <div className="w-64 max-w-[70vw] rounded-2xl border border-neutral-300 bg-white p-2 shadow-sm">
              <textarea
                autoFocus
                className="w-full resize-none rounded-lg border border-neutral-200 p-2 text-sm outline-none focus:border-neutral-400"
                rows={3}
                value={draft}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => setDraft(e.target.value)}
              />
              <div className="mt-1.5 flex justify-end gap-2">
                <button
                  className="flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(false);
                    setDraft(message.text);
                  }}
                >
                  <X size={12} /> Cancel
                </button>
                <button
                  className="flex items-center gap-1 rounded-full bg-neutral-900 px-2.5 py-1 text-xs text-white hover:bg-black"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(draft);
                    setEditing(false);
                  }}
                >
                  <Check size={12} /> Save
                </button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "px-3.5 py-2 text-[14.5px] leading-snug shadow-[0_1px_1px_rgba(0,0,0,0.03)] transition-transform",
                highlighted && "ring-2 ring-yellow-400"
              )}
              style={bubbleStyle}
              dir="auto"
            >
              {message.isMedia ? (
                <div className="flex flex-col gap-1.5">
                  <MediaPlaceholder kind={message.mediaKind} mine={mine} />
                  {caption && <div className="whitespace-pre-wrap break-words">{caption}</div>}
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words">{message.text || " "}</div>
              )}
            </div>
          )}

          {/* action toolbar */}
          {!editing && (
            <div
              className={cn(
                "absolute top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-full bg-white px-1 py-0.5 opacity-0 shadow-md ring-1 ring-black/5 transition-opacity group-hover:opacity-100",
                pinned && "opacity-100",
                mine ? "right-full mr-1.5" : "left-full ml-1.5"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                onClick={() => setPicking((p) => !p)}
                title="React"
              >
                <SmilePlus size={15} />
              </button>
              <button
                className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
                onClick={() => {
                  setEditing(true);
                  setPicking(false);
                }}
                title="Edit"
              >
                <Pencil size={15} />
              </button>
              <button
                className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-red-500"
                onClick={onDelete}
                title="Delete"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}

          {picking && (
            <div
              className={cn(
                "absolute -top-11 z-10 flex items-center gap-1 rounded-full bg-white px-2 py-1.5 shadow-lg ring-1 ring-black/5",
                mine ? "right-0" : "left-0"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  className="rounded-full p-1 text-lg leading-none transition-transform hover:scale-125"
                  onClick={() => {
                    onReact(e);
                    setPicking(false);
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          {reactions.length > 0 && (
            <div className={cn("absolute -bottom-3 flex gap-0.5", mine ? "right-1" : "left-1")}>
              {reactions.map((r, i) => (
                <span
                  key={i}
                  title={r.by}
                  className="flex items-center justify-center rounded-full bg-white px-1 text-[11px] shadow ring-1 ring-black/5"
                >
                  {r.emoji}
                </span>
              ))}
            </div>
          )}
        </div>

        {!groupedWithNext && (
          <div className={cn("mt-1 px-1 text-[10.5px] text-neutral-400", reactions.length > 0 && "mt-3.5")}>
            {formatTime(message.ts)}
            {message.edited && <span className="ml-1 italic">edited</span>}
          </div>
        )}
      </div>
    </div>
  );
}
