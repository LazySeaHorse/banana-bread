import { useRef, useState } from "react";
import { ChevronDown, Image as ImageIcon, Send, Smile } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function MessageInput({
  participants,
  sendAs,
  onChangeSendAs,
  onSend,
  gradient,
}: {
  participants: string[];
  sendAs: string;
  onChangeSendAs: (name: string) => void;
  onSend: (text: string) => void;
  gradient: string;
}) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    onSend(text);
    setValue("");
    if (taRef.current) taRef.current.style.height = "auto";
  };

  return (
    <div className="border-t border-neutral-200 bg-white">
      <div className="relative flex items-center gap-2 border-b border-neutral-100 px-3 py-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 rounded-full py-1 pl-1.5 pr-2.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
            >
              <Avatar name={sendAs} size={20} />
              <span>
                Send as <b>{sendAs}</b>
              </span>
              <ChevronDown size={13} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 p-1">
            {participants.map((p) => (
              <DropdownMenuItem
                key={p}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-1.5 text-sm cursor-pointer",
                  p === sendAs && "bg-neutral-100 font-semibold"
                )}
                onClick={() => onChangeSendAs(p)}
              >
                <Avatar name={p} size={22} />
                <span className="truncate">{p}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-end gap-2 px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="mb-1.5 h-8 w-8 shrink-0 rounded-full text-neutral-500 hover:text-neutral-700"
          title="Attach media (decorative)"
        >
          <ImageIcon size={20} />
        </Button>

        <div className="flex flex-1 items-end gap-2 rounded-3xl bg-neutral-100 px-3 py-2">
          <textarea
            ref={taRef}
            rows={1}
            value={value}
            dir="auto"
            placeholder="Message..."
            className="max-h-28 flex-1 resize-none bg-transparent text-[14.5px] outline-none placeholder:text-neutral-400"
            onChange={(e) => {
              setValue(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 112)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button
            variant="ghost"
            size="iconSm"
            className="shrink-0 rounded-full text-neutral-500 hover:text-neutral-700"
            title="Emoji (decorative)"
          >
            <Smile size={18} />
          </Button>
        </div>

        {value.trim() ? (
          <Button
            onClick={submit}
            size="icon"
            className="mb-0.5 h-9 w-9 shrink-0 rounded-full text-white shadow hover:opacity-90"
            style={{ background: gradient }}
          >
            <Send size={16} />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="mb-1.5 h-8 w-8 shrink-0 rounded-full text-neutral-500 hover:text-neutral-700"
            title="Like (decorative)"
          >
            <span className="text-xl leading-none">❤️</span>
          </Button>
        )}
      </div>
    </div>
  );
}
