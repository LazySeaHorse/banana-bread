import { colorForName, initialsForName } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { Avatar as UIAvatar, AvatarFallback } from "@/components/ui/avatar";

export function Avatar({
  name,
  size = 40,
  ring = false,
  className,
}: {
  name: string;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const color = colorForName(name || "?");
  return (
    <UIAvatar
      className={cn(
        "shrink-0 select-none",
        ring && "ring-2 ring-white",
        className
      )}
      style={{
        width: size,
        height: size,
      }}
    >
      <AvatarFallback
        className="font-semibold text-white"
        style={{
          fontSize: size * 0.38,
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
        }}
      >
        {initialsForName(name || "?")}
      </AvatarFallback>
    </UIAvatar>
  );
}
