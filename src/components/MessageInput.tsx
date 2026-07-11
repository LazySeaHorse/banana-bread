import { useRef, useState } from "react";
import { ChevronDown, Image as ImageIcon, Send, Smile } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { cn } from "@/utils/cn";

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
  const [pickerOpen, setPickerOpen] = useState(false);
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
        <button
          onClick={() => setPickerOpen((p) => !p)}
          className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
        >
          <Avatar name={sendAs} size={20} />
          <span>
            Send as <b>{sendAs}</b>
          </span>
          <ChevronDown size={13} />
        </button>
        {pickerOpen && (
          <div className="absolute bottom-full left-2 z-20 mb-1 w-48 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-black/5">
            {participants.map((p) => (
              <button
                key={p}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50",
                  p === sendAs && "bg-neutral-50 font-semibold"
                )}
                onClick={() => {
                  onChangeSendAs(p);
                  setPickerOpen(false);
                }}
              >
                <Avatar name={p} size={22} />
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-end gap-2 px-3 py-2">
        <button className="mb-1.5 shrink-0 text-neutral-500 hover:text-neutral-700" title="Attach media (decorative)">
          <ImageIcon size={22} />
        </button>
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
          <button className="shrink-0 text-neutral-500 hover:text-neutral-700" title="Emoji (decorative)">
            <Smile size={20} />
          </button>
        </div>
        {value.trim() ? (
          <button
            onClick={submit}
            className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white shadow"
            style={{ background: gradient }}
          >
            <Send size={16} />
          </button>
        ) : (
          <button className="mb-1.5 shrink-0 text-neutral-500 hover:text-neutral-700" title="Like (decorative)">
            <span className="text-xl leading-none">❤️</span>
          </button>
        )}
      </div>
    </div>
  );
}
