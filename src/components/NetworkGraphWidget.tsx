import { useEffect, useRef, useState, useMemo } from "react";
import cytoscape from "cytoscape";
import { SlidersHorizontal, Settings2, RefreshCw } from "lucide-react";
import type { ChatStats, BubbleTheme } from "@/types";
import { cn } from "@/utils/cn";

interface NetworkGraphWidgetProps {
  stats: ChatStats;
  theme: BubbleTheme;
}

export function NetworkGraphWidget({ stats, theme }: NetworkGraphWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 1. Interactive States
  const [layoutName, setLayoutName] = useState<"cose" | "concentric">("concentric");
  const [minReplies, setMinReplies] = useState<number>(3);
  const [topN, setTopN] = useState<number>(15);
  const [manuallyIncluded, setManuallyIncluded] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Calculate maximum replies globally to bound the slider
  const maxPossibleWeight = useMemo(() => {
    let max = 3;
    const matrix = stats.replyMatrix ?? {};
    Object.keys(matrix).forEach((sender) => {
      Object.keys(matrix[sender]).forEach((target) => {
        const weight = matrix[sender][target] ?? 0;
        if (weight > max) max = weight;
      });
    });
    return max;
  }, [stats.replyMatrix]);

  // Adjust minReplies if it exceeds maxPossibleWeight
  useEffect(() => {
    if (minReplies > maxPossibleWeight) {
      setMinReplies(Math.max(1, Math.floor(maxPossibleWeight * 0.1)));
    }
  }, [maxPossibleWeight, minReplies]);

  // 2. Filter nodes based on TopN + Manually Included
  const renderedParticipants = useMemo(() => {
    const core = topN === 999 ? stats.participants : stats.participants.slice(0, topN);
    const set = new Set(core.map((p) => p.name));
    manuallyIncluded.forEach((name) => set.add(name));
    return stats.participants.filter((p) => set.has(p.name));
  }, [stats.participants, topN, manuallyIncluded]);

  const renderedNames = useMemo(() => new Set(renderedParticipants.map((p) => p.name)), [renderedParticipants]);

  // Find participants not included in the core set
  const nonCoreParticipants = useMemo(() => {
    const core = topN === 999 ? stats.participants : stats.participants.slice(0, topN);
    const coreSet = new Set(core.map((p) => p.name));
    return stats.participants.filter((p) => !coreSet.has(p.name));
  }, [stats.participants, topN]);

  // Reset manual inclusions that are now inside the core N
  useEffect(() => {
    const core = topN === 999 ? stats.participants : stats.participants.slice(0, topN);
    const coreSet = new Set(core.map((p) => p.name));
    setManuallyIncluded((prev) => prev.filter((name) => !coreSet.has(name)));
  }, [topN, stats.participants]);

  // 3. Initialize/Update Cytoscape Instance
  useEffect(() => {
    if (!containerRef.current || renderedParticipants.length === 0) return;

    const elements: cytoscape.ElementDefinition[] = [];

    // Scale nodes based on relative activity of currently rendered participants
    const maxCount = Math.max(...renderedParticipants.map((p) => p.count), 1);
    renderedParticipants.forEach((p) => {
      const size = 18 + (p.count / maxCount) * 28; // scale node size 18px to 46px
      elements.push({
        data: {
          id: p.name,
          label: p.name,
          size,
        },
      });
    });

    // Populate edges and find local maximum weight
    const matrix = stats.replyMatrix ?? {};
    let localMaxWeight = 1;

    Object.keys(matrix).forEach((sender) => {
      if (!renderedNames.has(sender)) return;
      Object.keys(matrix[sender]).forEach((target) => {
        if (!renderedNames.has(target)) return;
        const weight = matrix[sender][target] ?? 0;
        if (weight >= minReplies && weight > localMaxWeight) {
          localMaxWeight = weight;
        }
      });
    });

    Object.keys(matrix).forEach((sender) => {
      if (!renderedNames.has(sender)) return;
      Object.keys(matrix[sender]).forEach((target) => {
        if (!renderedNames.has(target)) return;
        const weight = matrix[sender][target] ?? 0;
        if (weight >= minReplies) {
          elements.push({
            data: {
              id: `${sender}->${target}`,
              source: sender,
              target: target,
              weight,
              width: 1 + (weight / localMaxWeight) * 4.5,
              opacity: Math.max(0.12, weight / localMaxWeight),
            },
          });
        }
      });
    });

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      boxSelectionEnabled: false,
      autounselectify: true,
      style: [
        {
          selector: "node",
          style: {
            "background-color": theme.meFrom || "#5B51D8",
            label: "data(label)",
            width: "data(size)",
            height: "data(size)",
            color: "#1f2937",
            "font-size": "9px",
            "font-weight": "600",
            "text-valign": "bottom",
            "text-margin-y": 4,
            "border-width": 2,
            "border-color": "#ffffff",
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.85,
            "text-background-padding": "3px",
            "text-background-shape": "roundrectangle",
            "overlay-padding": "4px",
          },
        },
        {
          selector: "node:active",
          style: {
            "background-color": theme.meTo || "#E1306C",
          },
        },
        {
          selector: "edge",
          style: {
            width: "data(width)",
            "line-color": "#cbd5e1",
            "target-arrow-color": "#94a3b8",
            "target-arrow-shape": "triangle",
            "target-arrow-scale": 0.7,
            "curve-style": "bezier",
            "control-point-step-size": 25,
            opacity: "data(opacity)",
          },
        },
      ],
      layout: {
        name: layoutName,
        // Concentric Layout Parameters
        concentric: (node: any) => node.data("size") || 1,
        levelWidth: () => 1,
        fit: true,
        padding: 30,
        // COSE Layout Parameters
        idealEdgeLength: () => 90,
        nodeOverlap: 25,
        refresh: 20,
        randomize: false,
        componentSpacing: 80,
        nodeRepulsion: () => 400000,
        edgeElasticity: () => 100,
        gravity: 80,
        numIter: 1000,
      } as any,
    });

    return () => {
      cy.destroy();
    };
  }, [renderedParticipants, renderedNames, minReplies, layoutName, theme, stats.replyMatrix]);

  return (
    <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
      {/* Widget Header */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
            Interaction Network Graph
          </h4>
          <p className="text-[11px] text-neutral-400">
            Drag nodes to explore relationship hubs.
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition-all duration-150 cursor-pointer",
            showSettings
              ? "bg-neutral-900 border-neutral-900 text-white shadow-sm"
              : "bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-100"
          )}
        >
          <SlidersHorizontal size={13} />
          Settings
        </button>
      </div>

      {/* Interactive Controls Panel */}
      {showSettings && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border border-neutral-200/50 bg-white p-3.5 shadow-sm animate-fadeIn">
          {/* Column 1: Layout & Core Limits */}
          <div className="flex flex-col gap-3">
            {/* Layout Toggle */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Layout Style
              </span>
              <div className="flex rounded-lg bg-neutral-100 p-0.5">
                <button
                  onClick={() => setLayoutName("concentric")}
                  className={cn(
                    "flex-1 rounded-md py-1 text-center text-xs font-medium transition-all cursor-pointer",
                    layoutName === "concentric"
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  Concentric
                </button>
                <button
                  onClick={() => setLayoutName("cose")}
                  className={cn(
                    "flex-1 rounded-md py-1 text-center text-xs font-medium transition-all cursor-pointer",
                    layoutName === "cose"
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  Organic
                </button>
              </div>
            </div>

            {/* Top N Limit Selector */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Show Top Active
              </span>
              <select
                value={topN}
                onChange={(e) => setTopN(Number(e.target.value))}
                className="w-full rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-800 outline-none focus:border-neutral-400 cursor-pointer"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={15}>Top 15</option>
                <option value={20}>Top 20</option>
                <option value={30}>Top 30</option>
                <option value={999}>All Participants</option>
              </select>
            </div>
          </div>

          {/* Column 2: Reply Filtering Slider */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Min Reply Filter
              </span>
              <span className="text-xs font-semibold text-neutral-900">
                &ge; {minReplies} replies
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={maxPossibleWeight}
              value={minReplies}
              onChange={(e) => setMinReplies(Number(e.target.value))}
              className="w-full h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-neutral-800"
            />
            <p className="text-[10px] text-neutral-400 leading-snug">
              Hides lines representing weak interactions. Scale limits: 1 to {maxPossibleWeight}.
            </p>
          </div>

          {/* Column 3: Manual Force Inclusions */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Force Include Senders
            </span>
            {nonCoreParticipants.length > 0 ? (
              <div className="max-h-[100px] overflow-y-auto border border-neutral-200/60 rounded-lg p-2 bg-white flex flex-col gap-1.5 scrollbar-thin">
                {nonCoreParticipants.map((p) => {
                  const isChecked = manuallyIncluded.includes(p.name);
                  return (
                    <label
                      key={p.name}
                      className="flex items-center gap-2 text-xs font-medium text-neutral-600 cursor-pointer hover:text-neutral-900 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setManuallyIncluded((prev) =>
                            isChecked ? prev.filter((x) => x !== p.name) : [...prev, p.name]
                          );
                        }}
                        className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="truncate flex-1">
                        {p.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono pr-1">({p.count})</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="h-[100px] flex items-center justify-center border border-dashed border-neutral-200 rounded-lg bg-neutral-50 text-[10px] text-neutral-400 italic">
                All participants included in Top N.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Graph Area */}
      {renderedParticipants.length > 0 ? (
        <div
          ref={containerRef}
          className="h-[340px] w-full overflow-hidden rounded-xl border border-neutral-200/50 bg-white"
          style={{ touchAction: "none" }}
        />
      ) : (
        <div className="h-[340px] flex items-center justify-center rounded-xl border border-neutral-200/50 bg-white text-xs text-neutral-400 italic">
          No participants selected to draw.
        </div>
      )}
    </div>
  );
}
