import { describe, it, expect } from "vitest";
import {
  computeEvidenceStrength,
  computeObservedProportion,
  computeUnknownOutcomeProportion,
  type EvidenceStrengthInput,
} from "@/lib/analysis/evidence-strength";
import { computeOpportunityMetrics } from "@/lib/analysis/opportunities";

describe("Phase 7 — Multi-Factor Evidence Strength Engine", () => {
  it("assigns 'strong' rating when ≥5 of 6 objective factors are met", () => {
    const input: EvidenceStrengthInput = {
      supporting_episode_count: 8, // factor 1: true (>=5)
      source_diversity: 3, // factor 2: true (>=3)
      observed_evidence_proportion: 0.85, // factor 3: true (>=0.6)
      has_contradictory_evidence: false, // factor 4: true
      unknown_outcome_proportion: 0.1, // factor 5: true (<0.3)
      pipeline_validation_f1: 0.82, // factor 6: true (>=0.7)
    };

    const result = computeEvidenceStrength(input);
    expect(result.rating).toBe("strong");
    expect(result.strong_factor_count).toBe(6);
    expect(result.total_factors).toBe(6);
    expect(result.factors.episode_count_sufficient).toBe(true);
    expect(result.factors.platform_diversity_sufficient).toBe(true);
    expect(result.factors.observed_proportion_sufficient).toBe(true);
    expect(result.factors.no_contradictory_evidence).toBe(true);
    expect(result.factors.low_unknown_outcomes).toBe(true);
    expect(result.factors.pipeline_validated).toBe(true);
  });

  it("assigns 'strong' rating when exactly 5 factors are met", () => {
    const input: EvidenceStrengthInput = {
      supporting_episode_count: 6, // true
      source_diversity: 2, // false (<3)
      observed_evidence_proportion: 0.75, // true
      has_contradictory_evidence: false, // true
      unknown_outcome_proportion: 0.15, // true
      pipeline_validation_f1: 0.75, // true
    };

    const result = computeEvidenceStrength(input);
    expect(result.rating).toBe("strong");
    expect(result.strong_factor_count).toBe(5);
    expect(result.factors.platform_diversity_sufficient).toBe(false);
  });

  it("assigns 'moderate' rating when 3-4 factors are met", () => {
    const input: EvidenceStrengthInput = {
      supporting_episode_count: 4, // false (<5)
      source_diversity: 2, // false (<3)
      observed_evidence_proportion: 0.7, // true (>=0.6)
      has_contradictory_evidence: false, // true
      unknown_outcome_proportion: 0.2, // true (<0.3)
      pipeline_validation_f1: 0.6, // false (<0.7)
    };

    const result = computeEvidenceStrength(input);
    expect(result.rating).toBe("moderate");
    expect(result.strong_factor_count).toBe(3);
  });

  it("assigns 'weak' rating when ≤2 factors are met", () => {
    const input: EvidenceStrengthInput = {
      supporting_episode_count: 2, // false
      source_diversity: 1, // false
      observed_evidence_proportion: 0.4, // false
      has_contradictory_evidence: true, // false
      unknown_outcome_proportion: 0.5, // false
      pipeline_validation_f1: 0.8, // true
    };

    const result = computeEvidenceStrength(input);
    expect(result.rating).toBe("weak");
    expect(result.strong_factor_count).toBe(1);
  });

  it("correctly computes observed proportion", () => {
    expect(computeObservedProportion([])).toBe(0);
    expect(
      computeObservedProportion(["observed", "observed", "interpreted", "hypothesized"])
    ).toBe(0.5);
    expect(computeObservedProportion(["observed", "observed", "observed"])).toBe(1.0);
  });

  it("correctly computes unknown outcome proportion", () => {
    expect(computeUnknownOutcomeProportion({})).toBe(0);
    expect(
      computeUnknownOutcomeProportion({ success: 5, failure: 3, unknown: 2 })
    ).toBe(0.2);
  });
});

