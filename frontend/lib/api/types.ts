export type GraphNodeType = "api" | "service" | "db" | "unknown";

export interface GraphNode {
  id: string;
  type: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ImpactResponse {
  node: string;
  impact_nodes: string[];
  dependency_nodes: string[];
  affected_nodes: string[];
  affected_apis: string[];
  affected_flows: string[][];
}

export interface FlowResponse {
  node: string;
  paths: string[][];
}

export interface RiskResponse {
  node: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  score: number;
  reasons: string[];
}

export interface QueryResult {
  answer: string;
  highlightedNodes: string[];
}
