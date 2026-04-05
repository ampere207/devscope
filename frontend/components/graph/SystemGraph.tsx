"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "reactflow";

import "reactflow/dist/style.css";

import type { GraphEdge, GraphNode } from "@/lib/api/types";

interface SystemGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightedNodes: string[];
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
}

function classifyNode(nodeId: string): "api" | "service" | "db" | "unknown" {
  const id = nodeId.toLowerCase();
  if (id.startsWith("/api") || id.includes("api")) return "api";
  if (id.includes("db") || id.includes("database") || id.includes("postgres")) return "db";
  if (id.includes("service") || id.endsWith(".py") || id.endsWith(".ts") || id.endsWith(".js")) {
    return "service";
  }
  return "unknown";
}

function nodeColorByType(type: ReturnType<typeof classifyNode>) {
  if (type === "api") return "#2563eb";
  if (type === "service") return "#059669";
  if (type === "db") return "#dc2626";
  return "#64748b";
}

export function SystemGraph({
  nodes,
  edges,
  highlightedNodes,
  selectedNodeId,
  onNodeClick,
}: SystemGraphProps) {
  const flowNodes = useMemo<Node[]>(() => {
    return nodes.map((node, index) => {
      const type = classifyNode(node.id);
      const isHighlighted = highlightedNodes.includes(node.id);
      const isSelected = selectedNodeId === node.id;

      return {
        id: node.id,
        data: { label: node.id },
        position: {
          x: 120 + (index % 4) * 230,
          y: 80 + Math.floor(index / 4) * 120,
        },
        draggable: false,
        style: {
          borderRadius: 12,
          border: isSelected ? "2px solid #0f172a" : "1px solid #cbd5e1",
          color: "#0f172a",
          background: isHighlighted ? "#fff7ed" : "#ffffff",
          boxShadow: isHighlighted ? "0 8px 22px -14px rgba(249, 115, 22, 0.7)" : "0 4px 14px -10px rgba(15, 23, 42, 0.4)",
          minWidth: 180,
          fontWeight: 600,
          borderLeft: `8px solid ${nodeColorByType(type)}`,
        },
      };
    });
  }, [nodes, highlightedNodes, selectedNodeId]);

  const highlightedSet = new Set(highlightedNodes);
  const flowEdges = useMemo<Edge[]>(() => {
    return edges.map((edge) => {
      const isHighlighted = highlightedSet.has(edge.source) && highlightedSet.has(edge.target);
      return {
        id: `${edge.source}->${edge.target}`,
        source: edge.source,
        target: edge.target,
        label: edge.relation,
        markerEnd: { type: MarkerType.ArrowClosed, color: isHighlighted ? "#f97316" : "#94a3b8" },
        animated: isHighlighted,
        style: {
          stroke: isHighlighted ? "#f97316" : "#94a3b8",
          strokeWidth: isHighlighted ? 2.5 : 1.4,
        },
      };
    });
  }, [edges, highlightedSet]);

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    onNodeClick(node.id);
  };

  return (
    <div className="h-full min-h-[620px] w-full rounded-2xl border border-slate-200 bg-white">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        fitView
        onNodeClick={handleNodeClick}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#dbeafe" gap={28} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