describe("Phase 7 — Opportunity Measurable Dimensions & Explicit Denominators", () => {
  const sampleEpisodes = [
    {
      id: "ep-1",
      visual_item_type: "receipt",
      outcome: "failure",
      platform: "reddit",
      clue_categories: ["date_time", "text_content"],
      forgotten_categories: ["visual_details"],
      failure_types: ["low_recall"],
      workaround_types: ["manual_scroll"],
      search_behavior_count: 2,
      evidence_types: ["observed", "observed"],
    },
    {
      id: "ep-2",
      visual_item_type: "receipt",
      outcome: "failure",
      platform: "google_support",
      clue_categories: ["text_content"],
      forgotten_categories: ["date_time"],
      failure_types: ["low_recall"],
      workaround_types: ["keyword_stuffing", "manual_scroll"],
      search_behavior_count: 3,
      evidence_types: ["observed", "interpreted"],
    },
    {
      id: "ep-3",
      visual_item_type: "receipt",
      outcome: "abandoned",
      platform: "twitter",
      clue_categories: ["location"],
      forgotten_categories: ["text_content"],
      failure_types: ["low_recall"],
      workaround_types: [],
      search_behavior_count: 1,
      evidence_types: ["observed"],
    },
    {
      id: "ep-4",
      visual_item_type: "receipt",
      outcome: "success",
      platform: "reddit",
      clue_categories: ["date_time"],
      forgotten_categories: [],
      failure_types: ["low_recall"],
      workaround_types: ["manual_scroll"],
      search_behavior_count: 2,
      evidence_types: ["observed", "observed"],
    },
    {
      id: "ep-5",
      visual_item_type: "receipt",
      outcome: "unknown",
      platform: "reddit",
      clue_categories: ["text_content"],
      forgotten_categories: [],
      failure_types: ["low_recall"],
      workaround_types: [],
      search_behavior_count: 0,
      evidence_types: ["interpreted"],
    },
  ];

  it("calculates dataset percentage using total relevant episodes", () => {
    const metrics = computeOpportunityMetrics(sampleEpisodes, 20, 0.85);
    // 5 supporting episodes out of 20 total = 25%
    expect(metrics.supporting_episode_count).toBe(5);
    expect(metrics.total_relevant_episodes).toBe(20);
    expect(metrics.dataset_percentage).toBe(25.0);
  });

  it("calculates failure and abandonment rates strictly excluding unknown outcomes from denominator", () => {
    const metrics = computeOpportunityMetrics(sampleEpisodes, 20, 0.85);

    // Total = 5, Unknown = 1 => Known = 4
    // Failures = 2 => failure_rate = 2/4 = 50.0%
    // Abandoned = 1 => abandonment_rate = 1/4 = 25.0%
    expect(metrics.unknown_outcome_count).toBe(1);
    expect(metrics.failure_rate_denominator).toBe(4);
    expect(metrics.failure_rate).toBe(50.0);
    expect(metrics.abandonment_rate_denominator).toBe(4);
    expect(metrics.abandonment_rate).toBe(25.0);
  });

  it("calculates multi-attempt rate with explicit denominator of episodes having ≥1 search behavior", () => {
    const metrics = computeOpportunityMetrics(sampleEpisodes, 20, 0.85);

    // Episodes with behavior >= 1: ep-1 (2), ep-2 (3), ep-3 (1), ep-4 (2) => 4 episodes
    // Episodes with multi-attempt >= 2: ep-1, ep-2, ep-4 => 3 episodes
    // Multi-attempt rate = 3/4 = 75.0%
    expect(metrics.multi_attempt_denominator).toBe(4);
    expect(metrics.multi_attempt_rate).toBe(75.0);
  });

  it("calculates workaround rate and manual scroll rate with all supporting episodes denominator", () => {
    const metrics = computeOpportunityMetrics(sampleEpisodes, 20, 0.85);

    // Episodes with >=1 workaround: ep-1, ep-2, ep-4 => 3 out of 5 = 60.0%
    expect(metrics.workaround_rate).toBe(60.0);

    // Episodes with manual_scroll: ep-1, ep-2, ep-4 => 3 out of 5 = 60.0%
    expect(metrics.manual_scroll_rate).toBe(60.0);
  });

  it("computes platform diversity count accurately across distinct source platforms", () => {
    const metrics = computeOpportunityMetrics(sampleEpisodes, 20, 0.85);

    // Platforms: reddit, google_support, twitter => 3 distinct platforms
    expect(metrics.source_diversity).toBe(3);
  });
});
