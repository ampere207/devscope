import type { FlowResponse } from "@/lib/api/types";

interface FlowPanelProps {
  flow: FlowResponse | null;
  loading: boolean;
}

export function FlowPanel({ flow, loading }: FlowPanelProps) {
  if (loading) {
    return <p className="text-sm text-slate-500">Tracing execution paths...</p>;
  }

  if (!flow || flow.paths.length === 0) {
    return <p className="text-sm text-slate-500">Select an API or service node to inspect flow paths.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Flow paths from {flow.node}</p>
      {flow.paths.map((path, index) => (
        <div key={`${path.join("->")}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold text-slate-500">Path {index + 1}</p>
          <p className="mt-1 text-sm font-medium text-slate-700">{path.join(" -> ")}</p>
        </div>
      ))}
    </div>
  );
}
