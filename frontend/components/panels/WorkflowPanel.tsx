import type { WorkflowListResponse } from "@/lib/api/types";

interface WorkflowPanelProps {
  workflows: WorkflowListResponse | null;
  loading: boolean;
}

export function WorkflowPanel({ workflows, loading }: WorkflowPanelProps) {
  if (loading) {
    return <p className="text-sm text-slate-500">Detecting recurring workflows...</p>;
  }

  if (!workflows || workflows.workflows.length === 0) {
    return <p className="text-sm text-slate-500">No recurring workflows detected yet.</p>;
  }

  return (
    <div className="space-y-3">
      {workflows.workflows.map((workflow) => (
        <article
          key={`${workflow.workflow_name}-${workflow.path_count}-${workflow.steps.join("->")}`}
          className="rounded-lg border border-slate-200 bg-white p-3"
        >
          <h3 className="text-sm font-semibold text-slate-900">{workflow.workflow_name}</h3>
          <p className="mt-1 text-xs text-slate-500">Observed paths: {workflow.path_count}</p>
          <p className="mt-2 text-sm text-slate-700">{workflow.steps.join(" -> ")}</p>
          <p className="mt-2 text-xs text-slate-500">APIs: {workflow.apis.join(", ") || "none"}</p>
        </article>
      ))}
    </div>
  );
}
