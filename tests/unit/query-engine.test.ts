import { describe, it, expect, beforeEach } from "vitest";
import { classifyQuestionHeuristic } from "@/lib/ai/prompts/question-classifier";
import {
  validateQueryStepSafety,
  QueryStep,
  AllowedTables,
  AllowedOperations,
} from "@/lib/ai/prompts/schemas/query-plan";
import { validateCitations, validateQuoteGrounding } from "@/lib/ai/query-engine";
import { checkRateLimit, resetRateLimits } from "@/lib/utils/rate-limiter";
import { cosineSimilarity } from "@/lib/ai/embeddings";

describe("Phase 8 — Question Classification & Routing", () => {
  it("classifies statistical and count inquiries as quantitative", () => {
    const q1 = classifyQuestionHeuristic("How many episodes involve screenshot retrieval?");
    expect(q1.question_type).toBe("quantitative");

    const q2 = classifyQuestionHeuristic("What is the failure rate of receipt searches?");
    expect(q2.question_type).toBe("quantitative");

    const q3 = classifyQuestionHeuristic("What is the most common failure mode across the dataset?");
    expect(q3.question_type).toBe("quantitative");
  });

  it("classifies descriptive, narrative, and quote inquiries as qualitative", () => {
    const q1 = classifyQuestionHeuristic("What do users remember when finding travel photos?");
    expect(q1.question_type).toBe("qualitative");

    const q2 = classifyQuestionHeuristic("How do users describe their manual scroll workaround experience?");
    expect(q2.question_type).toBe("qualitative");

    const q3 = classifyQuestionHeuristic("Explain why users feel frustration during search.");
    expect(q3.question_type).toBe("qualitative");
  });

  it("classifies questions requesting both metrics and narrative context as mixed", () => {
    const q1 = classifyQuestionHeuristic(
      "Compare failure rates between screenshots and documents and explain what users forget."
    );
    expect(q1.question_type).toBe("mixed");

    const q2 = classifyQuestionHeuristic(
      "What is the frequency of keyword stuffing and how do users describe their workaround?"
    );
    expect(q2.question_type).toBe("mixed");
  });
});

describe("Phase 8 — Query Plan Safety & Allowlist Validation", () => {
  it("accepts valid query steps with allowed tables and columns", () => {
    const validStep: QueryStep = {
      query_id: "q1",
      description: "Count episodes by visual item type",
      table: "retrieval_episodes",
      operation: "count_group_by",
      group_by: ["visual_item_type"],
      filters: [{ column: "outcome", operator: "eq", value: "failure" }],
      joins: [],
    };

    const safety = validateQueryStepSafety(validStep);
    expect(safety.valid).toBe(true);
    expect(safety.error).toBeUndefined();
  });

  it("rejects query steps with unauthorized tables", () => {
    const maliciousStep: any = {
      query_id: "m1",
      description: "Steal passwords",
      table: "users_passwords",
      operation: "count",
      filters: [],
      joins: [],
    };

    const safety = validateQueryStepSafety(maliciousStep);
    expect(safety.valid).toBe(false);
    expect(safety.error).toContain("Unauthorized table");
  });

  it("rejects query steps with unauthorized columns or SQL injection attempts", () => {
    const injectionStep: QueryStep = {
      query_id: "inj1",
      description: "Inject column",
      table: "retrieval_episodes",
      operation: "count",
      target_column: "id; DROP TABLE retrieval_episodes;--",
      filters: [],
      joins: [],
    };

    const safety = validateQueryStepSafety(injectionStep);
    expect(safety.valid).toBe(false);
    expect(safety.error).toContain("Unauthorized column");
  });
});

describe("Phase 8 — Semantic Vector Embeddings & Similarity", () => {
  it("computes cosine similarity accurately", () => {
    // Identical vectors = 1.0
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0);

    // Orthogonal vectors = 0.0
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0.0);

    // Opposite vectors = -1.0
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0);

    // Arbitrary vectors
    const vecA = [0.5, 0.5, 0.5, 0.5];
    const vecB = [0.5, 0.5, 0.5, 0.5];
    expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(1.0);
  });
});

describe("Phase 8 — Grounded Answer & Citation Validation", () => {
  it("detects hallucinated or unprovided episode IDs", () => {
    const candidateIds = ["ep-101", "ep-102", "ep-103"];
    const citedIds = ["ep-101", "ep-999-hallucinated"];

    const validation = validateCitations(citedIds, candidateIds);
    expect(validation.valid).toBe(false);
    expect(validation.invalidIds).toEqual(["ep-999-hallucinated"]);
  });

  it("passes when all cited episode IDs exist", () => {
    const candidateIds = ["ep-101", "ep-102", "ep-103"];
    const citedIds = ["ep-101", "ep-103"];

    const validation = validateCitations(citedIds, candidateIds);
    expect(validation.valid).toBe(true);
    expect(validation.invalidIds).toHaveLength(0);
  });

  it("validates exact and normalized quote grounding in source text", () => {
    const rawText = "I tried searching for my vaccine card from 2021 in Google Photos but it returned nothing.";
    const validQuote = "searching for my vaccine card from 2021";
    const fabricatedQuote = "I lost all my photos permanently and Google deleted my backup";

    expect(validateQuoteGrounding(validQuote, rawText)).toBe(true);
    expect(validateQuoteGrounding(fabricatedQuote, rawText)).toBe(false);
  });
});

describe("Phase 8 — IP Rate Limiting (10 req/min)", () => {
  beforeEach(() => {
    resetRateLimits();
  });

  it("allows up to 10 requests within a 1-minute window", () => {
    const ip = "192.168.1.50";

    for (let i = 1; i <= 10; i++) {
      const res = checkRateLimit(ip, 10, 60_000);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(10 - i);
    }
  });

  it("blocks the 11th request when rate limit is 10 req/min", () => {
    const ip = "192.168.1.50";

    for (let i = 1; i <= 10; i++) {
      checkRateLimit(ip, 10, 60_000);
    }

    const blocked = checkRateLimit(ip, 10, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetMs).toBeGreaterThan(0);
  });

  it("does not block different IP addresses", () => {
    const ipA = "10.0.0.1";
    const ipB = "10.0.0.2";

    for (let i = 1; i <= 10; i++) {
      checkRateLimit(ipA, 10, 60_000);
    }

    // ipA is blocked
    expect(checkRateLimit(ipA, 10, 60_000).allowed).toBe(false);

    // ipB is allowed
    const resB = checkRateLimit(ipB, 10, 60_000);
    expect(resB.allowed).toBe(true);
    expect(resB.remaining).toBe(9);
  });
});
