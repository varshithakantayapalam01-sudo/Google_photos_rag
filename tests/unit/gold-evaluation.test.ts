/**
 * Unit test suite for Gold Dataset Validation & Benchmark Evaluation Engine (Phase 5)
 * Tests confusion matrix metrics, Jaccard clue similarity, 1:1 / 1:N / N:M episode matching,
 * manual override handling, and Development vs Holdout split evaluation.
 */

import { describe, it, expect } from "vitest";
import {
  calculateRelevanceMetrics,
  calculateJaccardSimilarity,
  evaluatePartition,
} from "@/lib/validation/evaluate";
import { matchEpisodesForRecord, computeEpisodePairSimilarity } from "@/lib/validation/matcher";
import { GoldEpisodeLabel, RetrievalEpisode } from "@/types/database";

describe("Gold Evaluation & Benchmark Engine", () => {
  describe("Relevance Metrics Calculation", () => {
    it("computes precision, recall, and F1 accurately", () => {
      // 8 TP, 2 FP, 18 TN, 2 FN (Total: 30)
      const metrics = calculateRelevanceMetrics(8, 2, 18, 2);
      expect(metrics.precision).toBe(0.8); // 8 / 10
      expect(metrics.recall).toBe(0.8); // 8 / 10
      expect(metrics.f1).toBe(0.8);
    });

    it("handles zero denominator boundary conditions gracefully without NaN", () => {
      const zeroMetrics = calculateRelevanceMetrics(0, 0, 10, 0);
      expect(zeroMetrics.precision).toBe(1.0);
      expect(zeroMetrics.recall).toBe(1.0);
      expect(zeroMetrics.f1).toBe(1.0);

      const allWrongMetrics = calculateRelevanceMetrics(0, 5, 0, 5);
      expect(allWrongMetrics.precision).toBe(0.0);
      expect(allWrongMetrics.recall).toBe(0.0);
      expect(allWrongMetrics.f1).toBe(0.0);
    });
  });

  describe("Jaccard Similarity Calculation", () => {
    it("returns 1.0 for identical category arrays", () => {
      const arr1 = ["visual_feature", "spatial_location"];
      const arr2 = ["spatial_location", "visual_feature"];
      expect(calculateJaccardSimilarity(arr1, arr2)).toBe(1.0);
    });

    it("returns 0.0 for completely disjoint category arrays", () => {
      const arr1 = ["visual_feature"];
      const arr2 = ["exact_date", "social_context"];
      expect(calculateJaccardSimilarity(arr1, arr2)).toBe(0.0);
    });

    it("returns correct fractional Jaccard similarity for partial overlaps", () => {
      const arr1 = ["visual_feature", "text_in_image", "spatial_location"];
      const arr2 = ["visual_feature", "exact_date"];
      // Intersection: 1 (visual_feature), Union: 4 (visual_feature, text_in_image, spatial_location, exact_date) -> 1/4 = 0.25
      expect(calculateJaccardSimilarity(arr1, arr2)).toBe(0.25);
    });

    it("returns 1.0 when both arrays are empty", () => {
      expect(calculateJaccardSimilarity([], [])).toBe(1.0);
    });
  });

  describe("Episode Matching Engine", () => {
    const mockGoldEp1: GoldEpisodeLabel = {
      id: "gold-ep-1",
      gold_record_id: "rec-1",
      episode_index: 1,
      episode_description: "Find picture of dog in yellow raincoat",
      visual_item_type: "photo",
      remembered_clues: [{ clue_category: "visual_feature" }],
      forgotten_attributes: [{ attribute_category: "exact_date" }],
      primary_failure_mode: "candidate_retrieval",
      outcome: "success",
      notes: null,
    };

    const mockGoldEp2: GoldEpisodeLabel = {
      id: "gold-ep-2",
      gold_record_id: "rec-1",
      episode_index: 2,
      episode_description: "Find receipt screenshot from dinner",
      visual_item_type: "document_screenshot",
      remembered_clues: [{ clue_category: "text_in_image" }],
      forgotten_attributes: [{ attribute_category: "album_organization" }],
      primary_failure_mode: "zero_results",
      outcome: "failure",
      notes: null,
    };

    const mockAiEp1: any = {
      id: "ai-ep-1",
      record_id: "rec-1",
      visual_item_type: "photo",
      retrieval_goal: "Find picture of dog in yellow raincoat",
      outcome: "success",
      extraction_confidence: 0.95,
      remembered_clues: [{ clue_category: "visual_feature" }],
      failure_modes: [{ failure_type: "candidate_retrieval" }],
    };

    const mockAiEp2: any = {
      id: "ai-ep-2",
      record_id: "rec-1",
      visual_item_type: "document_screenshot",
      retrieval_goal: "Find dinner receipt screenshot",
      outcome: "failure",
      extraction_confidence: 0.9,
      remembered_clues: [{ clue_category: "text_in_image" }],
      failure_modes: [{ failure_type: "zero_results" }],
    };

    it("handles 1:1 simple automatic matching with high confidence", () => {
      const res = matchEpisodesForRecord([mockGoldEp1], [mockAiEp1]);
      expect(res.matches.length).toBe(1);
      expect(res.matches[0].gold_episode_id).toBe("gold-ep-1");
      expect(res.matches[0].ai_episode_id).toBe("ai-ep-1");
      expect(res.matches[0].match_method).toBe("automatic");
      expect(res.matches[0].match_confidence).toBe("high");
      expect(res.unmatched_gold_ids.length).toBe(0);
      expect(res.unmatched_ai_ids.length).toBe(0);
    });

    it("handles multi-episode 2:2 matching correctly based on semantic similarity", () => {
      // Intentionally supply AI episodes in reversed order to test similarity sorting
      const res = matchEpisodesForRecord([mockGoldEp1, mockGoldEp2], [mockAiEp2, mockAiEp1]);

      expect(res.matches.length).toBe(2);
      const match1 = res.matches.find((m) => m.gold_episode_id === "gold-ep-1");
      const match2 = res.matches.find((m) => m.gold_episode_id === "gold-ep-2");

      expect(match1?.ai_episode_id).toBe("ai-ep-1");
      expect(match2?.ai_episode_id).toBe("ai-ep-2");
      expect(res.unmatched_gold_ids.length).toBe(0);
      expect(res.unmatched_ai_ids.length).toBe(0);
    });

    it("supports manual override pairings", () => {
      const overrides = { "gold-ep-1": "ai-ep-2" };
      const res = matchEpisodesForRecord([mockGoldEp1], [mockAiEp1, mockAiEp2], overrides);

      expect(res.matches[0].gold_episode_id).toBe("gold-ep-1");
      expect(res.matches[0].ai_episode_id).toBe("ai-ep-2");
      expect(res.matches[0].match_method).toBe("manual");
    });

    it("identifies unmatched false positives and false negatives", () => {
      // 2 Gold episodes, but AI only returned 1 (AI missed ep2) + 1 spurious extra AI episode (ai-ep-3)
      const mockAiEp3 = { ...mockAiEp1, id: "ai-ep-3", retrieval_goal: "Random holiday scenery" };
      const res = matchEpisodesForRecord([mockGoldEp1, mockGoldEp2], [mockAiEp1, mockAiEp3]);

      expect(res.unmatched_gold_ids).toContain("gold-ep-2"); // False Negative
      expect(res.unmatched_ai_ids).toContain("ai-ep-3"); // False Positive
    });
  });

  describe("Partition Evaluation (Development & Holdout)", () => {
    it("correctly evaluates a multi-record partition and computes all agreement metrics", () => {
      const sampleRecords = [
        {
          goldRecord: {
            id: "g-1",
            record_id: "r-1",
            is_relevant: true,
            dataset_split: "development" as const,
            expected_episode_count: 1,
            labeller_notes: null,
            labelled_at: new Date().toISOString(),
          },
          goldEpisodes: [
            {
              id: "ge-1",
              gold_record_id: "g-1",
              episode_index: 1,
              episode_description: "Find concert video",
              visual_item_type: "video",
              remembered_clues: [{ clue_category: "visual_feature" }],
              forgotten_attributes: [{ attribute_category: "exact_date" }],
              primary_failure_mode: "semantic_gap",
              outcome: "failure",
              notes: null,
            },
          ],
          aiClassification: {
            id: "c-1",
            record_id: "r-1",
            is_relevant: true,
            confidence: 0.95,
            classification_basis: "Matches vague search",
            retrieval_target: "video",
            evidence_of_vague_memory: "laser lights",
            classified_at: new Date().toISOString(),
            model_version: "gemini-3.5-flash-lite",
            prompt_version: "1.0",
            schema_version: "1.0",
          },
          aiEpisodes: [
            {
              id: "ae-1",
              record_id: "r-1",
              visual_item_type: "video",
              retrieval_goal: "Find concert video with laser lights",
              why_user_needs_item: null,
              outcome: "failure",
              impact_type: null,
              urgency: null,
              frustration_level: null,
              consequence: null,
              rationale_summary: "User tried searching for concert video",
              extraction_confidence: 0.92,
              model_version: "gemini-3.8-flash",
              prompt_version: "1.0",
              schema_version: "1.0",
              extracted_at: new Date().toISOString(),
              remembered_clues: [{ clue_category: "visual_feature" }],
              failure_modes: [{ failure_type: "semantic_gap" }],
            },
          ],
        },
        {
          goldRecord: {
            id: "g-2",
            record_id: "r-2",
            is_relevant: false,
            dataset_split: "development" as const,
            expected_episode_count: 0,
            labeller_notes: null,
            labelled_at: new Date().toISOString(),
          },
          goldEpisodes: [],
          aiClassification: {
            id: "c-2",
            record_id: "r-2",
            is_relevant: false,
            confidence: 0.9,
            classification_basis: "Storage question",
            retrieval_target: null,
            evidence_of_vague_memory: null,
            classified_at: new Date().toISOString(),
            model_version: "gemini-3.5-flash-lite",
            prompt_version: "1.0",
            schema_version: "1.0",
          },
          aiEpisodes: [],
        },
      ];

      const { metrics, matches } = evaluatePartition(sampleRecords);

      expect(metrics.record_count).toBe(2);
      expect(metrics.relevant_gold_count).toBe(1);
      expect(metrics.irrelevant_gold_count).toBe(1);
      expect(metrics.tp).toBe(1);
      expect(metrics.tn).toBe(1);
      expect(metrics.fp).toBe(0);
      expect(metrics.fn).toBe(0);
      expect(metrics.relevance_precision).toBe(1.0);
      expect(metrics.relevance_recall).toBe(1.0);
      expect(metrics.relevance_f1).toBe(1.0);
      expect(metrics.episode_count_agreement).toBe(1.0);
      expect(metrics.clue_extraction_agreement).toBe(1.0);
      expect(metrics.failure_mode_agreement).toBe(1.0);
      expect(metrics.outcome_agreement).toBe(1.0);
      expect(matches.length).toBe(1);
    });
  });
});
