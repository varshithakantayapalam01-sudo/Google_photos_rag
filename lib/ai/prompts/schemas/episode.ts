/**
 * Episode Extraction Output Schema (Stage 3)
 * CRITICAL RULE: LLM returns evidence_quote, evidence_type, confidence ONLY.
 * The schema does NOT contain char_start or char_end (computed by application code).
 */

import { z } from "zod";

export const EXTRACTOR_SCHEMA_VERSION = "1.0";

export const ExtractedClueItemSchema = z.object({
  clue_category: z.string().min(1),
  clue_description: z.string().min(1),
  evidence_quote: z.string().min(1),
  evidence_type: z.enum(["observed", "interpreted", "hypothesized"]),
  confidence: z.number().min(0).max(1),
});

export const ExtractedForgottenItemSchema = z.object({
  attribute_category: z.string().min(1),
  description: z.string().min(1),
  evidence_quote: z.string().min(1),
  evidence_type: z.enum(["observed", "interpreted", "hypothesized"]),
  confidence: z.number().min(0).max(1),
});

export const ExtractedSearchBehaviorItemSchema = z.object({
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

export const ExtractedFailureModeItemSchema = z.object({
  failure_type: z.string().min(1),
  failure_priority: z.enum(["earliest", "primary", "secondary"]),
  description: z.string().min(1),
  evidence_quote: z.string().min(1),
  rationale_summary: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export const ExtractedWorkaroundItemSchema = z.object({
  workaround_type: z.string().min(1),
  description: z.string().min(1),
  evidence_quote: z.string().min(1),
  led_to_success: z.boolean().nullable().optional(),
});

export const SingleExtractedEpisodeSchema = z.object({
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
  remembered_clues: z.array(ExtractedClueItemSchema).default([]),
  forgotten_attributes: z.array(ExtractedForgottenItemSchema).default([]),
  search_behaviors: z.array(ExtractedSearchBehaviorItemSchema).default([]),
  failure_modes: z.array(ExtractedFailureModeItemSchema).default([]),
  workarounds: z.array(ExtractedWorkaroundItemSchema).default([]),
});

export const ExtractorResponseSchema = z.object({
  episodes: z.array(SingleExtractedEpisodeSchema).min(1),
});

export type SingleExtractedEpisode = z.infer<typeof SingleExtractedEpisodeSchema>;
export type ExtractorResponse = z.infer<typeof ExtractorResponseSchema>;
