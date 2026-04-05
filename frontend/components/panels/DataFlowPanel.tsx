import type { DataFlowResponse } from "@/lib/api/types";

interface DataFlowPanelProps {
  dataFlow: DataFlowResponse | null;
  loading: boolean;
}

export function DataFlowPanel({ dataFlow, loading }: DataFlowPanelProps) {
  if (loading) {
    return <p className="text-sm text-slate-500">Tracing data movement...</p>;
  }

  if (!dataFlow || dataFlow.data_flow.length === 0) {
    return <p className="text-sm text-slate-500">Select a node to inspect inferred data movement.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Data flow from {dataFlow.node}</p>
      {dataFlow.data_flow.map((item, index) => (
        <div
          key={`${item.from}-${item.to}-${index}`}
          className="rounded-lg border border-slate-200 bg-white p-3"
        >
          <p className="text-sm font-semibold text-slate-800">
            {item.from} {"->"} {item.to}
          </p>
          <p className="mt-1 text-xs text-slate-600">Data: {item.data}</p>
          <p className="mt-1 text-xs text-slate-600">Payload: {item.payload}</p>
          <p className="mt-1 text-xs text-slate-500">Relation: {item.relation}</p>
        </div>
      ))}
    </div>
  );
}
