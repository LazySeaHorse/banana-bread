import { useState } from "react";
import { ChevronDown, ChevronUp, ArrowUpRight } from "lucide-react";
import type { ActiveThread } from "@/types";
import { formatFullDate, formatTime } from "@/lib/date";
import { useChatStore } from "@/store/useChatStore";

export function ActiveThreadsWidget({
  threads,
  participantColors,
  onCloseModal,
}: {
  threads: ActiveThread[];
  participantColors: Record<string, string>;
  onCloseModal: () => void;
}) {
  const setJumpTargetId = useChatStore((s) => s.setJumpTargetId);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleJump = (messageId: number) => {
    setJumpTargetId(messageId);
    onCloseModal();
  };

  if (!threads || threads.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 text-center select-none">
        <h4 className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
          Active Threads
        </h4>
        <p className="text-xs text-neutral-400 italic">
          No active threads detected in this conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4 select-none">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center justify-between text-left cursor-pointer focus:outline-none"
      >
        <div>
          <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
            Active Threads
          </h4>
          <p className="text-[11px] text-neutral-400">
            {threads.length} debate thread{threads.length === 1 ? "" : "s"} detected
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 transition-colors">
          <span>{isCollapsed ? "Expand" : "Collapse"}</span>
          {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </div>
      </button>

      {!isCollapsed && (
        <div className="mt-4 flex flex-col divide-y divide-neutral-200/50">
          {threads.map((t) => {
            const totalMsgs = t.messageCount;
            const participantShares = Object.entries(t.participantCounts)
              .map(([name, count]) => ({
                name,
                count,
                percentage: (count / totalMsgs) * 100,
                color: participantColors[name] ?? "#a3a3a3",
              }))
              .sort((a, b) => b.count - a.count);

            const dateStr = formatFullDate(t.startTs);
            const timeRange = `${formatTime(t.startTs)} – ${formatTime(t.endTs)}`;

            return (
              <div key={t.id} className="py-4 first:pt-0 last:pb-0">
                {/* Header: Date, times and Jump */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-semibold text-neutral-600">
                    <span className="text-neutral-500">{dateStr}</span>
                    <span className="text-neutral-300">•</span>
                    <span className="text-neutral-500">{timeRange}</span>
                  </div>
                  <button
                    onClick={() => handleJump(t.firstMessageId)}
                    className="flex items-center gap-0.5 rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-neutral-700 hover:bg-neutral-900 hover:text-white transition-all cursor-pointer shadow-sm ring-1 ring-neutral-200"
                    title="Jump to start of this thread in chat"
                  >
                    Jump
                    <ArrowUpRight size={10} />
                  </button>
                </div>

                {/* Stats badges */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  <span className="inline-flex items-center rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 ring-1 ring-neutral-200/60">
                    {t.messageCount} messages
                  </span>
                  <span className="inline-flex items-center rounded bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 ring-1 ring-neutral-200/60">
                    {t.durationMinutes} min
                  </span>
                  <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-600/10">
                    {t.velocity} msg/min
                  </span>
                </div>

                {/* Multi-colored participation share bar */}
                <div className="mb-2">
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
                  <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
                    {participantShares.slice(0, 4).map((p) => (
                      <div key={p.name} className="flex items-center gap-1 text-[9px] text-neutral-500 font-medium">
                        <span
                          className="h-1.5 w-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        <span className="truncate max-w-[60px] font-semibold text-neutral-700">{p.name}</span>
                        <span>({Math.round(p.percentage)}%)</span>
                      </div>
                    ))}
                    {participantShares.length > 4 && (
                      <span className="text-[9px] text-neutral-400">
                        +{participantShares.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Preview text */}
                {t.previewText && (
                  <p className="mt-2 text-[11.5px] italic text-neutral-500 line-clamp-2 leading-relaxed">
                    "{t.previewText}"
                  </p>
                )}

                {/* Distinctive keywords / topics tags */}
                {t.distinctiveWords && t.distinctiveWords.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 mr-0.5">
                      Topics:
                    </span>
                    {t.distinctiveWords.map((word) => (
                      <span
                        key={word}
                        className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-500 ring-1 ring-neutral-200/50 hover:bg-neutral-100"
                      >
                        #{word}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
