import type { AnalysisListItem, DiffResponse } from "@/lib/api/types";

interface DiffPanelProps {
  currentAnalysisId?: string;
  analyses: AnalysisListItem[];
  selectedBaselineId: string;
  onSelectBaseline: (id: string) => void;
  onRunDiff: () => void;
  loading: boolean;
  diff: DiffResponse | null;
  error: string | null;
}

export function DiffPanel({
  currentAnalysisId,
  analyses,
  selectedBaselineId,
  onSelectBaseline,
  onRunDiff,
  loading,
  diff,
  error,
}: DiffPanelProps) {
  const options = analyses.filter((item) => item.analysis_id !== currentAnalysisId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Baseline Analysis
          <select
            value={selectedBaselineId}
            onChange={(event) => onSelectBaseline(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-700"
          >
            <option value="">Select previous analysis</option>
            {options.map((analysis) => (
              <option key={analysis.analysis_id} value={analysis.analysis_id}>
                {analysis.repo_url} - {new Date(analysis.created_at).toLocaleString()}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={onRunDiff}
          disabled={!currentAnalysisId || !selectedBaselineId || loading}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? "Comparing..." : "Run Diff"}
        </button>
      </div>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}

      {!diff ? (
        <p className="text-sm text-slate-500">Select a baseline analysis and run diff to compare snapshots.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Added dependencies: <span className="font-semibold">{diff.new_dependencies.length}</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Removed dependencies: <span className="font-semibold">{diff.removed_dependencies.length}</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Changed flows: <span className="font-semibold">{diff.changed_flows.length}</span>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              Risk delta (avg):{" "}
              <span className="font-semibold">
                {diff.risk_delta.before.average_score} {"->"} {diff.risk_delta.after.average_score}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Flow changes</p>
            {diff.changed_flows.length === 0 ? (
              <p className="mt-1 text-sm text-slate-700">No flow changes detected.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {diff.changed_flows.map((flow) => (
                  <article key={`${flow.api}-${flow.before_count}-${flow.after_count}`} className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-900">{flow.api}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Before: {flow.before_count} | After: {flow.after_count}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
