"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  RawTextHighlighter,
  type HighlightSpan,
  type SpanCategory,
} from "@/components/evidence/RawTextHighlighter";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import type { EpisodeDetailResponse } from "@/types/api";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  Calendar,
  Tag,
  Target,
  AlertTriangle,
  Lightbulb,
  Eye,
  Brain as BrainIcon,
  Wrench,
} from "lucide-react";

function formatLabel(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    matched: { bg: "rgba(16,185,129,0.15)", color: "var(--status-matched)" },
    ambiguous: { bg: "rgba(245,158,11,0.15)", color: "var(--status-ambiguous)" },
    not_found: { bg: "rgba(239,68,68,0.15)", color: "var(--status-not-found)" },
    pending: { bg: "rgba(107,114,128,0.15)", color: "var(--status-pending)" },
  };
  const s = colors[status] || colors.pending;
  return (
    <span
      className="inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {formatLabel(status)}
    </span>
  );
}

function EvidenceTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    observed: "var(--evidence-observed)",
    interpreted: "var(--evidence-interpreted)",
    hypothesized: "var(--evidence-hypothesized)",
  };
  return (
    <span
      className="inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium"
      style={{
        background: `${colors[type] || "var(--text-muted)"}20`,
        color: colors[type] || "var(--text-muted)",
      }}
    >
      {formatLabel(type)}
    </span>
  );
}

interface EvidenceItemProps {
  label: string;
  quote: string;
  spanStatus: string;
  evidenceType?: string;
  confidence?: number;
  detail?: string;
}

function EvidenceItem({
  label,
  quote,
  spanStatus,
  evidenceType,
  confidence,
  detail,
}: EvidenceItemProps) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-secondary)",
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        {detail && (
          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
            {detail}
          </span>
        )}
        <StatusBadge status={spanStatus} />
        {evidenceType && <EvidenceTypeBadge type={evidenceType} />}
        {confidence != null && (
          <span className="font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>
            {(confidence * 100).toFixed(0)}% conf
          </span>
        )}
      </div>
      <div
        className="mt-2 text-xs italic leading-relaxed"
        style={{ color: "var(--text-secondary)" }}
      >
        &ldquo;{quote}&rdquo;
      </div>
    </div>
  );
}

