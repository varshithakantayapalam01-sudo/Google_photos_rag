import { describe, it, expect } from "vitest";
import { computeTextHash, normalizeText } from "@/lib/utils/helpers";
import { locateEvidenceSpan } from "@/lib/ai/span-locator";
import { computeOpportunityMetrics } from "@/lib/analysis/opportunities";
import { computeEvidenceStrength } from "@/lib/analysis/evidence-strength";
import { classifyQuestionHeuristic } from "@/lib/ai/prompts/question-classifier";
import { validateQueryStepSafety, QueryStep } from "@/lib/ai/prompts/schemas/query-plan";
import { validateCitations, validateQuoteGrounding } from "@/lib/ai/query-engine";
import { generateResearchSynthesis } from "@/lib/analysis/synthesis";
import { computeResearchLimitations } from "@/lib/analysis/limitations";

describe("Phase 9 — End-to-End Pipeline Integration Test", () => {
  it("Stage 1 (Ingest): normalizes text and computes SHA-256 for exact deduplication", () => {
    const rawTextA = "  I couldn't find my passport photo in Google Photos!  \n";
    const rawTextB = "I couldn't find my passport photo in Google Photos!";

    const hashA = computeTextHash(rawTextA);
    const hashB = computeTextHash(rawTextB);

    expect(hashA).toBe(hashB);
  });

  it("Stage 3 (Extract + Spans): deterministically locates exact character spans in source text", () => {
    const sourceText = "I lost my vaccine card and searched for 'vaccine 2021' in Google Photos but got zero hits.";
    const quote = "searched for 'vaccine 2021'";

    const span = locateEvidenceSpan(sourceText, quote);

    expect(span.span_status).toBe("matched");
    expect(span.char_start).not.toBeNull();
    expect(span.char_end).not.toBeNull();
    expect(sourceText.slice(span.char_start!, span.char_end!)).toBe(quote);
  });

  it("Stage 4 (Analyze): calculates opportunity metrics with denominator transparency", () => {
    const episodes = [
      {
        id: "e1",
        visual_item_type: "receipt",
        outcome: "failure",
        platform: "reddit",
        clue_categories: ["date_time"],
        forgotten_categories: [],
        failure_types: ["low_recall"],
        workaround_types: ["manual_scroll"],
        search_behavior_count: 2,
        evidence_types: ["observed"],
      },
      {
        id: "e2",
        visual_item_type: "receipt",
        outcome: "abandoned",
        platform: "google_support",
        clue_categories: ["text_content"],
        forgotten_categories: [],
        failure_types: ["low_recall"],
        workaround_types: [],
        search_behavior_count: 1,
        evidence_types: ["observed"],
      },
      {
        id: "e3",
        visual_item_type: "receipt",
        outcome: "unknown",
        platform: "twitter",
        clue_categories: [],
        forgotten_categories: [],
        failure_types: ["low_recall"],
        workaround_types: [],
        search_behavior_count: 0,
        evidence_types: ["interpreted"],
      },
    ];

    const metrics = computeOpportunityMetrics(episodes, 10, 0.85);

    expect(metrics.supporting_episode_count).toBe(3);
    expect(metrics.total_relevant_episodes).toBe(10);
    expect(metrics.dataset_percentage).toBe(30.0);
    expect(metrics.unknown_outcome_count).toBe(1);
    // Known outcomes = 2. Failures = 1, Abandoned = 1.
    expect(metrics.failure_rate_denominator).toBe(2);
    expect(metrics.failure_rate).toBe(50.0);
    expect(metrics.abandonment_rate_denominator).toBe(2);
    expect(metrics.abandonment_rate).toBe(50.0);
  });

  it("Stage 4 (Evidence Strength): computes 6-factor rating separate from model confidence", () => {
    const rating = computeEvidenceStrength({
      supporting_episode_count: 6,
      source_diversity: 3,
      observed_evidence_proportion: 0.8,
      has_contradictory_evidence: false,
      unknown_outcome_proportion: 0.1,
      pipeline_validation_f1: 0.85,
    });

    expect(rating.rating).toBe("strong");
    expect(rating.strong_factor_count).toBe(6);
  });

  it("Stage 5 (Hybrid Query Router): correctly plans and validates query execution", () => {
    const quantQuestion = "How many screenshot retrieval episodes resulted in failure?";
    const classification = classifyQuestionHeuristic(quantQuestion);
    expect(classification.question_type).toBe("quantitative");

    const validStep: QueryStep = {
      query_id: "q1",
      description: "Count screenshot episodes with failure outcome",
      table: "retrieval_episodes",
      operation: "count",
      filters: [
        { column: "visual_item_type", operator: "eq", value: "screenshot" },
        { column: "outcome", operator: "eq", value: "failure" },
      ],
      joins: [],
    };

    const safety = validateQueryStepSafety(validStep);
    expect(safety.valid).toBe(true);

    const citations = validateCitations(["e1", "e2"], ["e1", "e2", "e3"]);
    expect(citations.valid).toBe(true);

    const quoteValid = validateQuoteGrounding(
      "searched for 'vaccine 2021'",
      "I searched for 'vaccine 2021' in Google Photos"
    );
    expect(quoteValid).toBe(true);
  });

  it("Stage 6 (Synthesis & Governance): produces three-tier synthesis and limitations report", async () => {
    const synthesis = await generateResearchSynthesis();
    expect(synthesis.what_we_know.length).toBeGreaterThan(0);
    expect(synthesis.what_we_think.length).toBeGreaterThan(0);
    expect(synthesis.what_to_validate.length).toBe(5);

    const limitations = await computeResearchLimitations();
    expect(limitations.limitations.length).toBeGreaterThan(0);
    expect(limitations.researcher_guidance.length).toBeGreaterThan(0);
  });
});
