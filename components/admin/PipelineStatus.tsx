"use client";

import React, { useState, useEffect } from "react";
import { Play, RefreshCw, CheckCircle2, AlertTriangle, Clock, Layers, Sparkles, Loader2 } from "lucide-react";
import { PipelineStatus as PipelineStatusType } from "@/lib/pipeline/status";

interface PipelineStatusProps {
  batches: Array<{ id: string; platform: string; search_query: string | null; records_imported: number; relevant_records: number }>;
}

export function PipelineStatus({ batches }: PipelineStatusProps) {
  const [status, setStatus] = useState<PipelineStatusType | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
  const [limit, setLimit] = useState<number>(50);
  const [isTriggering, setIsTriggering] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/admin/pipeline/status");
      const json = await res.json();
      if (json.success) setStatus(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleRunClassification = async () => {
    setIsTriggering(true);
    setError(null);
    setLastResult(null);

    try {
      const res = await fetch("/api/admin/pipeline/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_id: selectedBatchId === "all" ? undefined : selectedBatchId,
          limit,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Classification failed");
      }

      setLastResult(json.data);
      fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleRunExtraction = async () => {
    setIsTriggering(true);
    setError(null);
    setLastResult(null);

    try {
      const res = await fetch("/api/admin/pipeline/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batch_id: selectedBatchId === "all" ? undefined : selectedBatchId,
          limit,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Episode extraction failed");
      }

      setLastResult({ type: "extract", ...json.data });
      fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTriggering(false);
    }
  };

  const handleRunAnalyze = async () => {
    setIsTriggering(true);
    setError(null);
    setLastResult(null);

    try {
      const res = await fetch("/api/admin/pipeline/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Analysis & Opportunity generation failed");
      }

      setLastResult({ type: "analyze", ...json.data });
      fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsTriggering(false);
    }
  };

  const stages = [
    { key: "ingest", title: "Stage 1: Ingestion", desc: "Parse & Deduplicate raw data" },
    { key: "classify", title: "Stage 2: Relevance Classification", desc: "gemini-3.5-flash-lite batch classifier" },
    { key: "extract", title: "Stage 3: Episode Extraction & Spans", desc: "gemini-3.8-flash structured extractor" },
    { key: "embed", title: "Embeddings Generation", desc: "gemini-embedding-2 768-dim vectors" },
    { key: "analyze", title: "Stage 4: Pattern & Opportunities", desc: "SQL dimensions + qualitative synthesis" },
    { key: "validate", title: "Gold Validation", desc: "Precision / Recall / F1 benchmark" },
  ];

  return (
    <div className="space-y-6">
      {/* Controls Header */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-lg font-semibold text-white">AI Processing Pipeline Manager</h3>
            <p className="mt-1 text-xs text-slate-400">
              Run incremental AI processing stages on imported records with version tracking and quality gates.
            </p>
          </div>
          <button
            onClick={fetchStatus}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {/* Stage Trigger Options */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-slate-800 pt-6 sm:grid-cols-5">
          <div>
            <label className="block text-xs font-medium text-slate-300">Target Batch</label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Available Records</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.platform} (#{b.id.slice(0, 8)}) — {b.records_imported} records
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">Processing Limit</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              min={1}
              max={500}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRunClassification}
              disabled={isTriggering}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-50"
            >
              {isTriggering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Stage 2: Classify</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRunExtraction}
              disabled={isTriggering}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-purple-500 disabled:opacity-50"
            >
              {isTriggering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Stage 3: Extract</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleRunAnalyze}
              disabled={isTriggering}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-amber-500 disabled:opacity-50"
            >
              {isTriggering ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>Stage 4: Analyze</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Last Run Results */}
        {lastResult && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-400">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {lastResult.type === "extract"
                  ? "Episode Extraction Completed"
                  : lastResult.type === "analyze"
                  ? "Opportunity Analysis Completed"
                  : "Classification Completed"}
              </span>
            </div>
            {lastResult.type === "extract" ? (
              <div className="mt-2 grid grid-cols-2 gap-2 text-slate-300 sm:grid-cols-5">
                <div>Records: <strong className="text-white">{lastResult.total_records_processed}</strong></div>
                <div>Episodes: <strong className="text-emerald-400">{lastResult.episodes_extracted}</strong></div>
                <div>Unmatched Spans: <strong className="text-amber-400">{lastResult.unmatched_spans_count}</strong></div>
                <div>Ambiguous Spans: <strong className="text-amber-400">{lastResult.ambiguous_spans_count}</strong></div>
                <div>Low Conf Flags: <strong className="text-amber-400">{lastResult.low_confidence_flagged}</strong></div>
              </div>
            ) : lastResult.type === "analyze" ? (
              <div className="mt-2 grid grid-cols-2 gap-2 text-slate-300 sm:grid-cols-3">
                <div>Opportunities Generated: <strong className="text-emerald-400">{lastResult.opportunities_generated}</strong></div>
                <div>Errors: <strong className={lastResult.errors?.length > 0 ? "text-rose-400" : "text-white"}>{lastResult.errors?.length || 0}</strong></div>
              </div>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2 text-slate-300 sm:grid-cols-4">
                <div>Processed: <strong className="text-white">{lastResult.total_processed}</strong></div>
                <div>Relevant: <strong className="text-emerald-400">{lastResult.relevant_count}</strong></div>
                <div>Irrelevant: <strong className="text-slate-400">{lastResult.irrelevant_count}</strong></div>
                <div>Low Confidence Flagged: <strong className="text-amber-400">{lastResult.low_confidence_flagged}</strong></div>
              </div>
            )}
          </div>
        )}


        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Stage Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stages.map((stage) => {
          const stageStatus = status?.stages[stage.key as keyof typeof status.stages];
          const isRunning = stageStatus?.state === "running";
          const isCompleted = stageStatus?.state === "completed";
          const isFailed = stageStatus?.state === "failed";

          return (
            <div
              key={stage.key}
              className={`rounded-xl border p-5 shadow transition ${
                isRunning
                  ? "border-blue-500/50 bg-blue-950/20"
                  : isFailed
                  ? "border-red-500/50 bg-red-950/20"
                  : isCompleted
                  ? "border-emerald-500/30 bg-slate-900"
                  : "border-slate-800 bg-slate-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">{stage.title}</span>
                {isRunning && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
                {isCompleted && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                {isFailed && <AlertTriangle className="h-4 w-4 text-red-400" />}
                {!isRunning && !isCompleted && !isFailed && <Clock className="h-4 w-4 text-slate-600" />}
              </div>

              <p className="mt-2 text-[11px] text-slate-400">{stage.desc}</p>

              <div className="mt-4 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="capitalize font-mono font-medium text-slate-200">
                    {stageStatus?.state || "idle"}
                  </span>
                </div>
                {stageStatus?.completed_at && (
                  <div className="flex justify-between">
                    <span>Last Run:</span>
                    <span className="font-mono text-slate-400">
                      {new Date(stageStatus.completed_at).toLocaleTimeString()}
                    </span>
                  </div>
                )}
                {stageStatus?.error_message && (
                  <div className="text-red-400 line-clamp-1">{stageStatus.error_message}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
