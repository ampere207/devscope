"use client";

import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
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

type NodeKind = "api" | "service" | "db" | "unknown";

function classifyNode(nodeId: string): NodeKind {
  const id = nodeId.toLowerCase();
  if (id.startsWith("/api") || id.includes("api")) return "api";
  if (id.includes("db") || id.includes("database") || id.includes("postgres")) return "db";
  if (id.includes("service") || id.endsWith(".py") || id.endsWith(".ts") || id.endsWith(".js")) {
    return "service";
  }
  return "unknown";
}

function nodeColorByType(type: NodeKind) {
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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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
    const lanes: Array<{ key: NodeKind; nodes: GraphNode[] }> = [
      { key: "api", nodes: [] },
      { key: "service", nodes: [] },
      { key: "db", nodes: [] },
      { key: "unknown", nodes: [] },
    ];

    nodes.forEach((node) => {
      const lane = lanes.find((item) => item.key === classifyNode(node.id));
      if (lane) lane.nodes.push(node);
    });

    lanes.forEach((lane) => lane.nodes.sort((left, right) => left.id.localeCompare(right.id)));

    const nodeWidth = 190;
    const nodeHeight = 62;
    const columnGap = 56;
    const rowGap = 46;
    const laneGap = 140;
    const startX = 70;
    const startY = 70;

    let laneCursorX = startX;
    const placedNodes: Node[] = [];

    lanes.forEach((lane) => {
      if (lane.nodes.length === 0) return;

      const laneColumns = clamp(Math.ceil(Math.sqrt(lane.nodes.length)), 1, 5);
      const laneWidth = laneColumns * nodeWidth + (laneColumns - 1) * columnGap;

      lane.nodes.forEach((node, index) => {
        const type = classifyNode(node.id);
        const row = Math.floor(index / laneColumns);
        const col = index % laneColumns;

        const isHighlighted = highlightedNodes.includes(node.id);
        const isSelected = selectedNodeId === node.id;

        const x = laneCursorX + col * (nodeWidth + columnGap);
        const y = startY + row * (nodeHeight + rowGap);

        placedNodes.push({
          id: node.id,
          data: { label: formatNodeLabel(node.id) },
          position: { x, y },
          draggable: false,
          style: {
            borderRadius: 12,
            border: isSelected ? "2px solid #0f172a" : "1px solid #cbd5e1",
            color: "#0f172a",
            background: `linear-gradient(90deg, ${nodeColorByType(type)} 0 8px, ${
              isHighlighted ? "#fff7ed" : "#ffffff"
            } 8px)`,
            boxShadow: isHighlighted
              ? "0 8px 22px -14px rgba(249, 115, 22, 0.7)"
              : "0 4px 14px -10px rgba(15, 23, 42, 0.4)",
            minWidth: nodeWidth,
            fontWeight: 600,
          },
        });
      });

      laneCursorX += laneWidth + laneGap;
    });

    return placedNodes;
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
      const label = isDataFlowView ? (flowRecord?.data ?? edge.relation) : isHighlighted ? edge.relation : "";

      return {
        id: edgeKey,
        source: edge.source,
        target: edge.target,
        label,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, color: isHighlighted ? "#f97316" : "#94a3b8" },
        animated: isHighlighted || (isDataFlowView && Boolean(flowRecord)),
        style: {
          stroke: isDataFlowView && flowRecord ? "#0891b2" : isHighlighted ? "#f97316" : "#94a3b8",
          strokeWidth: isDataFlowView && flowRecord ? 2.8 : isHighlighted ? 2.5 : 1.4,
          strokeDasharray: isDataFlowView ? "6 4" : isHighlighted ? "4 4" : "0",
          opacity: isHighlighted || isDataFlowView ? 1 : 0.75,
        },
        labelStyle: { fontSize: 10, fontWeight: 700, fill: "#334155" },
        labelBgPadding: [6, 3],
        labelBgBorderRadius: 6,
        labelBgStyle: { fill: "#f8fafc", fillOpacity: 0.95 },
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
        fitViewOptions={{ padding: 0.22, minZoom: 0.2, maxZoom: 1.5 }}
        defaultEdgeOptions={{ type: "smoothstep" }}
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={handleNodeClick}
        proOptions={{ hideAttribution: true }}
      >
        <MiniMap
          zoomable
          pannable
          nodeColor={(node) => nodeColorByType(classifyNode(node.id))}
          className="rounded-lg border border-slate-200 bg-white"
        />
        <Background color="#dbeafe" gap={26} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
