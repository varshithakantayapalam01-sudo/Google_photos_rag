"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, Layers, Award, Info, RefreshCw } from "lucide-react";
import { SplitMetrics, EvaluationResult } from "@/lib/validation/evaluate";

interface ValidationResultsProps {
  results: EvaluationResult;
  onRerun: () => void;
  isLoading?: boolean;
}

export function ValidationResults({ results, onRerun, isLoading }: ValidationResultsProps) {
  const [activeTab, setActiveTab] = useState<"holdout" | "development" | "combined">("holdout");

  const activeMetrics: SplitMetrics = results[activeTab];

  const formatPct = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return "N/A";
    return `${Math.round(val * 100)}%`;
  };

  return (
    <div className="space-y-6 rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-5 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">Gold Benchmark Validation Results</h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Evaluated against human-annotated gold standard datasets with explicit split partitioning.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRerun}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Re-run Validation
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveTab("holdout")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === "holdout"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>Holdout Validation Set</span>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">
            {results.holdout.record_count} records (Unbiased)
          </span>
        </button>

        <button
          onClick={() => setActiveTab("development")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === "development"
              ? "border-blue-500 text-blue-400 bg-blue-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>Development Calibration Set</span>
          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-400">
            {results.development.record_count} records (Tuning)
          </span>
        </button>

        <button
          onClick={() => setActiveTab("combined")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition ${
            activeTab === "combined"
              ? "border-purple-500 text-purple-400 bg-purple-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>Combined Benchmark</span>
          <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-400">
            {results.combined.record_count} total
          </span>
        </button>
      </div>

      {/* Directional Notice Banner */}
      {activeTab === "holdout" && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
          <Info className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <strong>Directional Benchmark Notice:</strong> Holdout validation metrics measure generalization on unseen records. Because the sample size is ~15 records, these figures are directional indicators rather than asymptotic guarantees.
          </div>
        </div>
      )}

      {/* Top Cards: Relevance Precision / Recall / F1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Relevance Precision
          </span>
          <div className="mt-2 text-2xl font-bold text-white">
            {formatPct(activeMetrics.relevance_precision)}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {activeMetrics.tp} / {activeMetrics.tp + activeMetrics.fp} predicted relevant are true
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Relevance Recall
          </span>
          <div className="mt-2 text-2xl font-bold text-white">
            {formatPct(activeMetrics.relevance_recall)}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {activeMetrics.tp} / {activeMetrics.tp + activeMetrics.fn} actual relevant retrieved
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Relevance F1 Score
          </span>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {formatPct(activeMetrics.relevance_f1)}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Harmonic mean of precision and recall</p>
        </div>
      </div>

      {/* Episode Agreement Grid */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3">
          Episode Extraction & Semantic Agreement
        </h4>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <span className="text-[11px] text-slate-400">Episode Count Agreement</span>
            <div className="mt-1 text-lg font-bold text-white">
              {formatPct(activeMetrics.episode_count_agreement)}
            </div>
            <span className="text-[10px] text-slate-500">% records with exact episode count</span>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <span className="text-[11px] text-slate-400">Clue Jaccard Agreement</span>
            <div className="mt-1 text-lg font-bold text-white">
              {formatPct(activeMetrics.clue_extraction_agreement)}
            </div>
            <span className="text-[10px] text-slate-500">Average clue category overlap</span>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <span className="text-[11px] text-slate-400">Failure Mode Agreement</span>
            <div className="mt-1 text-lg font-bold text-white">
              {formatPct(activeMetrics.failure_mode_agreement)}
            </div>
            <span className="text-[10px] text-slate-500">Primary failure type match</span>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <span className="text-[11px] text-slate-400">Outcome Agreement</span>
            <div className="mt-1 text-lg font-bold text-white">
              {formatPct(activeMetrics.outcome_agreement)}
            </div>
            <span className="text-[10px] text-slate-500">Success/failure outcome match</span>
          </div>
        </div>
      </div>

      {/* Confusion Matrix Table */}
      <div className="border-t border-slate-800 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
          Relevance Classification Confusion Matrix
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400">
                <th className="py-2">Ground Truth \ Prediction</th>
                <th className="py-2 text-emerald-400">AI: Relevant</th>
                <th className="py-2 text-slate-400">AI: Irrelevant</th>
                <th className="py-2">Total Gold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr>
                <td className="py-2 text-slate-300 font-sans font-medium">Gold: Relevant</td>
                <td className="py-2 text-emerald-400 font-bold">TP: {activeMetrics.tp}</td>
                <td className="py-2 text-red-400 font-bold">FN: {activeMetrics.fn}</td>
                <td className="py-2 text-white">{activeMetrics.tp + activeMetrics.fn}</td>
              </tr>
              <tr>
                <td className="py-2 text-slate-300 font-sans font-medium">Gold: Irrelevant</td>
                <td className="py-2 text-amber-400 font-bold">FP: {activeMetrics.fp}</td>
                <td className="py-2 text-slate-400 font-bold">TN: {activeMetrics.tn}</td>
                <td className="py-2 text-white">{activeMetrics.fp + activeMetrics.tn}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
