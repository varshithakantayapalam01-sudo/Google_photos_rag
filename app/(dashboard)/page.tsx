"use client";

import React, { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { StatCard } from "@/components/dashboard/StatCard";
import { DistributionChart } from "@/components/dashboard/DistributionChart";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { OverviewStatsResponse } from "@/types/api";
import {
  Database,
  FileSearch,
  XCircle,
  Layers,
  Globe,
  Calendar,
} from "lucide-react";

export default function OverviewPage() {
  const [data, setData] = useState<OverviewStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics/overview")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error?.message || "Failed to load overview");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageContainer>
        <LoadingState message="Loading overview analytics..." rows={6} />
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        <EmptyState
          title="Failed to load overview"
          message={error || "Unable to fetch analytics data."}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-in-up">
        <StatCard
          label="Total Records Imported"
          value={data.total_records_imported}
          subtitle="Raw community posts ingested"
          icon={<Database className="h-5 w-5" />}
          accentColor="var(--chart-blue)"
        />
        <StatCard
          label="Relevant Episodes"
          value={data.total_relevant_episodes}
          subtitle="Classified & extracted retrieval episodes"
          icon={<FileSearch className="h-5 w-5" />}
          accentColor="var(--chart-emerald)"
        />
        <StatCard
          label="Excluded Records"
          value={data.total_excluded_records}
          subtitle="Classified as not relevant to retrieval"
          icon={<XCircle className="h-5 w-5" />}
          accentColor="var(--chart-rose)"
        />
      </div>

      {/* Distribution Charts */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2 animate-fade-in-up stagger-2">
        <DistributionChart
          title="Platform Distribution"
          subtitle="Source platforms across all imported records"
          data={data.platform_distribution.map((d) => ({
            label: d.platform,
            value: d.count,
            percentage: d.percentage,
          }))}
          type="pie"
          height={280}
        />
        <DistributionChart
          title="Visual Item Types"
          subtitle="Distribution of item types across retrieval episodes"
          data={data.item_type_distribution.map((d) => ({
            label: d.item_type,
            value: d.count,
            percentage: d.percentage,
          }))}
          type="horizontal-bar"
          height={280}
        />
      </div>

      <div className="mb-6 animate-fade-in-up stagger-3">
        <DistributionChart
          title="Outcome Distribution"
          subtitle="Retrieval outcomes: success, partial success, failure, abandoned, unknown"
          data={data.outcome_distribution.map((d) => ({
            label: d.outcome,
            value: d.count,
            percentage: d.percentage,
          }))}
          type="bar"
          height={260}
        />
      </div>

      {/* Collection Provenance */}
      {data.collection_batches.length > 0 && (
        <div
          className="animate-fade-in-up stagger-4 rounded-xl border p-5"
          style={{
            borderColor: "var(--border-subtle)",
            background: "var(--bg-card)",
          }}
        >
          <div className="mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4" style={{ color: "var(--chart-indigo)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Collection Provenance
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.collection_batches.map((batch) => (
              <div
                key={batch.id}
                className="rounded-lg border p-3"
                style={{
                  borderColor: "var(--border-subtle)",
                  background: "var(--bg-secondary)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5" style={{ color: "var(--chart-cyan)" }} />
                  <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                    {batch.platform}
                  </span>
                </div>
                {batch.search_query && (
                  <div className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                    Query: &quot;{batch.search_query}&quot;
                  </div>
                )}
                <div className="mt-2 flex items-center gap-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(batch.collection_date).toLocaleDateString()}
                  </span>
                  <span>{batch.records_imported} records</span>
                  <span>{batch.relevant_records} relevant</span>
                </div>
                {batch.notes && (
                  <div className="mt-1.5 text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {batch.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
