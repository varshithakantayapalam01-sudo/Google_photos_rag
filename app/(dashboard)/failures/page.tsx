"use client";

import React, { useEffect, useState, useMemo } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { DistributionChart } from "@/components/dashboard/DistributionChart";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { FailureAnalyticsResponse } from "@/types/api";

function formatLabel(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function FailuresPage() {
  const [data, setData] = useState<FailureAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics/failures")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error?.message || "Failed to load failure analytics");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Build grouped stacked data for failure by item type
  const failureByItemGroups = useMemo(() => {
    if (!data) return [];
    // Group by item_type
    const grouped = new Map<string, Map<string, number>>();
    data.failure_by_item_type.forEach((d) => {
      if (!grouped.has(d.item_type)) grouped.set(d.item_type, new Map());
      grouped.get(d.item_type)!.set(d.failure_type, d.count);
    });
    return Array.from(grouped.entries()).map(([item_type, failures]) => ({
      label: item_type,
      value: Array.from(failures.values()).reduce((a, b) => a + b, 0),
      details: Object.fromEntries(failures),
    }));
  }, [data]);

  // Build Sankey-like flow table for clue → failure → outcome
  const flowData = useMemo(() => {
    if (!data) return [];
    return data.clue_failure_flow.slice(0, 20); // top 20 flows
  }, [data]);

  if (loading) {
    return (
      <PageContainer>
        <LoadingState message="Loading failure analysis..." rows={5} />
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        <EmptyState
          title="Failed to load failure analytics"
          message={error || "Unable to fetch failure analytics data."}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Primary failure mode distribution */}
      <div className="mb-6 animate-fade-in-up">
        <DistributionChart
          title="Primary Failure Mode Distribution"
          subtitle="Distinct episodes experiencing each failure type"
          data={data.failure_distribution.map((d) => ({
            label: d.failure_type,
            value: d.count,
            percentage: d.percentage,
          }))}
          type="bar"
          height={280}
        />
      </div>

      {/* Failure by item type */}
      <div className="mb-6 animate-fade-in-up stagger-2">
        <DistributionChart
          title="Failure Modes by Visual Item Type"
          subtitle="How failure modes distribute across different item types"
          data={failureByItemGroups.map((d) => ({
            label: d.label,
            value: d.value,
          }))}
          type="horizontal-bar"
          height={Math.max(260, failureByItemGroups.length * 36)}
        />
      </div>

      {/* Clue → Failure → Outcome Flow Table */}
      <div
        className="animate-fade-in-up stagger-3 rounded-xl border p-5"
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--bg-card)",
        }}
      >
        <h3 className="mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Clue → Failure Mode → Outcome Flow
        </h3>
        <p className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
          Top 20 pathways showing how remembered clues relate to failure modes and outcomes
        </p>

        {flowData.length === 0 ? (
          <div className="py-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            No flow data available
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                    Clue Category
                  </th>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                    →
                  </th>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                    Failure Mode
                  </th>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                    →
                  </th>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--text-muted)" }}>
                    Outcome
                  </th>
                  <th className="px-3 py-2 text-right font-medium" style={{ color: "var(--text-muted)" }}>
                    Episodes
                  </th>
                </tr>
              </thead>
              <tbody>
                {flowData.map((flow, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  >
                    <td className="px-3 py-2.5" style={{ color: "var(--chart-blue)" }}>
                      {formatLabel(flow.clue_category)}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: "var(--text-muted)" }}>→</td>
                    <td className="px-3 py-2.5" style={{ color: "var(--chart-rose)" }}>
                      {formatLabel(flow.failure_type)}
                    </td>
                    <td className="px-3 py-2.5" style={{ color: "var(--text-muted)" }}>→</td>
                    <td className="px-3 py-2.5">
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          background:
                            flow.outcome === "success"
                              ? "rgba(16,185,129,0.15)"
                              : flow.outcome === "failure"
                              ? "rgba(239,68,68,0.15)"
                              : flow.outcome === "abandoned"
                              ? "rgba(245,158,11,0.15)"
                              : "rgba(100,116,139,0.15)",
                          color:
                            flow.outcome === "success"
                              ? "var(--status-matched)"
                              : flow.outcome === "failure"
                              ? "var(--status-not-found)"
                              : flow.outcome === "abandoned"
                              ? "var(--status-ambiguous)"
                              : "var(--text-muted)",
                        }}
                      >
                        {formatLabel(flow.outcome)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-medium" style={{ color: "var(--text-primary)" }}>
                      {flow.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
