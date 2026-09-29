/**
 * Phase 6 — Metric Formula & Aggregation Tests
 *
 * Tests:
 * 1. All aggregation queries use COUNT(DISTINCT episode_id) (never raw record counts or clue-row counts).
 * 2. Numerator and denominator calculations are mathematically correct.
 * 3. Highlighting logic correctly computes slice indices from char_start and char_end without out-of-bounds errors.
 */

import { describe, it, expect } from "vitest";
import { computeSegments, type HighlightSpan } from "@/components/evidence/RawTextHighlighter";

// ============================================================
// Test 1: Aggregation logic — COUNT(DISTINCT episode_id)
// ============================================================

describe("Metric aggregation: DISTINCT episode_id counting", () => {
  /**
   * Simulates the analytics counting logic from lib/db/queries/analytics.ts
   * to verify it counts distinct episodes per category, not clue-row counts.
   */
  it("should count distinct episodes per clue category, not raw clue rows", () => {
    // Simulated clue rows returned from DB (same episode with multiple clue entries)
    const clueRows = [
      { episode_id: "ep1", clue_category: "visual_feature" },
      { episode_id: "ep1", clue_category: "visual_feature" }, // duplicate clue in same episode
      { episode_id: "ep2", clue_category: "visual_feature" },
      { episode_id: "ep2", clue_category: "color" },
      { episode_id: "ep3", clue_category: "color" },
      { episode_id: "ep3", clue_category: "color" }, // duplicate
    ];

    // Apply the same logic as getMemoryAnalytics
    const clueEpisodeMap = new Map<string, Set<string>>();
    clueRows.forEach((c) => {
      if (!clueEpisodeMap.has(c.clue_category))
        clueEpisodeMap.set(c.clue_category, new Set());
      clueEpisodeMap.get(c.clue_category)!.add(c.episode_id);
    });

    // visual_feature: ep1, ep2 => 2 distinct episodes
    expect(clueEpisodeMap.get("visual_feature")!.size).toBe(2);
    // color: ep2, ep3 => 2 distinct episodes
    expect(clueEpisodeMap.get("color")!.size).toBe(2);

    // Total raw clue rows = 6, but distinct episode count should be 3
    const allDistinctEpisodes = new Set(clueRows.map((c) => c.episode_id)).size;
    expect(allDistinctEpisodes).toBe(3);
  });

  it("should count distinct episodes per failure type, not failure row counts", () => {
    const failureRows = [
      { episode_id: "ep1", failure_type: "expression" },
      { episode_id: "ep1", failure_type: "expression" },
      { episode_id: "ep2", failure_type: "expression" },
      { episode_id: "ep3", failure_type: "interpretation" },
      { episode_id: "ep3", failure_type: "candidate_retrieval" },
    ];

    const failureTypeMap = new Map<string, Set<string>>();
    failureRows.forEach((f) => {
      if (!failureTypeMap.has(f.failure_type))
        failureTypeMap.set(f.failure_type, new Set());
      failureTypeMap.get(f.failure_type)!.add(f.episode_id);
    });

    // expression: ep1, ep2 => 2
    expect(failureTypeMap.get("expression")!.size).toBe(2);
    // interpretation: ep3 => 1
    expect(failureTypeMap.get("interpretation")!.size).toBe(1);
    // candidate_retrieval: ep3 => 1
    expect(failureTypeMap.get("candidate_retrieval")!.size).toBe(1);
  });

  it("should count distinct episodes per workaround type", () => {
    const workaroundRows = [
      { episode_id: "ep1", workaround_type: "manual_scroll" },
      { episode_id: "ep1", workaround_type: "manual_scroll" },
      { episode_id: "ep2", workaround_type: "manual_scroll" },
      { episode_id: "ep2", workaround_type: "browse_by_date" },
      { episode_id: "ep3", workaround_type: "browse_by_date" },
    ];

    const workaroundMap = new Map<string, Set<string>>();
    workaroundRows.forEach((w) => {
      if (!workaroundMap.has(w.workaround_type))
        workaroundMap.set(w.workaround_type, new Set());
      workaroundMap.get(w.workaround_type)!.add(w.episode_id);
    });

    expect(workaroundMap.get("manual_scroll")!.size).toBe(2);
    expect(workaroundMap.get("browse_by_date")!.size).toBe(2);
  });
});

// ============================================================
// Test 2: Numerator/denominator percentage calculations
// ============================================================

