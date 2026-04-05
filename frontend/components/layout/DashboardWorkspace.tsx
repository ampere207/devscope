"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { logoutAction } from "@/app/(auth)/actions";
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
  listAnalyses,
  runSimulation,
} from "@/lib/api/devscope";
import type {
  AIInsightsResponse,
  AnalysisListItem,
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

interface DashboardWorkspaceProps {
  userEmail: string;
  repoId?: string;
}

const demoNodes: GraphNode[] = [
  { id: "/api/payment", type: "api" },
  { id: "gateway", type: "service" },
  { id: "auth-service", type: "service" },
  { id: "payment-service", type: "service" },
  { id: "notification-service", type: "service" },
  { id: "database", type: "db" },
];

const demoEdges: GraphEdge[] = [
  { source: "/api/payment", target: "gateway", relation: "calls" },
  { source: "gateway", target: "auth-service", relation: "calls" },
  { source: "auth-service", target: "payment-service", relation: "calls" },
  { source: "payment-service", target: "database", relation: "writes" },
  { source: "payment-service", target: "notification-service", relation: "emits" },
];

const tabs = [
  { id: "details", label: "Details" },
  { id: "insights", label: "AI Insights" },
  { id: "impact", label: "Impact" },
  { id: "flow", label: "Flow" },
  { id: "dataflow", label: "Data Flow" },
  { id: "workflow", label: "Workflows" },
  { id: "api", label: "API" },
  { id: "risk", label: "Risk" },
  { id: "query", label: "Query" },
  { id: "simulation", label: "Simulation" },
  { id: "diff", label: "Diff" },
] as const;

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

export function DashboardWorkspace({ userEmail, repoId }: DashboardWorkspaceProps) {
  const router = useRouter();
  const { selectedNodeId, activeTab, highlightedNodes, setSelectedNode, setActiveTab, setHighlightedNodes } =
    useDashboardStore();

  const [graphView, setGraphView] = useState<(typeof graphViews)[number]["id"]>("graph");
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>(demoNodes);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>(demoEdges);
  const [graphStatus, setGraphStatus] = useState<"idle" | "loading" | "ready" | "error">(
    repoId ? "loading" : "idle",
  );
  const [graphError, setGraphError] = useState<string | null>(null);

  const [flowData, setFlowData] = useState<FlowResponse | null>(null);
  const [impactData, setImpactData] = useState<ImpactResponse | null>(null);
  const [riskData, setRiskData] = useState<RiskResponse | null>(null);
  const [dataFlowData, setDataFlowData] = useState<DataFlowResponse | null>(null);
  const [workflowData, setWorkflowData] = useState<WorkflowListResponse | null>(null);
  const [apiInsight, setApiInsight] = useState<ApiUnderstandingResponse | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [selectedBaselineId, setSelectedBaselineId] = useState("");
  const [simulationData, setSimulationData] = useState<SimulationResponse | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [diffData, setDiffData] = useState<DiffResponse | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [aiInsights, setAiInsights] = useState<AIInsightsResponse | null>(null);
  const [aiInsightsError, setAiInsightsError] = useState<string | null>(null);
  const [loading, setLoading] = useState({
    graph: false,
    flow: false,
    impact: false,
    risk: false,
    dataflow: false,
    workflow: false,
    api: false,
    analyses: false,
    simulation: false,
    diff: false,
    insights: false,
  });

  useEffect(() => {
    setSelectedNode(null);
    setHighlightedNodes([]);
    setActiveTab("details");
    setImpactData(null);
    setFlowData(null);
    setRiskData(null);
    setDataFlowData(null);
    setApiInsight(null);
    setWorkflowData(null);
    setSimulationData(null);
    setSimulationError(null);
    setDiffData(null);
    setDiffError(null);
    setSelectedBaselineId("");
    setAiInsights(null);
    setAiInsightsError(null);

    if (!repoId) {
      setGraphNodes(demoNodes);
      setGraphEdges(demoEdges);
      setGraphError(null);
      setGraphStatus("idle");
      setAnalyses([]);
      return;
    }

    const activeRepoId = repoId;

    let active = true;

    async function loadGraph() {
      setGraphStatus("loading");
      setGraphError(null);
      setLoading((current) => ({ ...current, graph: true, workflow: true, analyses: true, insights: true }));
      try {
        const [graph, workflows, analysisHistory, insights] = await Promise.all([
          getGraph(activeRepoId),
          getWorkflows(activeRepoId),
          listAnalyses(40),
          getAiInsights(activeRepoId).catch(() => null),
        ]);
        if (!active) {
          return;
        }
        setGraphNodes(graph.nodes);
        setGraphEdges(graph.edges);
        setWorkflowData(workflows);
        setAnalyses(analysisHistory.analyses);
        setAiInsights(insights);
        if (!insights) {
          setAiInsightsError("AI insights are temporarily unavailable for this analysis.");
        }
        setGraphStatus("ready");
      } catch {
        if (!active) {
          return;
        }
        setGraphNodes([]);
        setGraphEdges([]);
        setWorkflowData(null);
        setAnalyses([]);
        setAiInsights(null);
        setGraphStatus("error");
        setGraphError(
          "Unable to load live analysis data for this repository. Check that the backend is running and CORS is enabled.",
        );
      } finally {
        if (active) {
          setLoading((current) => ({
            ...current,
            graph: false,
            workflow: false,
            analyses: false,
            insights: false,
          }));
        }
      }
    }

    loadGraph();

    return () => {
      active = false;
    };
  }, [repoId]);

  const apiNodes = useMemo(
    () => graphNodes.filter((node) => node.id.toLowerCase().includes("api")).map((node) => node.id),
    [graphNodes],
  );

  const serviceNodes = useMemo(
    () => graphNodes.filter((node) => !node.id.toLowerCase().includes("api")).map((node) => node.id),
    [graphNodes],
  );

  async function handleSelectNode(nodeId: string) {
    setSelectedNode(nodeId);
    setActiveTab("details");

    if (!repoId) {
      // Demo mode: highlight downstream sample links for visual interaction.
      const demoHighlights = [nodeId, ...graphEdges.filter((edge) => edge.source === nodeId).map((edge) => edge.target)];
      setHighlightedNodes([...new Set(demoHighlights)]);
      return;
    }

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
        getImpact(repoId, nodeId),
        getFlow(repoId, nodeId),
        getRisk(repoId, nodeId),
        getDataFlow(repoId, nodeId),
        getApiUnderstanding(repoId, nodeId).catch(() => null),
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
    if (!repoId || !selectedNodeId) {
      return;
    }

    setSimulationError(null);
    setLoading((current) => ({ ...current, simulation: true }));
    try {
      const result = await runSimulation(repoId, selectedNodeId);
      setSimulationData(result);
    } catch {
      setSimulationData(null);
      setSimulationError("Simulation failed. Verify backend availability and try again.");
    } finally {
      setLoading((current) => ({ ...current, simulation: false }));
    }
  }

  async function handleRunDiff() {
    if (!repoId || !selectedBaselineId) {
      return;
    }

    setDiffError(null);
    setLoading((current) => ({ ...current, diff: true }));
    try {
      const result = await getDiff(repoId, selectedBaselineId, repoId);
      setDiffData(result);
    } catch {
      setDiffData(null);
      setDiffError("Diff request failed. Ensure both analysis snapshots are available.");
    } finally {
      setLoading((current) => ({ ...current, diff: false }));
    }
  }

  function handleSwitchAnalysis(targetAnalysisId: string) {
    if (!targetAnalysisId) {
      return;
    }
    router.push(`/dashboard?repo_id=${encodeURIComponent(targetAnalysisId)}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-375 flex-1 px-4 py-6 md:px-6">
      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)_360px]">
        <aside className="panel-card rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">DevScope</p>
              <p className="mt-1 text-sm text-slate-700">{userEmail}</p>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="btn-secondary text-xs">
                Logout
              </button>
            </form>
          </div>

          <div className="mt-5 rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-xs text-cyan-900">
            {repoId
              ? `Live analysis ${graphStatus === "loading" ? "loading" : graphStatus === "error" ? "failed" : "ready"}`
              : "Demo mode active: open with ?repo_id=... to fetch live graph"}
          </div>

          {graphError ? (
            <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              {graphError}
            </div>
          ) : null}

          <div className="mt-6 space-y-5">
            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Analysis History</p>
              <select
                value={repoId || ""}
                onChange={(event) => handleSwitchAnalysis(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <option value="">Current analysis</option>
                {analyses.map((analysis) => (
                  <option key={analysis.analysis_id} value={analysis.analysis_id}>
                    {analysis.repo_url} - {new Date(analysis.created_at).toLocaleString()}
                  </option>
                ))}
              </select>
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">APIs</p>
              <ul className="mt-2 space-y-2">
                {apiNodes.map((node) => (
                  <li key={node}>
                    <button
                      type="button"
                      onClick={() => handleSelectNode(node)}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700"
                    >
                      {node}
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Services</p>
              <ul className="mt-2 space-y-2">
                {serviceNodes.map((node) => (
                  <li key={node}>
                    <button
                      type="button"
                      onClick={() => handleSelectNode(node)}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700"
                    >
                      {node}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </aside>

        <section className="panel-card rounded-2xl p-3">
          <div className="mb-3 flex flex-wrap gap-2 px-1">
            {graphViews.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => setGraphView(view.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  graphView === view.id ? "bg-cyan-700 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>

          {loading.graph ? (
            <div className="mb-3 rounded-lg border border-cyan-100 bg-cyan-50 px-3 py-2 text-xs text-cyan-900">
              Loading graph for selected repository...
            </div>
          ) : null}

          {!loading.graph && repoId && graphStatus === "error" ? (
            <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              The imported repo could not be loaded into the graph view. Retry the import after restarting the backend.
            </div>
          ) : null}

          {graphNodes.length > 0 ? (
            <SystemGraph
              nodes={graphNodes}
              edges={graphEdges}
              highlightedNodes={highlightedNodes}
              selectedNodeId={selectedNodeId}
              dataFlowRecords={dataFlowData?.data_flow}
              viewMode={graphView === "dataflow" ? "dataflow" : graphView === "flow" ? "flow" : "graph"}
              onNodeClick={handleSelectNode}
            />
          ) : (
            <div className="flex min-h-155 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-8 text-center text-sm text-slate-500">
              {repoId
                ? "No graph data is available yet for this repository import."
                : "Import a repository to render its graph here."}
            </div>
          )}
        </section>

        <section className="panel-card rounded-2xl p-4">
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  activeTab === tab.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {activeTab === "details" ? (
              <div className="space-y-3 text-sm text-slate-700">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Node details</p>
                <p>{selectedNodeId ? `Selected node: ${selectedNodeId}` : "Select a node to inspect details."}</p>
                <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-slate-600">
                  Click a node to load impact, flow, dataflow, risk, and AI explanations for the imported repo.
                </p>
              </div>
            ) : null}

            {activeTab === "insights" ? (
              <AIInsightsPanel insights={aiInsights} loading={loading.insights} error={aiInsightsError} />
            ) : null}

            {activeTab === "impact" ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Impact summary</p>
                {loading.impact ? <p className="text-sm text-slate-500">Computing impact...</p> : null}
                {!loading.impact && !impactData ? (
                  <p className="text-sm text-slate-500">Select a node to compute affected APIs and flows.</p>
                ) : null}
                {impactData ? (
                  <>
                    <p className="text-sm text-slate-700">
                      Affected nodes: <span className="font-semibold">{impactData.affected_nodes.length}</span>
                    </p>
                    <p className="text-sm text-slate-700">
                      Affected APIs: <span className="font-semibold">{impactData.affected_apis.join(", ") || "none"}</span>
                    </p>
                    <p className="text-sm text-slate-700">
                      Affected flows: <span className="font-semibold">{impactData.affected_flows.length}</span>
                    </p>
                  </>
                ) : null}
              </div>
            ) : null}

            {activeTab === "flow" ? <FlowPanel flow={flowData} loading={loading.flow} /> : null}
            {activeTab === "dataflow" ? (
              <DataFlowPanel dataFlow={dataFlowData} loading={loading.dataflow} />
            ) : null}
            {activeTab === "workflow" ? (
              <WorkflowPanel workflows={workflowData} loading={loading.workflow} />
            ) : null}
            {activeTab === "api" ? <ApiInspectorPanel apiInsight={apiInsight} loading={loading.api} /> : null}
            {activeTab === "risk" ? <RiskPanel risk={riskData} loading={loading.risk} /> : null}
            {activeTab === "query" ? (
              <QueryPanel selectedNodeId={selectedNodeId} edges={graphEdges} onHighlightNodes={setHighlightedNodes} />
            ) : null}
            {activeTab === "simulation" ? (
              <SimulationPanel
                selectedNodeId={selectedNodeId}
                onSimulate={handleRunSimulation}
                loading={loading.simulation}
                simulation={simulationData}
                error={simulationError}
              />
            ) : null}
            {activeTab === "diff" ? (
              <DiffPanel
                currentAnalysisId={repoId}
                analyses={analyses}
                selectedBaselineId={selectedBaselineId}
                onSelectBaseline={setSelectedBaselineId}
                onRunDiff={handleRunDiff}
                loading={loading.diff}
                diff={diffData}
                error={diffError}
              />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
