import type { AIInsightsResponse } from "@/lib/api/types";

interface AIInsightsPanelProps {
  insights: AIInsightsResponse | null;
  loading: boolean;
  error: string | null;
}

export function AIInsightsPanel({ insights, loading, error }: AIInsightsPanelProps) {
  if (loading) {
    return <p className="text-sm text-slate-500">Generating architecture insights...</p>;
  }

  if (error) {
    return <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>;
  }

  if (!insights) {
    return <p className="text-sm text-slate-500">No AI insights available. Load an analyzed repository first.</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Architecture Summary</p>
        <p className="mt-2 text-sm text-slate-700">{insights.architecture_summary}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Risk Reasoning</p>
        <p className="mt-2 text-sm text-slate-700">{insights.risk_reasoning}</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Refactor Suggestions</p>
        <ul className="mt-2 space-y-2 text-sm text-slate-700">
          {insights.refactor_suggestions.map((item) => (
            <li key={item} className="rounded-md border border-slate-200 bg-white px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Anti-patterns</p>
        <ul className="mt-2 space-y-2 text-sm text-slate-700">
          {insights.anti_patterns.map((item) => (
            <li key={item} className="rounded-md border border-slate-200 bg-white px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
