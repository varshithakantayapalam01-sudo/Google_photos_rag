"use client";

import React from "react";
import type { Opportunity } from "@/types/database";

interface OpportunityCardProps {
  opportunity: Opportunity;
  onClose?: () => void;
}

export function OpportunityCard({ opportunity, onClose }: OpportunityCardProps) {
  const getStrengthBadge = (strength: string) => {
    switch (strength) {
      case "strong":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
            Strong Evidence
          </span>
        );
      case "moderate":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40">
            Moderate Evidence
          </span>
        );
      case "weak":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-500/40">
            Weak Evidence
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-slate-800 text-slate-400">
            {strength || "N/A"}
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-900/90 backdrop-blur-md p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {opportunity.title}
            </h2>
            {getStrengthBadge(opportunity.evidence_strength)}
          </div>
          <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
            {opportunity.retrieval_scenario}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="self-end sm:self-start text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Metric Snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
          <div className="text-xs text-slate-400 font-medium">Supporting Episodes</div>
          <div className="text-lg font-bold text-white mt-1 font-mono">
            {opportunity.supporting_episode_count}
          </div>
          <div className="text-[11px] text-slate-500">{opportunity.source_diversity} platforms</div>
        </div>

        <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
          <div className="text-xs text-slate-400 font-medium">Dataset Share</div>
          <div className="text-lg font-bold text-blue-400 mt-1 font-mono">
            {opportunity.dataset_percentage}%
          </div>
          <div className="text-[11px] text-slate-500">of {opportunity.total_relevant_episodes} total</div>
        </div>

        <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
          <div className="text-xs text-slate-400 font-medium">Failure Rate</div>
          <div className="text-lg font-bold text-rose-400 mt-1 font-mono">
            {opportunity.failure_rate !== null ? `${opportunity.failure_rate}%` : "—"}
          </div>
          <div className="text-[11px] text-slate-500">
            {opportunity.failure_rate_denominator ? `n = ${opportunity.failure_rate_denominator}` : "N/A"}
          </div>
        </div>

        <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
          <div className="text-xs text-slate-400 font-medium">Abandonment</div>
          <div className="text-lg font-bold text-amber-400 mt-1 font-mono">
            {opportunity.abandonment_rate !== null ? `${opportunity.abandonment_rate}%` : "—"}
          </div>
          <div className="text-[11px] text-slate-500">
            {opportunity.abandonment_rate_denominator ? `n = ${opportunity.abandonment_rate_denominator}` : "N/A"}
          </div>
        </div>

        <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
          <div className="text-xs text-slate-400 font-medium">Multi-Attempt</div>
          <div className="text-lg font-bold text-purple-400 mt-1 font-mono">
            {opportunity.multi_attempt_rate !== null ? `${opportunity.multi_attempt_rate}%` : "—"}
          </div>
          <div className="text-[11px] text-slate-500">
            {opportunity.multi_attempt_denominator ? `n = ${opportunity.multi_attempt_denominator}` : "N/A"}
          </div>
        </div>

        <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
          <div className="text-xs text-slate-400 font-medium">Workarounds</div>
          <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">
            {opportunity.workaround_rate !== null ? `${opportunity.workaround_rate}%` : "—"}
          </div>
          <div className="text-[11px] text-slate-500">n = {opportunity.supporting_episode_count}</div>
        </div>

        <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
          <div className="text-xs text-slate-400 font-medium">Manual Scroll</div>
          <div className="text-lg font-bold text-cyan-400 mt-1 font-mono">
            {opportunity.manual_scroll_rate !== null ? `${opportunity.manual_scroll_rate}%` : "—"}
          </div>
          <div className="text-[11px] text-slate-500">n = {opportunity.supporting_episode_count}</div>
        </div>
      </div>

      {/* Behavioral & Context Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-800 space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            User Behavioral Context
          </h3>
          <div className="text-xs space-y-1.5 text-slate-300">
            <div>
              <span className="text-slate-500 font-medium">Target Type:</span>{" "}
              <span className="text-slate-200 capitalize">{opportunity.target_type?.replace(/_/g, " ") || "—"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Remembered Clues:</span>{" "}
              <span className="text-slate-200">{opportunity.remembered_info_summary || "None"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Forgotten Attributes:</span>{" "}
              <span className="text-slate-200">{opportunity.forgotten_info_summary || "None"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Observed Workarounds:</span>{" "}
              <span className="text-slate-200">{opportunity.current_workaround || "None reported"}</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-800 space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Observed Failure Dynamics
          </h3>
          <div className="text-xs space-y-1.5 text-slate-300">
            <div>
              <span className="text-slate-500 font-medium">Failure Stage:</span>{" "}
              <span className="text-rose-300 font-semibold capitalize">
                {opportunity.failure_stage?.replace(/_/g, " ") || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Typical Outcome:</span>{" "}
              <span className="text-slate-200 capitalize">{opportunity.typical_outcome}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Observed Behavior:</span>{" "}
              <span className="text-slate-200">{opportunity.observed_behavior}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Unknown Outcomes:</span>{" "}
              <span className="text-slate-400 font-mono">
                {opportunity.unknown_outcome_count || 0} episodes excluded from rates
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Qualitative Synthesis (LLM Generated - No Arbitrary Scores) */}
      <div className="space-y-4 border-t border-slate-800 pt-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400">
            Qualitative Opportunity Synthesis
          </h3>
          <span className="text-[11px] text-slate-500">
            Model: {opportunity.model_version || "gemini-3.8-flash"} | Prompt v{opportunity.prompt_version || "1.0"}
          </span>
        </div>

        <div className="space-y-3">
          {opportunity.observed_consequence && (
            <div className="p-3.5 rounded-lg bg-slate-800/50 border-l-2 border-l-amber-500">
              <h4 className="text-xs font-semibold text-amber-300 mb-1">Observed Consequence</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {opportunity.observed_consequence}
              </p>
            </div>
          )}

          {opportunity.root_cause_hypothesis && (
            <div className="p-3.5 rounded-lg bg-slate-800/50 border-l-2 border-l-blue-500">
              <h4 className="text-xs font-semibold text-blue-300 mb-1">Root Cause Hypothesis</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {opportunity.root_cause_hypothesis}
              </p>
            </div>
          )}

          {opportunity.alternative_explanations && (
            <div className="p-3.5 rounded-lg bg-slate-800/50 border-l-2 border-l-purple-500">
              <h4 className="text-xs font-semibold text-purple-300 mb-1">Alternative Explanations</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {opportunity.alternative_explanations}
              </p>
            </div>
          )}

          {opportunity.potential_ai_leverage && (
            <div className="p-3.5 rounded-lg bg-slate-800/50 border-l-2 border-l-emerald-500">
              <h4 className="text-xs font-semibold text-emerald-300 mb-1">Potential AI Leverage</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {opportunity.potential_ai_leverage}
              </p>
            </div>
          )}

          {opportunity.uncertainty && (
            <div className="p-3.5 rounded-lg bg-slate-800/50 border-l-2 border-l-slate-500">
              <h4 className="text-xs font-semibold text-slate-400 mb-1">Uncertainty & Boundaries</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {opportunity.uncertainty}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
