"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { VISUAL_ITEM_TYPES, RETRIEVAL_OUTCOMES } from "@/lib/utils/constants";
import type { RetrievalEpisode } from "@/types/database";

function formatLabel(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    success: { bg: "rgba(16,185,129,0.15)", color: "var(--status-matched)" },
    partial_success: { bg: "rgba(6,182,212,0.15)", color: "var(--chart-cyan)" },
    failure: { bg: "rgba(239,68,68,0.15)", color: "var(--status-not-found)" },
    abandoned: { bg: "rgba(245,158,11,0.15)", color: "var(--status-ambiguous)" },
    unknown: { bg: "rgba(100,116,139,0.15)", color: "var(--text-muted)" },
  };
  const s = styles[outcome] || styles.unknown;
  return (
    <span
      className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {formatLabel(outcome)}
    </span>
  );
}

function ConfidenceBadge({ value }: { value: number }) {
  const pct = (value * 100).toFixed(0);
  const color =
    value >= 0.8
      ? "var(--status-matched)"
      : value >= 0.6
      ? "var(--status-ambiguous)"
      : "var(--status-not-found)";
  return (
    <span className="font-mono text-[10px] font-medium" style={{ color }}>
      {pct}%
    </span>
  );
}

interface EpisodesResponse {
  episodes: (RetrievalEpisode & { raw_records?: { platform: string } })[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function EvidencePage() {
  const router = useRouter();
  const [data, setData] = useState<EpisodesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [filterItemType, setFilterItemType] = useState("");
  const [filterOutcome, setFilterOutcome] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");

  const fetchEpisodes = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", "20");
    if (filterItemType) params.set("visual_item_type", filterItemType);
    if (filterOutcome) params.set("outcome", filterOutcome);
    if (filterPlatform) params.set("platform", filterPlatform);

    fetch(`/api/episodes?${params}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error?.message || "Failed to load episodes");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, filterItemType, filterOutcome, filterPlatform]);

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes]);

  const handleResetFilters = () => {
    setFilterItemType("");
    setFilterOutcome("");
    setFilterPlatform("");
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <PageContainer>
      {/* Filters */}
      <div className="mb-4 animate-fade-in-up">
        <FilterBar
          filters={[
            {
              id: "item_type",
              label: "Item Type",
              options: VISUAL_ITEM_TYPES.map((t) => ({
                label: t,
                value: t,
              })),
              value: filterItemType,
              onChange: (v) => {
                setFilterItemType(v);
                setPage(1);
              },
            },
            {
              id: "outcome",
              label: "Outcome",
              options: RETRIEVAL_OUTCOMES.map((o) => ({
                label: o,
                value: o,
              })),
              value: filterOutcome,
              onChange: (v) => {
                setFilterOutcome(v);
                setPage(1);
              },
            },
          ]}
          onReset={handleResetFilters}
        />
      </div>

      {loading ? (
        <LoadingState message="Loading episodes..." rows={5} />
      ) : error ? (
        <EmptyState title="Error loading episodes" message={error} />
      ) : !data || data.episodes.length === 0 ? (
        <EmptyState
          title="No episodes found"
          message="No retrieval episodes match your current filters. Try adjusting or resetting the filters."
        />
      ) : (
        <div className="animate-fade-in-up stagger-1">
          <DataTable
            columns={[
              {
                key: "visual_item_type",
                label: "Item Type",
                render: (row) => (
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>
                    {formatLabel(row.visual_item_type)}
                  </span>
                ),
              },
              {
                key: "retrieval_goal",
                label: "Retrieval Goal",
                className: "max-w-xs",
                render: (row) => (
                  <span className="line-clamp-2 block max-w-xs" style={{ color: "var(--text-secondary)" }}>
                    {row.retrieval_goal}
                  </span>
                ),
              },
              {
                key: "outcome",
                label: "Outcome",
                render: (row) => <OutcomeBadge outcome={row.outcome} />,
              },
              {
                key: "extraction_confidence",
                label: "Confidence",
                render: (row) => <ConfidenceBadge value={row.extraction_confidence} />,
              },
              {
                key: "platform",
                label: "Platform",
                render: (row) => (
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {(row as any).raw_records?.platform || "—"}
                  </span>
                ),
              },
            ]}
            data={data.episodes}
            keyExtractor={(row) => row.id}
            onRowClick={(row) => router.push(`/evidence/${row.id}`)}
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </PageContainer>
  );
}
