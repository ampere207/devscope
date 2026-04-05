import type { SimulationResponse } from "@/lib/api/types";

interface SimulationPanelProps {
  selectedNodeId: string | null;
  onSimulate: () => void;
  loading: boolean;
  simulation: SimulationResponse | null;
  error: string | null;
}

export function SimulationPanel({ selectedNodeId, onSimulate, loading, simulation, error }: SimulationPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSimulate}
          disabled={!selectedNodeId || loading}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? "Simulating..." : "Simulate Failure"}
        </button>
        <p className="text-xs text-slate-500">
          {selectedNodeId ? `Node: ${selectedNodeId}` : "Select a node in the graph to run simulation."}
        </p>
      </div>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

      {!simulation ? (
        <p className="text-sm text-slate-500">Run a simulation to inspect broken APIs and degraded flows.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <p>
              Broken APIs: <span className="font-semibold">{simulation.broken_apis.length}</span>
            </p>
            <p>
              Affected Services: <span className="font-semibold">{simulation.affected_services.length}</span>
            </p>
            <p>
              Degraded Flows: <span className="font-semibold">{simulation.degraded_flows.length}</span>
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Broken APIs</p>
            <p className="mt-1 text-sm text-slate-700">{simulation.broken_apis.join(", ") || "none"}</p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Affected Services</p>
            <p className="mt-1 text-sm text-slate-700">{simulation.affected_services.join(", ") || "none"}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Degraded Flows</p>
            {simulation.degraded_flows.length === 0 ? (
              <p className="text-sm text-slate-700">No flow degradation detected.</p>
            ) : (
              simulation.degraded_flows.map((flow) => (
                <article key={`${flow.api}-${flow.before_count}-${flow.after_count}`} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-900">{flow.api}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Paths before: {flow.before_count} | Paths after: {flow.after_count}
                  </p>
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