export default function EpisodeDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [data, setData] = useState<EpisodeDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/episodes/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error?.message || "Failed to load episode");
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <PageContainer>
        <LoadingState message="Loading episode detail..." rows={6} />
      </PageContainer>
    );
  }

  if (error || !data) {
    return (
      <PageContainer>
        <EmptyState
          title="Episode not found"
          message={error || "The requested episode could not be found."}
          action={
            <Link
              href="/evidence"
              className="text-xs font-medium"
              style={{ color: "var(--text-accent)" }}
            >
              ← Back to Evidence Explorer
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const { episode, remembered_clues, forgotten_attributes, search_behaviors, failure_modes, workarounds, raw_record } =
    data;

  // Build highlight spans for the raw text highlighter
  const spans: HighlightSpan[] = [];

  remembered_clues.forEach((c) => {
    if (c.char_start != null && c.char_end != null) {
      spans.push({
        char_start: c.char_start,
        char_end: c.char_end,
        category: "clue" as SpanCategory,
        label: `${formatLabel(c.clue_category)}: ${c.clue_description}`,
        span_status: c.span_status,
        evidence_type: c.evidence_type,
        confidence: c.confidence,
      });
    }
  });

  forgotten_attributes.forEach((f) => {
    if (f.char_start != null && f.char_end != null) {
      spans.push({
        char_start: f.char_start,
        char_end: f.char_end,
        category: "forgotten" as SpanCategory,
        label: `${formatLabel(f.attribute_category)}: ${f.description}`,
        span_status: f.span_status,
        evidence_type: f.evidence_type,
        confidence: f.confidence,
      });
    }
  });

  search_behaviors.forEach((b) => {
    if (b.char_start != null && b.char_end != null) {
      spans.push({
        char_start: b.char_start,
        char_end: b.char_end,
        category: "behavior" as SpanCategory,
        label: `${formatLabel(b.behavior_type)}: ${b.description}`,
        span_status: b.span_status,
      });
    }
  });

  failure_modes.forEach((f) => {
    if (f.char_start != null && f.char_end != null) {
      spans.push({
        char_start: f.char_start,
        char_end: f.char_end,
        category: "failure" as SpanCategory,
        label: `${formatLabel(f.failure_type)}: ${f.description}`,
        span_status: f.span_status,
        confidence: f.confidence,
      });
    }
  });

  workarounds.forEach((w) => {
    if (w.char_start != null && w.char_end != null) {
      spans.push({
        char_start: w.char_start,
        char_end: w.char_end,
        category: "workaround" as SpanCategory,
        label: `${formatLabel(w.workaround_type)}: ${w.description}`,
        span_status: w.span_status,
      });
    }
  });

  return (
    <PageContainer>
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/evidence"
          className="inline-flex items-center gap-1 text-xs transition-colors hover:underline"
          style={{ color: "var(--text-accent)" }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Evidence Explorer
        </Link>
      </div>

      {/* Episode header */}
      <div
        className="mb-6 rounded-xl border p-6 animate-fade-in-up"
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--bg-card)",
        }}
      >
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              background: "rgba(59,130,246,0.12)",
              color: "var(--chart-blue)",
            }}
          >
            <Tag className="h-3 w-3" />
            {formatLabel(episode.visual_item_type)}
          </span>

          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{
              background:
                episode.outcome === "success"
                  ? "rgba(16,185,129,0.12)"
                  : episode.outcome === "failure"
                  ? "rgba(239,68,68,0.12)"
                  : episode.outcome === "abandoned"
                  ? "rgba(245,158,11,0.12)"
                  : "rgba(100,116,139,0.12)",
              color:
                episode.outcome === "success"
                  ? "var(--status-matched)"
                  : episode.outcome === "failure"
                  ? "var(--status-not-found)"
                  : episode.outcome === "abandoned"
                  ? "var(--status-ambiguous)"
                  : "var(--text-muted)",
            }}
          >
            <Target className="h-3 w-3" />
            {formatLabel(episode.outcome)}
          </span>

          <span
            className="inline-flex rounded-full px-2.5 py-1 text-xs font-mono font-medium"
            style={{
              background: "rgba(99,102,241,0.12)",
              color: "var(--chart-indigo)",
            }}
          >
            {(episode.extraction_confidence * 100).toFixed(0)}% extraction conf
          </span>
        </div>

        <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
          {episode.retrieval_goal}
        </h2>

        <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {episode.rationale_summary}
        </p>

        {/* Provenance */}
        <div
          className="mt-4 flex flex-wrap items-center gap-4 border-t pt-3 text-[10px]"
          style={{ borderColor: "var(--border-subtle)", color: "var(--text-muted)" }}
        >
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {raw_record.platform}
          </span>
          {raw_record.date_posted && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(raw_record.date_posted).toLocaleDateString()}
            </span>
          )}
          {raw_record.source_url && (
            <a
              href={raw_record.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 transition-colors hover:underline"
              style={{ color: "var(--text-accent)" }}
            >
              <ExternalLink className="h-3 w-3" />
              Source
            </a>
          )}
          <span className="font-mono">ID: {episode.id.slice(0, 8)}…</span>
        </div>
      </div>

      {/* Raw text with highlights */}
      <div
        className="mb-6 rounded-xl border p-5 animate-fade-in-up stagger-1"
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--bg-card)",
        }}
      >
        <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Source Text with Evidence Spans
        </h3>
        <RawTextHighlighter rawText={raw_record.raw_text} spans={spans} />
      </div>

      {/* Evidence details grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-fade-in-up stagger-2">
        {/* Remembered Clues */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}
        >
          <div className="mb-3 flex items-center gap-2">
            <Eye className="h-4 w-4" style={{ color: "var(--span-clue-border)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Remembered Clues ({remembered_clues.length})
            </h3>
          </div>
          <div className="space-y-2">
            {remembered_clues.length === 0 ? (
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                No clues extracted
              </div>
            ) : (
              remembered_clues.map((c) => (
                <EvidenceItem
                  key={c.id}
                  label="Clue"
                  detail={`${formatLabel(c.clue_category)}: ${c.clue_description}`}
                  quote={c.evidence_quote}
                  spanStatus={c.span_status}
                  evidenceType={c.evidence_type}
                  confidence={c.confidence}
                />
              ))
            )}
          </div>
        </div>

        {/* Forgotten Attributes */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}
        >
          <div className="mb-3 flex items-center gap-2">
            <BrainIcon className="h-4 w-4" style={{ color: "var(--span-forgotten-border)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Forgotten Attributes ({forgotten_attributes.length})
            </h3>
          </div>
          <div className="space-y-2">
            {forgotten_attributes.length === 0 ? (
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                No forgotten attributes extracted
              </div>
            ) : (
              forgotten_attributes.map((f) => (
                <EvidenceItem
                  key={f.id}
                  label="Forgotten"
                  detail={`${formatLabel(f.attribute_category)}: ${f.description}`}
                  quote={f.evidence_quote}
                  spanStatus={f.span_status}
                  evidenceType={f.evidence_type}
                  confidence={f.confidence}
                />
              ))
            )}
          </div>
        </div>

        {/* Failure Modes */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}
        >
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" style={{ color: "var(--span-failure-border)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Failure Modes ({failure_modes.length})
            </h3>
          </div>
          <div className="space-y-2">
            {failure_modes.length === 0 ? (
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                No failure modes extracted
              </div>
            ) : (
              failure_modes.map((f) => (
                <EvidenceItem
                  key={f.id}
                  label="Failure"
                  detail={`${formatLabel(f.failure_type)} (${formatLabel(f.failure_priority)}): ${f.description}`}
                  quote={f.evidence_quote}
                  spanStatus={f.span_status}
                  confidence={f.confidence}
                />
              ))
            )}
          </div>
        </div>

        {/* Workarounds */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}
        >
          <div className="mb-3 flex items-center gap-2">
            <Wrench className="h-4 w-4" style={{ color: "var(--span-workaround-border)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Workarounds ({workarounds.length})
            </h3>
          </div>
          <div className="space-y-2">
            {workarounds.length === 0 ? (
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                No workarounds extracted
              </div>
            ) : (
              workarounds.map((w) => (
                <EvidenceItem
                  key={w.id}
                  label="Workaround"
                  detail={`${formatLabel(w.workaround_type)}: ${w.description}`}
                  quote={w.evidence_quote}
                  spanStatus={w.span_status}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Search Behaviors */}
      {search_behaviors.length > 0 && (
        <div
          className="mt-6 rounded-xl border p-5 animate-fade-in-up stagger-3"
          style={{ borderColor: "var(--border-subtle)", background: "var(--bg-card)" }}
        >
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4" style={{ color: "var(--span-behavior-border)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Search Behaviors ({search_behaviors.length})
            </h3>
          </div>
          <div className="space-y-2">
            {search_behaviors.map((b) => (
              <EvidenceItem
                key={b.id}
                label="Behavior"
                detail={`${formatLabel(b.behavior_type)}${b.sequence_order != null ? ` (#${b.sequence_order})` : ""}: ${b.description}`}
                quote={b.evidence_quote}
                spanStatus={b.span_status}
              />
            ))}
          </div>
        </div>
      )}
    </PageContainer>
  );
}
