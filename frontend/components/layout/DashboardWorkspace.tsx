"use client";

import { useMemo, useState } from "react";

import { logoutAction } from "@/app/(auth)/actions";
import { SystemGraph } from "@/components/graph/SystemGraph";
import { FlowPanel } from "@/components/panels/FlowPanel";
import { QueryPanel } from "@/components/panels/QueryPanel";
import { RiskPanel } from "@/components/panels/RiskPanel";
import { getFlow, getImpact, getRisk } from "@/lib/api/devscope";
import type { FlowResponse, GraphEdge, GraphNode, ImpactResponse, RiskResponse } from "@/lib/api/types";
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
  { id: "impact", label: "Impact" },
  { id: "flow", label: "Flow" },
  { id: "risk", label: "Risk" },
  { id: "query", label: "Query" },
] as const;

export function DashboardWorkspace({ userEmail, repoId }: DashboardWorkspaceProps) {
  const { selectedNodeId, activeTab, highlightedNodes, setSelectedNode, setActiveTab, setHighlightedNodes } =
    useDashboardStore();

  const [flowData, setFlowData] = useState<FlowResponse | null>(null);
  const [impactData, setImpactData] = useState<ImpactResponse | null>(null);
  const [riskData, setRiskData] = useState<RiskResponse | null>(null);
  const [loading, setLoading] = useState({ flow: false, impact: false, risk: false });

  const graphNodes = demoNodes;
  const graphEdges = demoEdges;

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

    setLoading((current) => ({ ...current, impact: true, flow: true, risk: true }));
    try {
      const [impact, flow, risk] = await Promise.all([
        getImpact(repoId, nodeId),
        getFlow(repoId, nodeId),
        getRisk(repoId, nodeId),
      ]);

      setImpactData(impact);
      setFlowData(flow);
      setRiskData(risk);

      const pathNodes = flow.paths.flat();
      setHighlightedNodes([...new Set([nodeId, ...impact.affected_nodes, ...pathNodes])]);
    } catch {
      setImpactData(null);
      setFlowData(null);
      setRiskData(null);
      setHighlightedNodes([nodeId]);
    } finally {
      setLoading((current) => ({ ...current, impact: false, flow: false, risk: false }));
    }
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
            {repoId ? `Analyzing repo ${repoId}` : "Demo mode active: open with ?repo_id=... to fetch live graph"}
          </div>

          <div className="mt-6 space-y-5">
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
          <SystemGraph
            nodes={graphNodes}
            edges={graphEdges}
            highlightedNodes={highlightedNodes}
            selectedNodeId={selectedNodeId}
            onNodeClick={handleSelectNode}
          />
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
                  Hover and click nodes to inspect impact, flow traces, and risk in deterministic mode.
                </p>
              </div>
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
            {activeTab === "risk" ? <RiskPanel risk={riskData} loading={loading.risk} /> : null}
            {activeTab === "query" ? (
              <QueryPanel selectedNodeId={selectedNodeId} edges={graphEdges} onHighlightNodes={setHighlightedNodes} />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
