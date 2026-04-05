import type { FlowResponse, GraphResponse, ImpactResponse, RiskResponse } from "./types";

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
