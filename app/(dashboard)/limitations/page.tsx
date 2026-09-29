"use client";

import React, { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { LimitationsPanel } from "@/components/limitations/LimitationsPanel";
import { LoadingState } from "@/components/shared/LoadingState";
import { ShieldAlert, AlertCircle } from "lucide-react";
import type { ResearchLimitationsReport } from "@/lib/analysis/limitations";

export default function LimitationsPage() {
  const [report, setReport] = useState<ResearchLimitationsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLimitations() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/limitations");
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to load research limitations");
        }
        setReport(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadLimitations();
  }, []);

  return (
    <PageContainer>
      <div className="max-w-5xl mx-auto space-y-8 pb-16">
        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
            <span>Epistemic Integrity & Governance</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Research Limitations & Dataset Bias
          </h1>
          <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
            Transparent documentation of sampling skew, platform overrepresentation, and methodological boundaries. Understanding these boundaries ensures research findings are interpreted responsibly.
          </p>
        </div>

        {/* Loading / Error States */}
        {loading && <LoadingState message="Analyzing dataset skew and bias metrics..." rows={5} />}

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <div className="font-semibold">Error Loading Limitations</div>
              <p className="mt-0.5 text-xs text-rose-400/90">{error}</p>
            </div>
          </div>
        )}

        {/* Content */}
        {!loading && !error && report && (
          <LimitationsPanel report={report} />
        )}
      </div>
    </PageContainer>
  );
}
