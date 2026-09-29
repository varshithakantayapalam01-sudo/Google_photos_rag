"use client";

import React, { useEffect, useState, useMemo } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { OpportunityComparisonTable } from "@/components/opportunities/OpportunityComparisonTable";
import { OpportunityCard } from "@/components/opportunities/OpportunityCard";
import { OpportunityDrilldown } from "@/components/opportunities/OpportunityDrilldown";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/dashboard/StatCard";
import { Lightbulb, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import type { Opportunity } from "@/types/database";

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOpportunities() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/analytics/opportunities");
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to load opportunities");
        }
        setOpportunities(json.data || []);
        if (json.data && json.data.length > 0) {
          setSelectedOpportunity(json.data[0]);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadOpportunities();
  }, []);

  const stats = useMemo(() => {
    const total = opportunities.length;
    const strongCount = opportunities.filter((o) => o.evidence_strength === "strong").length;
    const moderateCount = opportunities.filter((o) => o.evidence_strength === "moderate").length;
    const weakCount = opportunities.filter((o) => o.evidence_strength === "weak").length;
    
    // Average failure rate
    const oppsWithFailure = opportunities.filter((o) => o.failure_rate !== null);
    const avgFailureRate =
      oppsWithFailure.length > 0
        ? Math.round(
            oppsWithFailure.reduce((acc, curr) => acc + (curr.failure_rate || 0), 0) /
              oppsWithFailure.length
          )
        : null;

    return {
      total,
      strongCount,
      moderateCount,
      weakCount,
      avgFailureRate,
    };
  }, [opportunities]);

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Lightbulb className="h-6 w-6 text-amber-400" />
              Opportunity Explorer
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Deterministic pattern discovery and research opportunities with explicit denominator transparency and 6-factor evidence strength ratings.
            </p>
          </div>
        </div>

        {/* Loading / Error States */}
        {loading && <LoadingState message="Loading opportunity catalog and pattern metrics..." rows={4} />}

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm">
            <div className="font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Error Loading Opportunities
            </div>
            <p className="mt-1 text-rose-400/90">{error}</p>
          </div>
        )}

        {/* Content */}
        {!loading && !error && opportunities.length === 0 && (
          <EmptyState
            title="No Opportunities Generated Yet"
            message="Run the Stage 4 (Analyze) pipeline in the Admin panel to discover failure patterns and synthesize qualitative opportunities from your extracted episodes."
            action={
              <a
                href="/admin/pipeline"
                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
              >
                Go to Admin Pipeline
              </a>
            }
          />
        )}

        {!loading && !error && opportunities.length > 0 && (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Total Opportunities"
                value={stats.total}
                subtitle="Discovered failure patterns"
                icon={<Lightbulb className="h-5 w-5 text-blue-400" />}
              />
              <StatCard
                label="Strong Evidence"
                value={stats.strongCount}
                subtitle="≥5/6 objective factors met"
                trend={{
                  value: Math.round((stats.strongCount / (stats.total || 1)) * 100),
                  label: "of total",
                }}
                icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              />
              <StatCard
                label="Moderate / Weak"
                value={`${stats.moderateCount} / ${stats.weakCount}`}
                subtitle="Emerging or narrower patterns"
                icon={<Sparkles className="h-5 w-5 text-amber-400" />}
              />
              <StatCard
                label="Avg Failure Rate"
                value={stats.avgFailureRate !== null ? `${stats.avgFailureRate}%` : "—"}
                subtitle="Across opportunity patterns"
                icon={<AlertCircle className="h-5 w-5 text-rose-400" />}
              />
            </div>

            {/* Side-by-side comparison table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Pattern Comparison Matrix
                </h2>
                <span className="text-xs text-slate-400">
                  Click any row to view qualitative synthesis and trace supporting evidence
                </span>
              </div>
              <OpportunityComparisonTable
                opportunities={opportunities}
                selectedId={selectedOpportunity?.id}
                onSelectOpportunity={(opp) => setSelectedOpportunity(opp)}
              />
            </div>

            {/* Qualitative Synthesis & Drilldown Section */}
            {selectedOpportunity && (
              <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between border-t border-slate-800 pt-6">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Detailed Qualitative & Grounded Analysis
                  </h2>
                  <span className="text-xs font-mono text-blue-400">
                    Selected: {selectedOpportunity.title}
                  </span>
                </div>

                <OpportunityCard
                  opportunity={selectedOpportunity}
                />

                <OpportunityDrilldown
                  opportunity={selectedOpportunity}
                />
              </div>
            )}
          </>
        )}
      </div>
    </PageContainer>
  );
}
