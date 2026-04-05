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
  ai_explanation?: string;
}

export interface DataFlowRecord {
  from: string;
  to: string;
  data: string;
  payload: string;
  relation: string;
}

export interface DataFlowResponse {
  node: string;
  data_flow: DataFlowRecord[];
}

export interface WorkflowSummary {
  workflow_name: string;
  steps: string[];
  path_count: number;
  apis: string[];
}

export interface WorkflowListResponse {
  workflows: WorkflowSummary[];
}

export interface ApiUnderstandingResponse {
  api: string;
  description: string;
  flow: string[][];
  data_usage: DataFlowRecord[];
  services_involved: string[];
  db_interactions: string[];
  output_effects: string[];
}

export interface AnalysisListItem {
  analysis_id: string;
  repo_url: string;
  created_at: string;
}

export interface AnalysisListResponse {
  analyses: AnalysisListItem[];
}

export interface DegradedFlowRecord {
  api: string;
  before_count: number;
  after_count: number;
  removed_paths: string[][];
}

export interface SimulationResponse {
  affected_services: string[];
  broken_apis: string[];
  degraded_flows: DegradedFlowRecord[];
}

export interface ChangedFlowRecord {
  api: string;
  before_count: number;
  after_count: number;
  added_paths: string[][];
  removed_paths: string[][];
}

export interface RiskAggregate {
  average_score: number;
  high_risk_nodes: number;
  total_nodes: number;
}

export interface DiffResponse {
  new_dependencies: GraphEdge[];
  removed_dependencies: GraphEdge[];
  changed_flows: ChangedFlowRecord[];
  risk_delta: {
    before: RiskAggregate;
    after: RiskAggregate;
  };
}

export interface AIInsightsResponse {
  architecture_summary: string;
  risk_reasoning: string;
  refactor_suggestions: string[];
  anti_patterns: string[];
}

export interface QueryResult {
  answer: string;
  highlightedNodes: string[];
}
