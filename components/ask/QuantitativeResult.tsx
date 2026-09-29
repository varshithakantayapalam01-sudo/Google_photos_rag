import React from "react";
import { BarChart3, Hash } from "lucide-react";

interface QuantitativeResultProps {
  summary?: {
    metric_name: string;
    value: number | string;
    numerator?: number;
    denominator?: number;
    table_data?: Array<Record<string, unknown>>;
  };
}

export function QuantitativeResult({ summary }: QuantitativeResultProps) {
  if (!summary) return null;

  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-blue-500/20 pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-400" />
          <h4 className="text-sm font-bold text-blue-200">
            Full Dataset Deterministic Metric
          </h4>
        </div>
        <span className="text-[11px] font-mono text-blue-400/80 bg-blue-900/40 px-2 py-0.5 rounded border border-blue-500/30">
          COUNT(DISTINCT episode_id)
        </span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-baseline gap-4">
        <div>
          <div className="text-xs font-medium text-slate-400">{summary.metric_name}</div>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {summary.value}
          </div>
        </div>

        {summary.numerator !== undefined && summary.denominator !== undefined && (
          <div className="sm:border-l sm:border-slate-800 sm:pl-4 text-xs text-slate-400 font-mono">
            <div>
              Numerator: <strong className="text-slate-200">{summary.numerator}</strong> distinct episodes
            </div>
            <div>
              Denominator: <strong className="text-slate-200">{summary.denominator}</strong> distinct episodes
            </div>
          </div>
        )}
      </div>

      {summary.table_data && summary.table_data.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 uppercase text-[10px] tracking-wider text-slate-400">
              <tr>
                <th className="py-2.5 px-3 font-semibold">Category / Dimension</th>
                <th className="py-2.5 px-3 font-semibold text-right">Episodes</th>
                <th className="py-2.5 px-3 font-semibold text-right">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
              {summary.table_data.map((row: any, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="py-2 px-3 text-slate-200 font-sans font-medium capitalize">
                    {String(row.label || row.group || Object.values(row)[0]).replace(/_/g, " ")}
                  </td>
                  <td className="py-2 px-3 text-right text-white">
                    {row.count ?? row.distinct_episodes ?? "—"}
                  </td>
                  <td className="py-2 px-3 text-right text-blue-400 font-semibold">
                    {row.percentage !== undefined ? `${row.percentage}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
