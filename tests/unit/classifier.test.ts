import { describe, it, expect } from "vitest";
import {
  SingleClassificationResultSchema,
  BatchClassificationResponseSchema,
  CLASSIFIER_SCHEMA_VERSION,
} from "@/lib/ai/prompts/schemas/classification";
import { buildClassificationPrompt, CLASSIFIER_PROMPT_VERSION } from "@/lib/ai/prompts/classifier";

describe("Phase 3 — AI Relevance Classification Pipeline", () => {
  describe("Prompt Template & Versioning", () => {
    it("should export correct prompt and schema versions", () => {
      expect(CLASSIFIER_PROMPT_VERSION).toBe("1.0");
      expect(CLASSIFIER_SCHEMA_VERSION).toBe("1.0");
    });

    it("should construct prompt containing vague-memory retrieval guidelines and record JSON", () => {
      const records = [
        {
          id: "rec-001",
          platform: "reddit",
          title: "Looking for dog photo",
          raw_text: "I remember my dog was wearing a yellow hat but cannot find the date.",
        },
      ];

      const prompt = buildClassificationPrompt(records);
      expect(prompt).toContain("vaguely remembered visual items");
      expect(prompt).toContain("rec-001");
      expect(prompt).toContain("yellow hat");
      expect(prompt).toContain("is_relevant");
    });
  });

  describe("Zod Classification Schemas", () => {
    it("should accept valid relevant classification output", () => {
      const validRelevant = {
        record_id: "rec-101",
        is_relevant: true,
        confidence: 0.95,
        classification_basis: "User explicitly describes searching for an old concert photo with visual stage lighting clues.",
        retrieval_target: "concert photo",
        evidence_of_vague_memory: "remembers stage lighting but forgot date",
      };

      const parsed = SingleClassificationResultSchema.safeParse(validRelevant);
      expect(parsed.success).toBe(true);
    });

    it("should accept valid irrelevant classification output with null targets", () => {
      const validIrrelevant = {
        record_id: "rec-102",
        is_relevant: false,
        confidence: 0.98,
        classification_basis: "User is complaining about Google One storage pricing, no retrieval scenario.",
        retrieval_target: null,
        evidence_of_vague_memory: null,
      };

      const parsed = SingleClassificationResultSchema.safeParse(validIrrelevant);
      expect(parsed.success).toBe(true);
    });

    it("should reject confidence values outside 0.0 - 1.0", () => {
      const invalidHigh = {
        record_id: "rec-103",
        is_relevant: true,
        confidence: 1.5, // invalid
        classification_basis: "Some basis text",
        retrieval_target: "photo",
        evidence_of_vague_memory: "clue",
      };

      const invalidLow = {
        record_id: "rec-104",
        is_relevant: true,
        confidence: -0.2, // invalid
        classification_basis: "Some basis text",
        retrieval_target: "photo",
        evidence_of_vague_memory: "clue",
      };

      expect(SingleClassificationResultSchema.safeParse(invalidHigh).success).toBe(false);
      expect(SingleClassificationResultSchema.safeParse(invalidLow).success).toBe(false);
    });

    it("should validate a batch classification response array", () => {
      const batchResponse = {
        classifications: [
          {
            record_id: "rec-1",
            is_relevant: true,
            confidence: 0.9,
            classification_basis: "Searching for recipe screenshot from 2022",
            retrieval_target: "recipe screenshot",
            evidence_of_vague_memory: "remembers yellow background",
          },
          {
            record_id: "rec-2",
            is_relevant: false,
            confidence: 0.85,
            classification_basis: "Cloud backup error 500",
            retrieval_target: null,
            evidence_of_vague_memory: null,
          },
        ],
      };

      const parsed = BatchClassificationResponseSchema.safeParse(batchResponse);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.classifications).toHaveLength(2);
      }
    });
  });

  describe("Quality Gating Logic", () => {
    it("should correctly identify items below the 0.6 confidence threshold for review", () => {
      const items = [
        { record_id: "r1", confidence: 0.95, is_relevant: true, classification_basis: "clear match" },
        { record_id: "r2", confidence: 0.55, is_relevant: true, classification_basis: "ambiguous description" },
        { record_id: "r3", confidence: 0.40, is_relevant: false, classification_basis: "uncertain context" },
        { record_id: "r4", confidence: 0.60, is_relevant: true, classification_basis: "threshold boundary" },
      ];

      const lowConfidenceItems = items.filter((item) => item.confidence < 0.6);
      expect(lowConfidenceItems).toHaveLength(2);
      expect(lowConfidenceItems.map((i) => i.record_id)).toEqual(["r2", "r3"]);
    });
  });
});
