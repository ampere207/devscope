import type { RiskResponse } from "@/lib/api/types";

interface RiskPanelProps {
  risk: RiskResponse | null;
  loading: boolean;
}

function riskColor(level: string) {
  if (level === "HIGH") return "text-orange-700 bg-orange-100 border-orange-200";
  if (level === "MEDIUM") return "text-amber-700 bg-amber-100 border-amber-200";
  return "text-emerald-700 bg-emerald-100 border-emerald-200";
}

export function RiskPanel({ risk, loading }: RiskPanelProps) {
  if (loading) {
    return <p className="text-sm text-slate-500">Calculating risk score...</p>;
  }

  if (!risk) {
    return <p className="text-sm text-slate-500">Select a node to view risk analysis.</p>;
  }

  return (
    <div className="space-y-4">
      <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${riskColor(risk.risk_level)}`}>
        {risk.risk_level} RISK
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Risk score</p>
        <p className="mt-2 text-3xl font-bold text-slate-900">{Math.round(risk.score * 100)}%</p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Reasons</p>
        <ul className="mt-2 space-y-2 text-sm text-slate-700">
          {risk.reasons.map((reason) => (
            <li key={reason} className="rounded-md border border-slate-200 bg-white px-3 py-2">
              {reason}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-800">AI Explanation</p>
        <p className="mt-2 text-sm text-cyan-900">{risk.ai_explanation || "AI explanation unavailable."}</p>
      </div>
    </div>
  );
}
