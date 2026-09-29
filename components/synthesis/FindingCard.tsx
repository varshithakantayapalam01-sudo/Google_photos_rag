import React from "react";
import type { Insight } from "@/types/database";
import { CheckCircle2, ShieldCheck, Quote, AlertCircle } from "lucide-react";

interface FindingCardProps {
  insight: Insight;
}

export function FindingCard({ insight }: FindingCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-lg hover:border-slate-700 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 shrink-0 mt-0.5">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white tracking-tight leading-snug">
              {insight.insight_statement}
            </h4>
          </div>
        </div>
        <span className="self-start inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shrink-0 font-mono">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Strong Evidence
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-950/50 p-3 rounded-lg border border-slate-800/80 text-xs font-mono">
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Supporting Episodes</span>
          <span className="font-bold text-white text-sm">
            {insight.supporting_episode_count} distinct
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Source Diversity</span>
          <span className="font-bold text-slate-200 text-sm">
            {insight.source_diversity} platforms
          </span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Dataset Share</span>
          <span className="font-bold text-blue-400 text-sm">
            {insight.dataset_percentage}%
          </span>
        </div>
      </div>

      {/* Representative Snippets */}
      {insight.representative_snippets && insight.representative_snippets.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Quote className="h-3 w-3 text-slate-500" />
            Representative User Quotes
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {insight.representative_snippets.map((snip: any, idx: number) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-slate-800 bg-slate-950/40 text-xs text-slate-300 space-y-1.5"
              >
                <p className="italic text-slate-200">"{snip.quote}"</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                  <span className="capitalize text-slate-400">{snip.platform}</span>
                  {snip.visual_item_type && (
                    <span>• {snip.visual_item_type.replace(/_/g, " ")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Limitation / Scope Notice */}
      {insight.research_limitation && (
        <div className="text-xs text-slate-400 flex items-start gap-1.5 bg-slate-950/30 p-2.5 rounded border border-slate-800/60">
          <AlertCircle className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-300">Methodological Note:</strong> {insight.research_limitation}
          </span>
        </div>
      )}
    </div>
  );
}
