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

import type { DataFlowRecord, GraphEdge, GraphNode } from "@/lib/api/types";

interface SystemGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  highlightedNodes: string[];
  selectedNodeId: string | null;
  dataFlowRecords?: DataFlowRecord[];
  viewMode?: "graph" | "flow" | "dataflow";
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

function formatNodeLabel(nodeId: string) {
  const normalized = nodeId.replace(/\\/g, "/");
  if (!normalized.includes("/")) {
    return normalized.length > 36 ? `${normalized.slice(0, 33)}...` : normalized;
  }

  const segments = normalized.split("/").filter(Boolean);
  if (segments.length <= 2) {
    return normalized;
  }

  const tail = segments.slice(-2).join("/");
  return tail.length > 40 ? `${tail.slice(0, 37)}...` : tail;
}

export function SystemGraph({
  nodes,
  edges,
  highlightedNodes,
  selectedNodeId,
  dataFlowRecords = [],
  viewMode = "graph",
  onNodeClick,
}: SystemGraphProps) {
  const flowNodes = useMemo<Node[]>(() => {
    return nodes.map((node, index) => {
      const type = classifyNode(node.id);
      const isHighlighted = highlightedNodes.includes(node.id);
      const isSelected = selectedNodeId === node.id;

      return {
        id: node.id,
        data: { label: formatNodeLabel(node.id) },
        position: {
          x: 120 + (index % 4) * 230,
          y: 80 + Math.floor(index / 4) * 120,
        },
        draggable: false,
        style: {
          borderRadius: 12,
          border: isSelected ? "2px solid #0f172a" : "1px solid #cbd5e1",
          color: "#0f172a",
          background: `linear-gradient(90deg, ${nodeColorByType(type)} 0 8px, ${
            isHighlighted ? "#fff7ed" : "#ffffff"
          } 8px)`,
          boxShadow: isHighlighted ? "0 8px 22px -14px rgba(249, 115, 22, 0.7)" : "0 4px 14px -10px rgba(15, 23, 42, 0.4)",
          minWidth: 180,
          fontWeight: 600,
        },
      };
    });
  }, [nodes, highlightedNodes, selectedNodeId]);

  const highlightedSet = new Set(highlightedNodes);
  const dataFlowByEdge = new Map<string, DataFlowRecord>();
  dataFlowRecords.forEach((record) => {
    dataFlowByEdge.set(`${record.from}->${record.to}`, record);
  });

  const flowEdges = useMemo<Edge[]>(() => {
    return edges.map((edge) => {
      const edgeKey = `${edge.source}->${edge.target}`;
      const flowRecord = dataFlowByEdge.get(edgeKey);
      const isHighlighted = highlightedSet.has(edge.source) && highlightedSet.has(edge.target);
      const isDataFlowView = viewMode === "dataflow";

      return {
        id: edgeKey,
        source: edge.source,
        target: edge.target,
        label: isDataFlowView ? (flowRecord?.data ?? edge.relation) : edge.relation,
        markerEnd: { type: MarkerType.ArrowClosed, color: isHighlighted ? "#f97316" : "#94a3b8" },
        animated: isHighlighted || (isDataFlowView && Boolean(flowRecord)),
        style: {
          stroke: isDataFlowView && flowRecord ? "#0891b2" : isHighlighted ? "#f97316" : "#94a3b8",
          strokeWidth: isDataFlowView && flowRecord ? 2.8 : isHighlighted ? 2.5 : 1.4,
        },
      };
    });
  }, [edges, highlightedSet, dataFlowByEdge, viewMode]);

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    onNodeClick(node.id);
  };

  return (
    <div className="h-full min-h-155 w-full rounded-2xl border border-slate-200 bg-white">
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