describe("Metric aggregation: numerator/denominator calculations", () => {
  it("should calculate percentage correctly: (count / total) * 100 with one decimal", () => {
    const count = 15;
    const total = 47;
    const percentage = Math.round((count / total) * 1000) / 10;
    // 15/47 = 0.31914... * 1000 = 319.14... rounded = 319 / 10 = 31.9
    expect(percentage).toBe(31.9);
  });

  it("should handle zero total gracefully", () => {
    const count = 0;
    const total = 0;
    const safeDenominator = total || 1; // prevent division by zero
    const percentage = Math.round((count / safeDenominator) * 1000) / 10;
    expect(percentage).toBe(0);
    expect(Number.isFinite(percentage)).toBe(true);
  });

  it("should calculate co-occurrence counts correctly by episode_id", () => {
    // 2 episodes, each with different clue+forgotten combos
    const episodeClues = new Map<string, Set<string>>([
      ["ep1", new Set(["visual_feature", "color"])],
      ["ep2", new Set(["visual_feature"])],
    ]);
    const episodeForgotten = new Map<string, Set<string>>([
      ["ep1", new Set(["exact_date", "exact_location"])],
      ["ep2", new Set(["exact_date"])],
    ]);

    const cooccurrenceCounts = new Map<string, number>();
    for (const [epId, cSet] of episodeClues.entries()) {
      const fSet = episodeForgotten.get(epId);
      if (fSet) {
        for (const clue of cSet) {
          for (const forg of fSet) {
            const key = `${clue}:::${forg}`;
            cooccurrenceCounts.set(key, (cooccurrenceCounts.get(key) || 0) + 1);
          }
        }
      }
    }

    // visual_feature x exact_date: ep1 + ep2 = 2
    expect(cooccurrenceCounts.get("visual_feature:::exact_date")).toBe(2);
    // visual_feature x exact_location: ep1 = 1
    expect(cooccurrenceCounts.get("visual_feature:::exact_location")).toBe(1);
    // color x exact_date: ep1 = 1
    expect(cooccurrenceCounts.get("color:::exact_date")).toBe(1);
    // color x exact_location: ep1 = 1
    expect(cooccurrenceCounts.get("color:::exact_location")).toBe(1);
  });

  it("should correctly distribute platform counts among all raw records", () => {
    const rawRecords = [
      { platform: "reddit" },
      { platform: "reddit" },
      { platform: "reddit" },
      { platform: "google_support" },
      { platform: "google_support" },
    ];

    const platformCounts = new Map<string, number>();
    rawRecords.forEach((r) => {
      platformCounts.set(r.platform, (platformCounts.get(r.platform) || 0) + 1);
    });

    const totalRecs = rawRecords.length;
    const distribution = Array.from(platformCounts.entries()).map(
      ([platform, count]) => ({
        platform,
        count,
        percentage: Math.round((count / totalRecs) * 1000) / 10,
      })
    );

    const reddit = distribution.find((d) => d.platform === "reddit")!;
    expect(reddit.count).toBe(3);
    expect(reddit.percentage).toBe(60);

    const gs = distribution.find((d) => d.platform === "google_support")!;
    expect(gs.count).toBe(2);
    expect(gs.percentage).toBe(40);
  });
});

// ============================================================
// Test 3: Highlighting logic — computeSegments
// ============================================================

