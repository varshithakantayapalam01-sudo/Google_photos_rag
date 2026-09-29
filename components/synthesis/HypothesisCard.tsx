import React from "react";
import type { Insight } from "@/types/database";
import { Sparkles, AlertTriangle, Quote, Lightbulb } from "lucide-react";

interface HypothesisCardProps {
  insight: Insight;
}

export function HypothesisCard({ insight }: HypothesisCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-lg hover:border-slate-700 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-400 shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-base font-bold text-white tracking-tight leading-snug">
              {insight.insight_statement}
            </h4>
          </div>
        </div>
        <span className="self-start inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-500/40 shrink-0 font-mono">
          <Lightbulb className="h-3.5 w-3.5 text-purple-400" />
          Behavioral Hypothesis
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
          <span className="text-slate-500 block text-[10px] uppercase">Evidence Rating</span>
          <span className="font-bold text-amber-400 text-sm capitalize">
            {insight.evidence_strength}
          </span>
        </div>
      </div>

      {/* Contradictory Evidence Notice */}
      {insight.contradictory_evidence && (
        <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/40 text-xs text-amber-300 space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            Contradictory / Nuanced Observation
          </div>
          <p className="text-amber-300/90 leading-relaxed">
            {insight.contradictory_evidence}
          </p>
        </div>
      )}

      {/* Representative Snippets */}
      {insight.representative_snippets && insight.representative_snippets.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Quote className="h-3 w-3 text-slate-500" />
            Observed Behavioral Evidence
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
