"use client";

import React, { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { DistributionChart } from "@/components/dashboard/DistributionChart";
import { HeatmapChart } from "@/components/dashboard/HeatmapChart";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { MemoryAnalyticsResponse } from "@/types/api";

export default function MemoryPage() {
  const [data, setData] = useState<MemoryAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics/memory")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error?.message || "Failed to load memory analytics");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <PageContainer>
        <LoadingState message="Loading memory & behaviour analytics..." rows={5} />
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        <EmptyState
          title="Failed to load memory analytics"
          message={error || "Unable to fetch memory and behaviour data."}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Clue & Forgotten frequencies side by side */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2 animate-fade-in-up">
        <DistributionChart
          title="Most Common Remembered Clues"
          subtitle="Distinct episodes mentioning each clue category"
          data={data.clue_frequencies.map((d) => ({
            label: d.category,
            value: d.count,
            percentage: d.percentage,
          }))}
          type="horizontal-bar"
          height={Math.max(280, data.clue_frequencies.length * 32)}
        />
        <DistributionChart
          title="Most Common Forgotten Attributes"
          subtitle="Distinct episodes mentioning each forgotten attribute"
          data={data.forgotten_frequencies.map((d) => ({
            label: d.category,
            value: d.count,
            percentage: d.percentage,
          }))}
          type="horizontal-bar"
          height={Math.max(280, data.forgotten_frequencies.length * 32)}
        />
      </div>

      {/* Co-occurrence heatmap */}
      <div className="mb-6 animate-fade-in-up stagger-2">
        <HeatmapChart
          title="Remembered × Forgotten Co-occurrence"
          subtitle="Number of episodes where a clue type and forgotten attribute co-occur"
          data={data.clue_forgotten_cooccurrence.map((d) => ({
            row: d.clue,
            col: d.forgotten,
            value: d.count,
          }))}
          rowLabel="Clue"
          colLabel="Forgotten"
        />
      </div>

      {/* Workaround distribution */}
      <div className="animate-fade-in-up stagger-3">
        <DistributionChart
          title="Workaround Distribution"
          subtitle="Types of workarounds users employed, by distinct episode count"
          data={data.workaround_distribution.map((d) => ({
            label: d.workaround_type,
            value: d.count,
            percentage: d.percentage,
          }))}
          type="bar"
          height={280}
        />
      </div>
    </PageContainer>
  );
}
