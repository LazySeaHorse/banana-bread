import { FileText, Image as ImageIcon, Mic, User, Video, Sticker as StickerIcon, File } from "lucide-react";

const ICONS: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  video: Video,
  gif: ImageIcon,
  sticker: StickerIcon,
  audio: Mic,
  document: FileText,
  contact: User,
};

export function MediaPlaceholder({ kind, mine }: { kind?: string; mine?: boolean }) {
  const Icon = ICONS[kind ?? ""] ?? File;
  return (
    <div
      className={`flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border ${
        mine ? "border-white/30 bg-white/15 text-white" : "border-black/5 bg-black/5 text-neutral-500"
      }`}
    >
      <Icon size={26} strokeWidth={1.5} />
      <span className="text-[10px] font-medium capitalize opacity-80">{kind ?? "Media"}</span>
    </div>
  );
}
