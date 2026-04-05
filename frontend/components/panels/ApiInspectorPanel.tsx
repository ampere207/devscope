import type { ApiUnderstandingResponse } from "@/lib/api/types";

interface ApiInspectorPanelProps {
  apiInsight: ApiUnderstandingResponse | null;
  loading: boolean;
}

export function ApiInspectorPanel({ apiInsight, loading }: ApiInspectorPanelProps) {
  if (loading) {
    return <p className="text-sm text-slate-500">Building API understanding...</p>;
  }

  if (!apiInsight) {
    return <p className="text-sm text-slate-500">Select an API node to inspect internals.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">API</p>
        <p className="mt-1 text-sm font-semibold text-slate-900">{apiInsight.api}</p>
      </div>

      <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-900">Explanation</p>
        <p className="mt-2 text-sm text-cyan-950">{apiInsight.description}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Services involved</p>
        <p className="mt-1 text-sm text-slate-700">{apiInsight.services_involved.join(", ") || "none"}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Database interactions</p>
        <p className="mt-1 text-sm text-slate-700">{apiInsight.db_interactions.join(", ") || "none"}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Output effects</p>
        <p className="mt-1 text-sm text-slate-700">{apiInsight.output_effects.join(", ") || "none"}</p>
      </div>
    </div>
  );
}
