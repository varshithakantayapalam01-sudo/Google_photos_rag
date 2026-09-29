"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, AlertCircle } from "lucide-react";

interface ValidationData {
  run_date: string;
  holdout_f1: number;
  holdout_precision: number;
  holdout_recall: number;
  episode_count_agreement: number | null;
}

export function ValidationBadge() {
  const [data, setData] = useState<ValidationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    fetch("/api/validation")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setData(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="h-8 w-36 rounded-lg animate-shimmer" />
    );
  }

  if (!data) {
    return (
      <div
        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs"
        style={{
          borderColor: "var(--border-default)",
          color: "var(--text-muted)",
        }}
      >
        <AlertCircle className="h-3.5 w-3.5" />
        <span>No validation run</span>
      </div>
    );
  }

  const f1Pct = (data.holdout_f1 * 100).toFixed(1);
  const precPct = (data.holdout_precision * 100).toFixed(1);
  const recPct = (data.holdout_recall * 100).toFixed(1);

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-default transition-colors"
        style={{
          borderColor: "rgba(16, 185, 129, 0.3)",
          background: "rgba(16, 185, 129, 0.08)",
          color: "var(--status-matched)",
        }}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        <span>Holdout F1: {f1Pct}%</span>
      </div>

      {showTooltip && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border p-4 shadow-xl"
          style={{
            borderColor: "var(--border-default)",
            background: "var(--bg-card)",
          }}
        >
          <div className="mb-2 text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
            Pipeline Validation Metrics
          </div>
          <div className="space-y-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
            <div className="flex justify-between">
              <span>Precision</span>
              <span className="font-mono font-medium" style={{ color: "var(--text-primary)" }}>
                {precPct}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Recall</span>
              <span className="font-mono font-medium" style={{ color: "var(--text-primary)" }}>
                {recPct}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>F1 Score</span>
              <span className="font-mono font-semibold" style={{ color: "var(--status-matched)" }}>
                {f1Pct}%
              </span>
            </div>
            {data.episode_count_agreement != null && (
              <div className="flex justify-between">
                <span>Episode Agreement</span>
                <span className="font-mono font-medium" style={{ color: "var(--text-primary)" }}>
                  {(data.episode_count_agreement * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div
            className="mt-3 border-t pt-2 text-[10px]"
            style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
          >
            Holdout set ({new Date(data.run_date).toLocaleDateString()}) — results are directional
          </div>
        </div>
      )}
    </div>
  );
}
