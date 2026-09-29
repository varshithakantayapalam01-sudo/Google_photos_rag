"use client";

import React, { useMemo } from "react";

export type SpanCategory =
  | "clue"
  | "forgotten"
  | "behavior"
  | "failure"
  | "workaround";

export interface HighlightSpan {
  char_start: number;
  char_end: number;
  category: SpanCategory;
  label: string;
  span_status: "matched" | "ambiguous" | "not_found" | "pending";
  evidence_type?: "observed" | "interpreted" | "hypothesized";
  confidence?: number;
}

interface RawTextHighlighterProps {
  rawText: string;
  spans: HighlightSpan[];
  className?: string;
}

const CATEGORY_STYLES: Record<
  SpanCategory,
  { bg: string; border: string; label: string; textColor: string }
> = {
  clue: {
    bg: "var(--span-clue)",
    border: "var(--span-clue-border)",
    label: "Clue",
    textColor: "#60a5fa",
  },
  forgotten: {
    bg: "var(--span-forgotten)",
    border: "var(--span-forgotten-border)",
    label: "Forgotten",
    textColor: "#fb923c",
  },
  behavior: {
    bg: "var(--span-behavior)",
    border: "var(--span-behavior-border)",
    label: "Behavior",
    textColor: "#2dd4bf",
  },
  failure: {
    bg: "var(--span-failure)",
    border: "var(--span-failure-border)",
    label: "Failure",
    textColor: "#f43f5e",
  },
  workaround: {
    bg: "var(--span-workaround)",
    border: "var(--span-workaround-border)",
    label: "Workaround",
    textColor: "#a855f7",
  },
};

const EVIDENCE_TYPE_COLORS: Record<string, string> = {
  observed: "var(--evidence-observed)",
  interpreted: "var(--evidence-interpreted)",
  hypothesized: "var(--evidence-hypothesized)",
};

const STATUS_COLORS: Record<string, string> = {
  matched: "var(--status-matched)",
  ambiguous: "var(--status-ambiguous)",
  not_found: "var(--status-not-found)",
  pending: "var(--status-pending)",
};

interface ResolvedSegment {
  start: number;
  end: number;
  text: string;
  span: HighlightSpan | null;
}

/**
 * Deterministic character span highlighter.
 * Renders raw text with evidence spans highlighted by category,
 * avoiding overlaps and out-of-bounds issues.
 */
export function RawTextHighlighter({
  rawText,
  spans,
  className = "",
}: RawTextHighlighterProps) {
  const segments = useMemo(() => {
    return computeSegments(rawText, spans);
  }, [rawText, spans]);

  if (!rawText) {
    return (
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
        No raw text available
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center gap-3">
        {Object.entries(CATEGORY_STYLES).map(([key, style]) => (
          <div key={key} className="flex items-center gap-1.5 text-[10px]">
            <div
              className="h-2.5 w-2.5 rounded-sm border"
              style={{
                background: style.bg,
                borderColor: style.border,
              }}
            />
            <span style={{ color: "var(--text-muted)" }}>{style.label}</span>
          </div>
        ))}
      </div>

      {/* Highlighted text */}
      <div
        className="rounded-lg border p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap"
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--bg-secondary)",
          color: "var(--text-secondary)",
          wordBreak: "break-word",
        }}
      >
        {segments.map((seg, i) => {
          if (!seg.span) {
            return <span key={i}>{seg.text}</span>;
          }

          const style = CATEGORY_STYLES[seg.span.category];
          return (
            <span
              key={i}
              className="group relative inline rounded-sm border-b-2 px-0.5 transition-all"
              style={{
                background: style.bg,
                borderBottomColor: style.border,
              }}
              title={`${style.label}: ${seg.span.label}`}
            >
              {seg.text}
              {/* Inline tooltip on hover */}
              <span
                className="pointer-events-none absolute bottom-full left-0 z-50 mb-1 hidden rounded-md border px-2 py-1 text-[10px] shadow-lg group-hover:block whitespace-nowrap"
                style={{
                  borderColor: "var(--border-default)",
                  background: "var(--bg-elevated)",
                  color: "var(--text-primary)",
                }}
              >
                <span style={{ color: style.textColor }}>{style.label}</span>
                {" · "}
                {seg.span.label}
                {seg.span.evidence_type && (
                  <>
                    {" · "}
                    <span style={{ color: EVIDENCE_TYPE_COLORS[seg.span.evidence_type] }}>
                      {seg.span.evidence_type}
                    </span>
                  </>
                )}
                {" · "}
                <span style={{ color: STATUS_COLORS[seg.span.span_status] }}>
                  {seg.span.span_status}
                </span>
                {seg.span.confidence != null && (
                  <>
                    {" · "}
                    <span style={{ color: "var(--text-muted)" }}>
                      {(seg.span.confidence * 100).toFixed(0)}% conf
                    </span>
                  </>
                )}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Computes non-overlapping segments from raw text and highlight spans.
 * Validates char_start/char_end boundaries to prevent out-of-bounds errors.
 */
export function computeSegments(
  rawText: string,
  spans: HighlightSpan[]
): ResolvedSegment[] {
  if (!rawText || spans.length === 0) {
    return [{ start: 0, end: rawText.length, text: rawText, span: null }];
  }

  // Filter valid, in-bounds spans and sort by start position
  const validSpans = spans
    .filter(
      (s) =>
        s.char_start != null &&
        s.char_end != null &&
        s.char_start >= 0 &&
        s.char_end > s.char_start &&
        s.char_start < rawText.length
    )
    .map((s) => ({
      ...s,
      char_end: Math.min(s.char_end, rawText.length),
    }))
    .sort((a, b) => a.char_start - b.char_start);

  if (validSpans.length === 0) {
    return [{ start: 0, end: rawText.length, text: rawText, span: null }];
  }

  // Resolve overlaps: later spans in array win (last writer wins)
  const segments: ResolvedSegment[] = [];
  let cursor = 0;

  for (const span of validSpans) {
    // Skip spans that are fully behind cursor (already covered by previous span)
    if (span.char_end <= cursor) continue;
    const effectiveStart = Math.max(span.char_start, cursor);

    // Add un-highlighted gap before this span
    if (effectiveStart > cursor) {
      segments.push({
        start: cursor,
        end: effectiveStart,
        text: rawText.slice(cursor, effectiveStart),
        span: null,
      });
    }

    // Add highlighted span
    segments.push({
      start: effectiveStart,
      end: span.char_end,
      text: rawText.slice(effectiveStart, span.char_end),
      span,
    });

    cursor = span.char_end;
  }

  // Add trailing un-highlighted text
  if (cursor < rawText.length) {
    segments.push({
      start: cursor,
      end: rawText.length,
      text: rawText.slice(cursor),
      span: null,
    });
  }

  return segments;
}
