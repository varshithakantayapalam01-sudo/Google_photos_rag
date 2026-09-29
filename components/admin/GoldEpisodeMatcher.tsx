"use client";

import React, { useState } from "react";
import { Link2, CheckCircle2, AlertTriangle, HelpCircle, ArrowRight } from "lucide-react";
import { GoldEpisodeLabel, RetrievalEpisode } from "@/types/database";

interface GoldEpisodeMatcherProps {
  goldEpisodes: GoldEpisodeLabel[];
  aiEpisodes: RetrievalEpisode[];
  manualOverrides: Record<string, string>; // gold_episode_id -> ai_episode_id
  onOverrideChange: (goldId: string, aiId: string) => void;
}

export function GoldEpisodeMatcher({
  goldEpisodes,
  aiEpisodes,
  manualOverrides,
  onOverrideChange,
}: GoldEpisodeMatcherProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-white">Episode Pairing & Alignment Inspector</h4>
          <p className="mt-0.5 text-xs text-slate-400">
            Review automatic bipartite matching between Human Gold labels and AI-extracted episodes or assign manual pairings.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {goldEpisodes.map((gold) => {
          const selectedAiId = manualOverrides[gold.id] || "";
          const matchedAi = aiEpisodes.find((a) => a.id === selectedAiId);

          return (
            <div
              key={gold.id}
              className="grid grid-cols-1 gap-4 rounded-lg border border-slate-800 bg-slate-950 p-4 sm:grid-cols-2"
            >
              {/* Gold Side */}
              <div className="space-y-1.5 border-b border-slate-800 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                    Gold Episode #{gold.episode_index}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 capitalize">{gold.visual_item_type}</span>
                </div>
                <p className="text-xs font-medium text-slate-200">{gold.episode_description}</p>
                <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
                  {gold.outcome && <span>Outcome: <strong className="text-slate-300">{gold.outcome}</strong></span>}
                  {gold.primary_failure_mode && (
                    <span>Failure: <strong className="text-slate-300">{gold.primary_failure_mode}</strong></span>
                  )}
                </div>
              </div>

              {/* AI Side Assignment */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-400">Paired AI Episode</label>
                  {selectedAiId ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Paired
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400">
                      <AlertTriangle className="h-3 w-3" />
                      Unpaired (FN)
                    </span>
                  )}
                </div>

                <select
                  value={selectedAiId}
                  onChange={(e) => onOverrideChange(gold.id, e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">-- No Matching AI Episode (Unmatched) --</option>
                  {aiEpisodes.map((ai, idx) => (
                    <option key={ai.id} value={ai.id}>
                      AI Episode #{idx + 1}: {ai.retrieval_goal.slice(0, 45)}... ({ai.outcome})
                    </option>
                  ))}
                </select>

                {matchedAi && (
                  <div className="rounded border border-slate-800 bg-slate-900/60 p-2 text-[11px] text-slate-300 space-y-1">
                    <div className="line-clamp-2 italic">&ldquo;{matchedAi.retrieval_goal}&rdquo;</div>
                    <div className="flex gap-3 text-[10px] text-slate-400">
                      <span>Outcome: <strong className="text-slate-200">{matchedAi.outcome}</strong></span>
                      <span>Confidence: <strong className="text-blue-400">{Math.round(matchedAi.extraction_confidence * 100)}%</strong></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
