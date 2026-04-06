"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SystemGraph } from "@/components/graph/SystemGraph";
import { AIInsightsPanel } from "@/components/panels/AIInsightsPanel";
import { ApiInspectorPanel } from "@/components/panels/ApiInspectorPanel";
import { DataFlowPanel } from "@/components/panels/DataFlowPanel";
import { DiffPanel } from "@/components/panels/DiffPanel";
import { FlowPanel } from "@/components/panels/FlowPanel";
import { QueryPanel } from "@/components/panels/QueryPanel";
import { RiskPanel } from "@/components/panels/RiskPanel";
import { SimulationPanel } from "@/components/panels/SimulationPanel";
import { WorkflowPanel } from "@/components/panels/WorkflowPanel";
import {
  getAiInsights,
  getApiUnderstanding,
  getDataFlow,
  getDiff,
  getFlow,
  getGraph,
  getImpact,
  getRisk,
  getWorkflows,
  runSimulation,
} from "@/lib/api/devscope";
import type {
  AIInsightsResponse,
  ApiUnderstandingResponse,
  DataFlowResponse,
  DiffResponse,
  FlowResponse,
  GraphEdge,
  GraphNode,
  ImpactResponse,
  RiskResponse,
  SimulationResponse,
  WorkflowListResponse,
} from "@/lib/api/types";
import { useDashboardStore } from "@/services/dashboard-store";

interface RepoAnalysisProps {
  analysisId: string;
}

const graphViews = [
  { id: "graph", label: "Graph View" },
  { id: "flow", label: "Flow View" },
  { id: "dataflow", label: "Data Flow View" },
  { id: "workflow", label: "Workflow View" },
  { id: "api", label: "API View" },
  { id: "risk", label: "Risk View" },
  { id: "simulation", label: "Simulation View" },
  { id: "diff", label: "Diff View" },
] as const;

const tabs = [
  { id: "details", label: "Details" },
  { id: "insights", label: "AI Insights" },
  { id: "impact", label: "Impact" },
  { id: "flow", label: "Flow" },
  { id: "dataflow", label: "Data Flow" },
  { id: "workflow", label: "Workflows" },
  { id: "api", label: "API" },
  { id: "risk", label: "Risk" },
] as const;

type RiskLevel = RiskResponse["risk_level"];

function buildNodeRiskLevels(nodes: GraphNode[], edges: GraphEdge[]): Record<string, RiskLevel> {
  const forward = new Map<string, string[]>();
  const reverse = new Map<string, string[]>();

  for (const edge of edges) {
    const forwardList = forward.get(edge.source) || [];
    forwardList.push(edge.target);
    forward.set(edge.source, forwardList);

    const reverseList = reverse.get(edge.target) || [];
    reverseList.push(edge.source);
    reverse.set(edge.target, reverseList);
  }

  const visit = (start: string, graph: Map<string, string[]>) => {
    const seen = new Set<string>();
    const stack = [...(graph.get(start) || [])];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || seen.has(current)) continue;
      seen.add(current);
      const neighbors = graph.get(current) || [];
      for (const neighbor of neighbors) {
        if (!seen.has(neighbor)) stack.push(neighbor);
      }
    }

    return seen;
  };

  const criticalKeywords = ["auth", "payment", "db", "database", "postgres", "mysql", "redis"];
  const riskLevels: Record<string, RiskLevel> = {};

  for (const node of nodes) {
    const descendants = visit(node.id, forward);
    const ancestors = visit(node.id, reverse);
    const relevantNodes = new Set([node.id, ...descendants]);

    let criticalHits = 0;
    for (const candidate of relevantNodes) {
      const normalized = candidate.toLowerCase();
      if (criticalKeywords.some((keyword) => normalized.includes(keyword))) {
        criticalHits += 1;
      }
    }

    const blastRadiusScore = Math.min(0.45, descendants.size * 0.06);
    const criticalScore = Math.min(0.35, criticalHits * 0.12);
    const apiExposure =
      node.id.toLowerCase().startsWith("/api") ||
      node.id.toLowerCase().includes("api") ||
      Array.from(ancestors).some((ancestor) => {
        const normalized = ancestor.toLowerCase();
        return normalized.startsWith("/api") || normalized.includes("api");
      });
    const exposureScore = apiExposure ? 0.2 : 0;
    const score = Math.min(1, blastRadiusScore + criticalScore + exposureScore);

    riskLevels[node.id] = score >= 0.7 ? "HIGH" : score >= 0.4 ? "MEDIUM" : "LOW";
  }

  return riskLevels;
}

