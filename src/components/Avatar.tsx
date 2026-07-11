import { colorForName, initialsForName } from "@/lib/colors";
import { cn } from "@/utils/cn";

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
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white select-none",
        ring && "ring-2 ring-white",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(135deg, ${color}, ${color}cc)`,
      }}
    >
      {initialsForName(name || "?")}
    </div>
  );
}
