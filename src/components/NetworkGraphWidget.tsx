import { useEffect, useRef } from "react";
import cytoscape from "cytoscape";
import type { ChatStats, BubbleTheme } from "@/types";

interface NetworkGraphWidgetProps {
  stats: ChatStats;
  theme: BubbleTheme;
}

export function NetworkGraphWidget({ stats, theme }: NetworkGraphWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Prepare elements
    const elements: cytoscape.ElementDefinition[] = [];

    // Calculate maximum messages to scale node sizes
    const maxCount = Math.max(...stats.participants.map((p) => p.count), 1);

    // Add nodes for each participant
    stats.participants.forEach((p) => {
      // Scale node size between 20px and 50px
      const size = 20 + (p.count / maxCount) * 30;
      elements.push({
        data: {
          id: p.name,
          label: p.name,
          size,
        },
      });
    });

    // Add edges from replyMatrix
    const matrix = stats.replyMatrix ?? {};
    let maxWeight = 1;
    
    // Find max edge weight for scaling
    Object.keys(matrix).forEach((sender) => {
      Object.keys(matrix[sender]).forEach((target) => {
        const weight = matrix[sender][target] ?? 0;
        if (weight > maxWeight) maxWeight = weight;
      });
    });

    Object.keys(matrix).forEach((sender) => {
      Object.keys(matrix[sender]).forEach((target) => {
        const weight = matrix[sender][target] ?? 0;
        // Only draw edge if there are at least 2 replies (pruning weak connections for performance/clarity)
        if (weight >= 2) {
          elements.push({
            data: {
              id: `${sender}->${target}`,
              source: sender,
              target: target,
              weight,
              // Scale width between 1px and 6px
              width: 1 + (weight / maxWeight) * 5,
            },
          });
        }
      });
    });

    // 2. Initialize Cytoscape
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
            color: "#333",
            "font-size": "10px",
            "font-weight": "bold",
            "text-valign": "bottom",
            "text-margin-y": 4,
            "border-width": 2,
            "border-color": "#fff",
            "overlay-padding": "6px",
            "transition-property": "background-color",
            "transition-duration": 0.2,
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
            "line-color": "#d1d5db",
            "target-arrow-color": "#9ca3af",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "control-point-step-size": 30, // loops arcs slightly
            opacity: 0.85,
          },
        },
      ],
      layout: {
        name: "cose",
        idealEdgeLength: () => 100,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: () => 400000,
        edgeElasticity: () => 100,
        nestingFactor: 1.2,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
      } as any,
    });

    return () => {
      cy.destroy();
    };
  }, [stats, theme]);

  return (
    <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
          Interaction Network Graph
        </h4>
        <p className="text-[11px] text-neutral-400">
          Drag nodes to explore. Edges indicate reply direction and frequency.
        </p>
      </div>
      <div
        ref={containerRef}
        className="h-[300px] w-full overflow-hidden rounded-xl border border-neutral-200/50 bg-white"
        style={{ touchAction: "none" }}
      />
    </div>
  );
}