export function RepoAnalysis({ analysisId }: RepoAnalysisProps) {
  const router = useRouter();
  const { selectedNodeId, activeTab, highlightedNodes, setSelectedNode, setActiveTab, setHighlightedNodes } =
    useDashboardStore();

  const [graphView, setGraphView] = useState<(typeof graphViews)[number]["id"]>("graph");
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [graphStatus, setGraphStatus] = useState<"idle" | "loading" | "ready" | "error">("loading");
  const [graphError, setGraphError] = useState<string | null>(null);

  const [flowData, setFlowData] = useState<FlowResponse | null>(null);
  const [impactData, setImpactData] = useState<ImpactResponse | null>(null);
  const [riskData, setRiskData] = useState<RiskResponse | null>(null);
  const [dataFlowData, setDataFlowData] = useState<DataFlowResponse | null>(null);
  const [workflowData, setWorkflowData] = useState<WorkflowListResponse | null>(null);
  const [apiInsight, setApiInsight] = useState<ApiUnderstandingResponse | null>(null);
  const [simulationData, setSimulationData] = useState<SimulationResponse | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [diffData, setDiffData] = useState<DiffResponse | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsightsResponse | null>(null);
  const [aiInsightsError, setAiInsightsError] = useState<string | null>(null);
  const [loading, setLoading] = useState({
    graph: true,
    flow: false,
    impact: false,
    risk: false,
    dataflow: false,
    workflow: false,
    api: false,
    insights: false,
    simulation: false,
    diff: false,
  });

  // Load graph on mount
  useEffect(() => {
    setSelectedNode(null);
    setHighlightedNodes([]);
    setActiveTab("details");

    let active = true;

    async function loadGraph() {
      setGraphStatus("loading");
      setGraphError(null);
      try {
        const [graph, insights] = await Promise.all([
          getGraph(analysisId),
          getAiInsights(analysisId).catch(() => null),
        ]);
        if (!active) return;

        setGraphNodes(graph.nodes);
        setGraphEdges(graph.edges);
        setAiInsights(insights);
        if (!insights) {
          setAiInsightsError("AI insights temporarily unavailable");
        }
        setGraphStatus("ready");
      } catch (error) {
        if (!active) return;
        setGraphNodes([]);
        setGraphEdges([]);
        setGraphStatus("error");
        setGraphError("Failed to load repository analysis. Ensure the backend is running.");
      } finally {
        if (active) {
          setLoading((current) => ({ ...current, graph: false }));
        }
      }
    }

    loadGraph();
    return () => {
      active = false;
    };
  }, [analysisId, setSelectedNode, setHighlightedNodes, setActiveTab]);

  // Auto-switch tab when graph view changes
  useEffect(() => {
    const viewTabMap: Record<(typeof graphViews)[number]["id"], (typeof tabs)[number]["id"]> = {
      graph: "details",
      flow: "flow",
      dataflow: "dataflow",
      workflow: "workflow",
      api: "api",
      risk: "risk",
      simulation: "details",
      diff: "details",
    };
    setActiveTab(viewTabMap[graphView]);
  }, [graphView, setActiveTab]);

  const apiNodes = useMemo(
    () => graphNodes.filter((node) => node.id.toLowerCase().includes("api")).map((node) => node.id),
    [graphNodes],
  );

  const serviceNodes = useMemo(
    () => graphNodes.filter((node) => !node.id.toLowerCase().includes("api")).map((node) => node.id),
    [graphNodes],
  );

  const nodeRiskLevels = useMemo(() => buildNodeRiskLevels(graphNodes, graphEdges), [graphNodes, graphEdges]);

  async function handleSelectNode(nodeId: string) {
    setSelectedNode(nodeId);
    setActiveTab("details");

    setLoading((current) => ({
      ...current,
      impact: true,
      flow: true,
      risk: true,
      dataflow: true,
      api: true,
    }));
    try {
      const [impact, flow, risk, dataFlow, api] = await Promise.all([
        getImpact(analysisId, nodeId),
        getFlow(analysisId, nodeId),
        getRisk(analysisId, nodeId),
        getDataFlow(analysisId, nodeId),
        getApiUnderstanding(analysisId, nodeId).catch(() => null),
      ]);

      setImpactData(impact);
      setFlowData(flow);
      setRiskData(risk);
      setDataFlowData(dataFlow);
      setApiInsight(api);

      const pathNodes = flow.paths.flat();
      const dataFlowNodes = dataFlow.data_flow.flatMap((item) => [item.from, item.to]);
      setHighlightedNodes([...new Set([nodeId, ...impact.affected_nodes, ...pathNodes, ...dataFlowNodes])]);
    } catch {
      setImpactData(null);
      setFlowData(null);
      setRiskData(null);
      setDataFlowData(null);
      setApiInsight(null);
      setHighlightedNodes([nodeId]);
    } finally {
      setLoading((current) => ({
        ...current,
        impact: false,
        flow: false,
        risk: false,
        dataflow: false,
        api: false,
      }));
    }
  }

  async function handleRunSimulation() {
    if (!selectedNodeId) return;

    setSimulationError(null);
    setLoading((current) => ({ ...current, simulation: true }));
    try {
      const result = await runSimulation(analysisId, selectedNodeId);
      setSimulationData(result);
    } catch {
      setSimulationData(null);
      setSimulationError("Simulation failed. Try again.");
    } finally {
      setLoading((current) => ({ ...current, simulation: false }));
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-375 flex-1 px-4 py-6 md:px-6">
      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
        {/* Left Sidebar - Nodes */}
        <aside className="panel-card rounded-2xl p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Analysis</p>
              <p className="mt-1 text-xs text-slate-600 break-all">{analysisId}</p>
            </div>
            <button
              onClick={() => router.push("/dashboard")}
              className="btn-secondary text-xs px-2 py-1"
              title="Back to dashboard"
            >
              ←
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-xs text-cyan-900">
            {graphStatus === "loading" ? "Loading graph..." : graphStatus === "error" ? "Failed to load" : "Ready"}
          </div>

          {graphError && (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {graphError}
            </div>
          )}

          <div className="mt-6 space-y-5">
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">APIs</p>
              <ul className="mt-2 space-y-2">
                {apiNodes.slice(0, 8).map((node) => (
                  <li key={node}>
                    <button
                      type="button"
                      onClick={() => handleSelectNode(node)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-xs font-medium truncate ${
                        selectedNodeId === node
                          ? "border-blue-500 bg-blue-50 text-blue-900"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                      title={node}
                    >
                      {node}
                    </button>
                  </li>
                ))}
                {apiNodes.length > 8 && (
                  <p className="text-xs text-slate-500 px-2">+{apiNodes.length - 8} more</p>
                )}
              </ul>
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Services</p>
              <ul className="mt-2 space-y-2">
                {serviceNodes.slice(0, 8).map((node) => (
                  <li key={node}>
                    <button
                      type="button"
                      onClick={() => handleSelectNode(node)}
                      className={`w-full rounded-md border px-3 py-2 text-left text-xs font-medium truncate ${
                        selectedNodeId === node
                          ? "border-blue-500 bg-blue-50 text-blue-900"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                      title={node}
                    >
                      {node}
                    </button>
                  </li>
                ))}
                {serviceNodes.length > 8 && (
                  <p className="text-xs text-slate-500 px-2">+{serviceNodes.length - 8} more</p>
                )}
              </ul>
            </section>
          </div>
        </aside>

        {/* Center - Graph */}
        <section className="panel-card rounded-2xl p-3">
          <div className="mb-3 flex flex-wrap gap-2 px-1">
            {graphViews.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => setGraphView(view.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  graphView === view.id ? "bg-cyan-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>

          {graphStatus === "loading" && (
            <div className="mb-3 rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-900">
              Loading repository graph...
            </div>
          )}

          {graphStatus === "error" && (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              Failed to load graph. Check backend connection.
            </div>
          )}

          {graphNodes.length > 0 ? (
            <SystemGraph
              nodes={graphNodes}
              edges={graphEdges}
              highlightedNodes={highlightedNodes}
              selectedNodeId={selectedNodeId}
              dataFlowRecords={dataFlowData?.data_flow}
              riskLevels={nodeRiskLevels}
              viewMode={graphView === "dataflow" ? "dataflow" : graphView === "flow" ? "flow" : "graph"}
              onNodeClick={handleSelectNode}
            />
          ) : !graphStatus || graphStatus === "ready" ? (
            <div className="flex min-h-155 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-8 text-center text-sm text-slate-500">
              No graph data available.
            </div>
          ) : null}
        </section>

        {/* Right - Details (NO TAB BUTTONS - just content) */}
        <section className="panel-card rounded-2xl p-4 flex flex-col">
          {/* Active Tab Indicator (no buttons) */}
          <div className="mb-4 pb-3 border-b border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {tabs.find((t) => t.id === activeTab)?.label || "Details"}
            </p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "details" && (
              <div className="space-y-3 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Node Details</p>
                <p>{selectedNodeId ? `Selected: ${selectedNodeId}` : "Select a node to see details."}</p>
                {impactData && (
                  <>
                    <p className="text-sm text-slate-700">
                      Affected: <span className="font-semibold">{impactData.affected_nodes.length}</span>
                    </p>
                    <p className="text-sm text-slate-700">
                      APIs: <span className="font-semibold">{impactData.affected_apis.join(", ") || "none"}</span>
                    </p>
                  </>
                )}
              </div>
            )}

            {activeTab === "insights" && (
              <AIInsightsPanel insights={aiInsights} loading={false} error={aiInsightsError} />
            )}

            {activeTab === "impact" && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Impact Summary</p>
                {!impactData ? (
                  <p className="text-sm text-slate-500">Select a node to compute impact.</p>
                ) : (
                  <>
                    <p className="text-sm text-slate-700">
                      Affected nodes: <span className="font-semibold">{impactData.affected_nodes.length}</span>
                    </p>
                    <p className="text-sm text-slate-700">
                      Affected flows: <span className="font-semibold">{impactData.affected_flows.length}</span>
                    </p>
                  </>
                )}
              </div>
            )}

            {activeTab === "flow" && <FlowPanel flow={flowData} loading={loading.flow} />}
            {activeTab === "dataflow" && <DataFlowPanel dataFlow={dataFlowData} loading={loading.dataflow} />}
            {activeTab === "workflow" && <WorkflowPanel workflows={workflowData} loading={loading.workflow} />}
            {activeTab === "api" && <ApiInspectorPanel apiInsight={apiInsight} loading={loading.api} />}
            {activeTab === "risk" && <RiskPanel risk={riskData} loading={loading.risk} />}
          </div>
        </section>
      </div>
    </main>
  );
}