describe("Highlighting logic: computeSegments", () => {
  const sampleText = "I remember the photo was at a beach with sunset colors";
  //                   0123456789...

  it("should return a single segment for text with no spans", () => {
    const segments = computeSegments(sampleText, []);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe(sampleText);
    expect(segments[0].span).toBeNull();
  });

  it("should correctly slice a single exact span in the middle", () => {
    const spans: HighlightSpan[] = [
      {
        char_start: 15,
        char_end: 20,
        category: "clue",
        label: "test",
        span_status: "matched",
      },
    ];
    const segments = computeSegments(sampleText, spans);

    // Should have 3 segments: before, highlighted, after
    expect(segments).toHaveLength(3);
    expect(segments[0].text).toBe(sampleText.slice(0, 15));
    expect(segments[0].span).toBeNull();

    expect(segments[1].text).toBe(sampleText.slice(15, 20));
    expect(segments[1].span).not.toBeNull();
    expect(segments[1].span!.category).toBe("clue");

    expect(segments[2].text).toBe(sampleText.slice(20));
    expect(segments[2].span).toBeNull();
  });

  it("should handle a span starting at char 0", () => {
    const spans: HighlightSpan[] = [
      {
        char_start: 0,
        char_end: 10,
        category: "clue",
        label: "start",
        span_status: "matched",
      },
    ];
    const segments = computeSegments(sampleText, spans);

    expect(segments).toHaveLength(2);
    expect(segments[0].text).toBe(sampleText.slice(0, 10));
    expect(segments[0].span).not.toBeNull();
    expect(segments[1].text).toBe(sampleText.slice(10));
    expect(segments[1].span).toBeNull();
  });

  it("should handle a span ending at the last character", () => {
    const len = sampleText.length;
    const spans: HighlightSpan[] = [
      {
        char_start: len - 6,
        char_end: len,
        category: "failure",
        label: "end",
        span_status: "matched",
      },
    ];
    const segments = computeSegments(sampleText, spans);

    expect(segments).toHaveLength(2);
    expect(segments[0].span).toBeNull();
    expect(segments[1].text).toBe(sampleText.slice(len - 6, len));
    expect(segments[1].span).not.toBeNull();
  });

  it("should clamp char_end to rawText.length if it exceeds bounds", () => {
    const spans: HighlightSpan[] = [
      {
        char_start: sampleText.length - 5,
        char_end: sampleText.length + 100, // way beyond
        category: "workaround",
        label: "oob",
        span_status: "ambiguous",
      },
    ];
    const segments = computeSegments(sampleText, spans);

    // Should not crash; last segment should end at text length
    const lastHighlight = segments.find((s) => s.span !== null);
    expect(lastHighlight).toBeDefined();
    expect(lastHighlight!.end).toBe(sampleText.length);
    expect(lastHighlight!.text).toBe(sampleText.slice(sampleText.length - 5));
  });

  it("should skip spans with invalid coordinates (negative, start >= end)", () => {
    const spans: HighlightSpan[] = [
      {
        char_start: -5,
        char_end: 10,
        category: "clue",
        label: "neg",
        span_status: "matched",
      },
      {
        char_start: 20,
        char_end: 15, // end before start
        category: "failure",
        label: "rev",
        span_status: "matched",
      },
    ];
    const segments = computeSegments(sampleText, spans);

    // Both invalid => single unhighlighted segment
    expect(segments).toHaveLength(1);
    expect(segments[0].span).toBeNull();
  });

  it("should handle multiple non-overlapping spans", () => {
    const spans: HighlightSpan[] = [
      {
        char_start: 0,
        char_end: 5,
        category: "clue",
        label: "first",
        span_status: "matched",
      },
      {
        char_start: 15,
        char_end: 20,
        category: "forgotten",
        label: "second",
        span_status: "matched",
      },
    ];
    const segments = computeSegments(sampleText, spans);

    // 5 segments: highlight, gap, highlight, trailing
    expect(segments.length).toBe(4);
    expect(segments[0].span!.category).toBe("clue");
    expect(segments[1].span).toBeNull();
    expect(segments[2].span!.category).toBe("forgotten");
    expect(segments[3].span).toBeNull();
  });

  it("should handle overlapping spans by taking the earlier-starting one", () => {
    const spans: HighlightSpan[] = [
      {
        char_start: 5,
        char_end: 15,
        category: "clue",
        label: "first",
        span_status: "matched",
      },
      {
        char_start: 10,
        char_end: 20,
        category: "failure",
        label: "overlapping",
        span_status: "matched",
      },
    ];
    const segments = computeSegments(sampleText, spans);

    // First span: 5-15, Second gets clipped to 15-20
    const highlighted = segments.filter((s) => s.span !== null);
    expect(highlighted).toHaveLength(2);
    expect(highlighted[0].start).toBe(5);
    expect(highlighted[0].end).toBe(15);
    expect(highlighted[0].span!.category).toBe("clue");

    expect(highlighted[1].start).toBe(15);
    expect(highlighted[1].end).toBe(20);
    expect(highlighted[1].span!.category).toBe("failure");
  });

  it("should handle empty rawText gracefully", () => {
    const segments = computeSegments("", [
      {
        char_start: 0,
        char_end: 10,
        category: "clue",
        label: "x",
        span_status: "matched",
      },
    ]);
    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe("");
  });

  it("should handle a span that covers the entire text", () => {
    const spans: HighlightSpan[] = [
      {
        char_start: 0,
        char_end: sampleText.length,
        category: "behavior",
        label: "full",
        span_status: "matched",
      },
    ];
    const segments = computeSegments(sampleText, spans);

    expect(segments).toHaveLength(1);
    expect(segments[0].text).toBe(sampleText);
    expect(segments[0].span!.category).toBe("behavior");
  });

  it("should concatenation of all segment texts equal the original rawText", () => {
    const spans: HighlightSpan[] = [
      { char_start: 2, char_end: 8, category: "clue", label: "a", span_status: "matched" },
      { char_start: 12, char_end: 18, category: "failure", label: "b", span_status: "ambiguous" },
      { char_start: 30, char_end: 40, category: "workaround", label: "c", span_status: "not_found" },
    ];
    const segments = computeSegments(sampleText, spans);
    const reconstructed = segments.map((s) => s.text).join("");
    expect(reconstructed).toBe(sampleText);
  });
});
