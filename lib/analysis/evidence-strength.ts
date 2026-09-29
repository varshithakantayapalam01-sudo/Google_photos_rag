/**
 * Multi-Factor Evidence Strength Engine
 *
 * Computes evidence strength rating (strong / moderate / weak) based on
 * 6 objective factors. This is strictly differentiated from model-level
 * extraction confidence.
 *
 * Factors:
 *   1. Supporting episode count (≥5 for strong)
 *   2. Source platform diversity (≥3 for strong)
 *   3. Proportion of observed evidence (≥60% for strong)
 *   4. Absence of contradictory evidence
 *   5. Low proportion of unknown outcomes
 *   6. Pipeline gold validation benchmark
 */

import type { EvidenceStrength } from "@/types/domain";

export interface EvidenceStrengthInput {
  /** Count of DISTINCT supporting episodes */
  supporting_episode_count: number;
  /** Count of distinct source platforms */
  source_diversity: number;
  /** Proportion of evidence classified as 'observed' (0-1) */
  observed_evidence_proportion: number;
  /** Whether contradictory evidence exists */
  has_contradictory_evidence: boolean;
  /** Proportion of episodes with 'unknown' outcome (0-1) */
  unknown_outcome_proportion: number;
  /** Pipeline gold validation F1 score (0-1), from latest validation run */
  pipeline_validation_f1: number;
}

export interface EvidenceStrengthResult {
  rating: EvidenceStrength;
  factors: {
    episode_count_sufficient: boolean;
    platform_diversity_sufficient: boolean;
    observed_proportion_sufficient: boolean;
    no_contradictory_evidence: boolean;
    low_unknown_outcomes: boolean;
    pipeline_validated: boolean;
  };
  strong_factor_count: number;
  total_factors: number;
}

/**
 * Computes multi-factor evidence strength.
 *
 * Rating logic:
 * - strong: ≥5 of 6 factors met
 * - moderate: 3-4 of 6 factors met
 * - weak: ≤2 of 6 factors met
 */
export function computeEvidenceStrength(
  input: EvidenceStrengthInput
): EvidenceStrengthResult {
  const factors = {
    // Factor 1: Supporting episode count ≥ 5
    episode_count_sufficient: input.supporting_episode_count >= 5,

    // Factor 2: Source platform diversity ≥ 3
    platform_diversity_sufficient: input.source_diversity >= 3,

    // Factor 3: Proportion of observed evidence ≥ 60%
    observed_proportion_sufficient: input.observed_evidence_proportion >= 0.6,

    // Factor 4: No contradictory evidence
    no_contradictory_evidence: !input.has_contradictory_evidence,

    // Factor 5: Low proportion of unknown outcomes (< 30%)
    low_unknown_outcomes: input.unknown_outcome_proportion < 0.3,

    // Factor 6: Pipeline validated with acceptable F1 (≥ 0.7)
    pipeline_validated: input.pipeline_validation_f1 >= 0.7,
  };

  const strong_factor_count = Object.values(factors).filter(Boolean).length;
  const total_factors = 6;

  let rating: EvidenceStrength;
  if (strong_factor_count >= 5) {
    rating = "strong";
  } else if (strong_factor_count >= 3) {
    rating = "moderate";
  } else {
    rating = "weak";
  }

  return {
    rating,
    factors,
    strong_factor_count,
    total_factors,
  };
}

/**
 * Computes the observed evidence proportion from an array of evidence types.
 * Uses only 'observed', 'interpreted', 'hypothesized' types.
 */
export function computeObservedProportion(evidenceTypes: string[]): number {
  if (evidenceTypes.length === 0) return 0;
  const observedCount = evidenceTypes.filter((t) => t === "observed").length;
  return observedCount / evidenceTypes.length;
}

/**
 * Computes unknown outcome proportion from outcome counts.
 */
export function computeUnknownOutcomeProportion(
  outcomes: Record<string, number>
): number {
  const total = Object.values(outcomes).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return (outcomes["unknown"] || 0) / total;
}
