/**
 * Zod validation schemas for AI outputs and API inputs
 */

import { z } from "zod";

// Relevance Classification Output Schema
export const ClassificationOutputSchema = z.object({
  is_relevant: z.boolean(),
  confidence: z.number().min(0).max(1),
  classification_basis: z.string().min(5),
  retrieval_target: z.string().nullable(),
  evidence_of_vague_memory: z.string().nullable(),
});

export type ClassificationOutput = z.infer<typeof ClassificationOutputSchema>;

// Evidence-bearing Clue Schema (LLM returns exact quote, evidence_type, confidence — NO character offsets)
export const ExtractedClueSchema = z.object({
  clue_category: z.string().min(1),
  clue_description: z.string().min(1),
  evidence_quote: z.string().min(1),
  evidence_type: z.enum(["observed", "interpreted", "hypothesized"]),
  confidence: z.number().min(0).max(1),
});

export const ExtractedForgottenAttributeSchema = z.object({
  attribute_category: z.string().min(1),
  description: z.string().min(1),
  evidence_quote: z.string().min(1),
  evidence_type: z.enum(["observed", "interpreted", "hypothesized"]),
  confidence: z.number().min(0).max(1),
});

export const ExtractedSearchBehaviorSchema = z.object({
  behavior_type: z.enum([
    "initial_query",
    "subsequent_query",
    "filter",
    "browse",
    "scroll",
    "strategy_change",
  ]),
  description: z.string().min(1),
  sequence_order: z.number().nullable().optional(),
  evidence_quote: z.string().min(1),
});

export const ExtractedFailureModeSchema = z.object({
  failure_type: z.string().min(1),
  failure_priority: z.enum(["earliest", "primary", "secondary"]),
  description: z.string().min(1),
  evidence_quote: z.string().min(1),
  rationale_summary: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export const ExtractedWorkaroundSchema = z.object({
  workaround_type: z.string().min(1),
  description: z.string().min(1),
  evidence_quote: z.string().min(1),
  led_to_success: z.boolean().nullable().optional(),
});

// Full Structured Episode Extraction Output Schema (one record may contain multiple episodes)
export const ExtractedEpisodeSchema = z.object({
  visual_item_type: z.string().min(1),
  retrieval_goal: z.string().min(1),
  why_user_needs_item: z.string().nullable().optional(),
  outcome: z.enum(["success", "partial_success", "failure", "abandoned", "unknown"]),
  impact_type: z.enum(["functional", "emotional"]).nullable().optional(),
  urgency: z.string().nullable().optional(),
  frustration_level: z.enum(["low", "moderate", "high", "extreme"]).nullable().optional(),
  consequence: z.string().nullable().optional(),
  rationale_summary: z.string().min(5),
  extraction_confidence: z.number().min(0).max(1),
  remembered_clues: z.array(ExtractedClueSchema).default([]),
  forgotten_attributes: z.array(ExtractedForgottenAttributeSchema).default([]),
  search_behaviors: z.array(ExtractedSearchBehaviorSchema).default([]),
  failure_modes: z.array(ExtractedFailureModeSchema).default([]),
  workarounds: z.array(ExtractedWorkaroundSchema).default([]),
});

export const ExtractorOutputSchema = z.object({
  episodes: z.array(ExtractedEpisodeSchema).min(1),
});

export type ExtractedEpisode = z.infer<typeof ExtractedEpisodeSchema>;
export type ExtractorOutput = z.infer<typeof ExtractorOutputSchema>;

// Question Classification Output Schema
export const QuestionClassificationSchema = z.object({
  question_type: z.enum(["quantitative", "qualitative", "mixed"]),
  quantitative_aspects: z.array(z.string()).default([]),
  qualitative_aspects: z.array(z.string()).default([]),
  classification_basis: z.string().min(5),
});

export type QuestionClassificationOutput = z.infer<typeof QuestionClassificationSchema>;

// Structured Query Plan Schema
export const QueryPlanOperationSchema = z.object({
  query_id: z.string(),
  description: z.string(),
  table: z.enum([
    "retrieval_episodes",
    "remembered_clues",
    "forgotten_attributes",
    "search_behaviors",
    "failure_modes",
    "workarounds",
    "raw_records",
    "collection_batches",
    "opportunities",
  ]),
  operation: z.enum([
    "count",
    "count_group_by",
    "percentage",
    "distribution",
    "cross_tabulation",
    "top_n",
    "comparison",
  ]),
  group_by: z.array(z.string()).optional(),
  filters: z.record(z.unknown()).optional(),
  numerator_filter: z.record(z.unknown()).optional(),
  denominator_filter: z.record(z.unknown()).optional(),
  joins: z.array(z.string()).optional(),
  limit: z.number().optional(),
});

export const StructuredQueryPlanSchema = z.object({
  query_plan: z.array(QueryPlanOperationSchema).min(1),
});

export type StructuredQueryPlan = z.infer<typeof StructuredQueryPlanSchema>;

// Grounded Answer Output Schema
export const GroundedAnswerOutputSchema = z.object({
  answer_markdown: z.string().min(10),
  cited_episode_ids: z.array(z.string()),
  evidence_quotes: z.array(
    z.object({
      episode_id: z.string(),
      quote: z.string(),
    })
  ),
  evidence_strength: z.enum(["strong", "moderate", "weak", "insufficient"]),
  evidence_strength_factors: z.object({
    supporting_episodes_count: z.number(),
    independent_platforms_count: z.number(),
    observed_evidence_percentage: z.number(),
    has_contradictory_evidence: z.boolean(),
    unknown_outcome_percentage: z.number(),
    pipeline_validation_f1: z.number().default(0.85),
  }),
  contradictory_evidence: z.string().nullable().optional(),
  limitations_note: z.string().nullable().optional(),
});

export type GroundedAnswerOutput = z.infer<typeof GroundedAnswerOutputSchema>;
