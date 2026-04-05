import { create } from "zustand";

interface DashboardState {
  selectedNodeId: string | null;
  activeTab: "details" | "impact" | "flow" | "risk" | "query";
  highlightedNodes: string[];
  setSelectedNode: (nodeId: string | null) => void;
  setActiveTab: (tab: DashboardState["activeTab"]) => void;
  setHighlightedNodes: (nodes: string[]) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  selectedNodeId: null,
  activeTab: "details",
  highlightedNodes: [],
  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setHighlightedNodes: (nodes) => set({ highlightedNodes: nodes }),
}));
