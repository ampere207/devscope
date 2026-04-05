import type {
  AIInsightsResponse,
  AnalysisListResponse,
  ApiUnderstandingResponse,
  DataFlowResponse,
  DiffResponse,
  FlowResponse,
  GraphResponse,
  ImpactResponse,
  RiskResponse,
  SimulationResponse,
  WorkflowListResponse,
} from "./types";

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

async function postJson<T>(path: string, payload: object): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getGraph(repoId: string): Promise<GraphResponse> {
  return fetchJson<GraphResponse>(`/api/graph?repo_id=${encodeURIComponent(repoId)}`);
}

export async function getImpact(repoId: string, node: string): Promise<ImpactResponse> {
  return fetchJson<ImpactResponse>(
    `/api/impact?repo_id=${encodeURIComponent(repoId)}&node=${encodeURIComponent(node)}`,
  );
}

export async function getFlow(repoId: string, node: string): Promise<FlowResponse> {
  return fetchJson<FlowResponse>(
    `/api/flow?repo_id=${encodeURIComponent(repoId)}&node=${encodeURIComponent(node)}`,
  );
}

export async function getRisk(repoId: string, node: string): Promise<RiskResponse> {
  return fetchJson<RiskResponse>(
    `/api/risk?repo_id=${encodeURIComponent(repoId)}&node=${encodeURIComponent(node)}`,
  );
}

export async function getDataFlow(repoId: string, node: string): Promise<DataFlowResponse> {
  return fetchJson<DataFlowResponse>(
    `/api/dataflow?repo_id=${encodeURIComponent(repoId)}&node=${encodeURIComponent(node)}`,
  );
}

export async function getWorkflows(repoId: string): Promise<WorkflowListResponse> {
  return fetchJson<WorkflowListResponse>(`/api/workflows?repo_id=${encodeURIComponent(repoId)}`);
}

export async function getApiUnderstanding(repoId: string, node: string): Promise<ApiUnderstandingResponse> {
  return fetchJson<ApiUnderstandingResponse>(
    `/api/api-understanding?repo_id=${encodeURIComponent(repoId)}&node=${encodeURIComponent(node)}`,
  );
}

export async function listAnalyses(limit = 20): Promise<AnalysisListResponse> {
  return fetchJson<AnalysisListResponse>(`/api/analyses?limit=${encodeURIComponent(String(limit))}`);
}

export async function runSimulation(repoId: string, node: string): Promise<SimulationResponse> {
  return postJson<SimulationResponse>("/api/simulate", { repo_id: repoId, node });
}

export async function getDiff(repoId: string, analysisIdA: string, analysisIdB: string): Promise<DiffResponse> {
  return fetchJson<DiffResponse>(
    `/api/diff?repo_id=${encodeURIComponent(repoId)}&analysis_id_a=${encodeURIComponent(analysisIdA)}&analysis_id_b=${encodeURIComponent(analysisIdB)}`,
  );
}

export async function getAiInsights(repoId: string): Promise<AIInsightsResponse> {
  return fetchJson<AIInsightsResponse>(`/api/ai-insights?repo_id=${encodeURIComponent(repoId)}`);
}
