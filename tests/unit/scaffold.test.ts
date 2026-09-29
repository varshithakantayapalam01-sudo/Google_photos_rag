import { describe, it, expect } from "vitest";
import {
  VISUAL_ITEM_TYPES,
  CLUE_CATEGORIES,
  FORGOTTEN_ATTRIBUTE_CATEGORIES,
  FAILURE_TYPES,
  WORKAROUND_TYPES,
  RETRIEVAL_OUTCOMES,
  DATASET_SPLITS,
  EVIDENCE_STRENGTH_LEVELS,
} from "@/lib/utils/constants";
import {
  normalizeText,
  computeTextHash,
  sanitizeRawRecordData,
  calculateStringSimilarity,
} from "@/lib/utils/helpers";
import {
  getClassificationVersions,
  getExtractionVersions,
  getQueryPlannerVersions,
} from "@/lib/utils/versioning";
import {
  ClassificationOutputSchema,
  ExtractorOutputSchema,
  QuestionClassificationSchema,
  StructuredQueryPlanSchema,
  GroundedAnswerOutputSchema,
} from "@/lib/utils/validators";

describe("Phase 0 — Project Scaffold & Foundations", () => {
  describe("Taxonomies & Domain Constants", () => {
    it("should include core visual item types", () => {
      expect(VISUAL_ITEM_TYPES).toContain("photo");
      expect(VISUAL_ITEM_TYPES).toContain("screenshot");
      expect(VISUAL_ITEM_TYPES).toContain("receipt");
      expect(VISUAL_ITEM_TYPES.length).toBeGreaterThanOrEqual(8);
    });

    it("should include complete clue taxonomy", () => {
      expect(CLUE_CATEGORIES).toContain("visual_feature");
      expect(CLUE_CATEGORIES).toContain("temporal_approx");
      expect(CLUE_CATEGORIES).toContain("setting");
      expect(CLUE_CATEGORIES).toContain("people_present");
      expect(CLUE_CATEGORIES.length).toBeGreaterThanOrEqual(12);
    });

    it("should define dataset splits for gold validation", () => {
      expect(DATASET_SPLITS).toEqual(["development", "holdout"]);
    });

    it("should define multi-factor evidence strength levels", () => {
      expect(EVIDENCE_STRENGTH_LEVELS).toEqual([
        "strong",
        "moderate",
        "weak",
        "insufficient",
      ]);
    });
  });

  describe("Text Normalization & Deduplication Utilities", () => {
    it("should normalize whitespace and Unicode characters", () => {
      const raw = "  Looking   for a photo\n\nfrom 2019...\t  ";
      const normalized = normalizeText(raw);
      expect(normalized).toBe("Looking for a photo from 2019...");
    });

    it("should compute deterministic SHA-256 hashes", () => {
      const text1 = "Can't find my passport photo from last trip";
      const text2 = "  can't find my passport photo from last trip\n ";
      const hash1 = computeTextHash(text1);
      const hash2 = computeTextHash(text2);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it("should strip author and username fields from raw record payloads", () => {
      const rawRecord = {
        platform: "reddit",
        raw_text: "I forgot where my receipt was saved",
        author: "john_doe_99",
        username: "johndoe",
        author_name: "John",
        source_url: "https://reddit.com/r/googlephotos/123",
      };
      const sanitized = sanitizeRawRecordData(rawRecord);
      expect(sanitized).not.toHaveProperty("author");
      expect(sanitized).not.toHaveProperty("username");
      expect(sanitized).not.toHaveProperty("author_name");
      expect(sanitized).toHaveProperty("raw_text");
      expect(sanitized).toHaveProperty("platform");
    });

    it("should calculate string similarity correctly", () => {
      const s1 = "I lost my concert video from yesterday";
      const s2 = "I lost my concert video from yesterday night";
      const similarity = calculateStringSimilarity(s1, s2);
      expect(similarity).toBeGreaterThan(0.8);
      expect(similarity).toBeLessThanOrEqual(1.0);
    });
  });

  describe("Version Tracking", () => {
    it("should provide version metadata for all pipeline stages", () => {
      const classVersions = getClassificationVersions();
      expect(classVersions.model_version).toBeDefined();
      expect(classVersions.prompt_version).toBe("1.0");

      const extractVersions = getExtractionVersions();
      expect(extractVersions.model_version).toBeDefined();
      expect(extractVersions.prompt_version).toBe("1.0");

      const queryPlanVersions = getQueryPlannerVersions();
      expect(queryPlanVersions.prompt_version).toBe("1.0");
    });
  });

  describe("Zod AI Output Schema Validation", () => {
    it("should validate a well-formed classification output", () => {
      const valid = {
        is_relevant: true,
        confidence: 0.95,
        classification_basis: "User explicitly mentions trying to find a lost concert photo.",
        retrieval_target: "concert photo",
        evidence_of_vague_memory: "remembers red stage lighting but forgot month",
      };
      expect(() => ClassificationOutputSchema.parse(valid)).not.toThrow();
    });

    it("should reject classification output missing confidence or basis", () => {
      const invalid = {
        is_relevant: true,
      };
      expect(() => ClassificationOutputSchema.parse(invalid)).toThrow();
    });

    it("should validate an episode extractor output with exact quotes and NO character offsets", () => {
      const validExtractorOutput = {
        episodes: [
          {
            visual_item_type: "photo",
            retrieval_goal: "Find picture of golden gate bridge at sunset",
            outcome: "failure",
            frustration_level: "high",
            rationale_summary: "User spent 30 minutes searching by keywords and gave up.",
            extraction_confidence: 0.92,
            remembered_clues: [
              {
                clue_category: "visual_feature",
                clue_description: "Red bridge with orange sunset sky",
                evidence_quote: "it had the red bridge with orange sunset sky",
                evidence_type: "observed",
                confidence: 0.95,
              },
            ],
            forgotten_attributes: [
              {
                attribute_category: "exact_date",
                description: "Did not remember whether trip was in 2018 or 2019",
                evidence_quote: "can't remember if it was 2018 or 2019",
                evidence_type: "observed",
                confidence: 0.9,
              },
            ],
            search_behaviors: [
              {
                behavior_type: "initial_query",
                description: "Searched for sunset bridge",
                evidence_quote: "I typed sunset bridge",
              },
            ],
            failure_modes: [
              {
                failure_type: "candidate_retrieval",
                failure_priority: "primary",
                description: "Google photos returned unrelated sunset pictures",
                evidence_quote: "it only showed random sunsets from Florida",
                rationale_summary: "Search failed to return target candidate.",
                confidence: 0.9,
              },
            ],
            workarounds: [
              {
                workaround_type: "manual_scroll",
                description: "Scrolled back 5 years through library",
                evidence_quote: "ended up scrolling for an hour",
                led_to_success: false,
              },
            ],
          },
        ],
      };
      expect(() => ExtractorOutputSchema.parse(validExtractorOutput)).not.toThrow();
    });

    it("should validate query plan and grounded answer schemas", () => {
      const validPlan = {
        query_plan: [
          {
            query_id: "q1",
            description: "Count failure episodes for screenshots",
            table: "retrieval_episodes",
            operation: "count",
            filters: { visual_item_type: "screenshot", outcome: "failure" },
          },
        ],
      };
      expect(() => StructuredQueryPlanSchema.parse(validPlan)).not.toThrow();

      const validAnswer = {
        answer_markdown: "Based on 12 distinct episodes across 3 platforms, screenshots have a 65% failure rate.",
        cited_episode_ids: ["ep-1", "ep-2"],
        evidence_quotes: [{ episode_id: "ep-1", quote: "I could not find the wifi screenshot" }],
        evidence_strength: "strong",
        evidence_strength_factors: {
          supporting_episodes_count: 12,
          independent_platforms_count: 3,
          observed_evidence_percentage: 85,
          has_contradictory_evidence: false,
          unknown_outcome_percentage: 5,
          pipeline_validation_f1: 0.88,
        },
      };
      expect(() => GroundedAnswerOutputSchema.parse(validAnswer)).not.toThrow();
    });
  });
});
