/**
 * Standard taxonomies and constants for Google Photos Retrieval Research
 */

import {
  VisualItemType,
  ClueCategory,
  ForgottenAttributeCategory,
  SearchBehaviorType,
  FailureType,
  FailurePriority,
  WorkaroundType,
  RetrievalOutcome,
  ImpactType,
  FrustrationLevel,
  EvidenceType,
  SpanStatus,
  EvidenceStrength,
  QuestionType,
  DatasetSplit,
  MatchMethod,
  InsightType,
  QualityFlagType,
} from "@/types/domain";

export const VISUAL_ITEM_TYPES: readonly VisualItemType[] = [
  "photo",
  "screenshot",
  "receipt",
  "document",
  "video",
  "meme",
  "ticket",
  "chat_image",
  "artwork",
  "other",
] as const;

export const CLUE_CATEGORIES: readonly ClueCategory[] = [
  "visual_feature",
  "color",
  "setting",
  "temporal_approx",
  "people_present",
  "activity",
  "associated_event",
  "emotional_state",
  "device_used",
  "co_occurring_media",
  "location_coarse",
  "location_fine",
  "text_on_image",
  "composition",
  "lighting",
  "season_weather",
] as const;

export const FORGOTTEN_ATTRIBUTE_CATEGORIES: readonly ForgottenAttributeCategory[] = [
  "exact_date",
  "exact_location",
  "album_name",
  "file_name",
  "device_source",
  "associated_person_name",
  "text_content",
  "account_source",
  "sync_status",
] as const;

export const SEARCH_BEHAVIOR_TYPES: readonly SearchBehaviorType[] = [
  "initial_query",
  "subsequent_query",
  "filter",
  "browse",
  "scroll",
  "strategy_change",
] as const;

export const FAILURE_TYPES: readonly FailureType[] = [
  "expression",
  "interpretation",
  "candidate_retrieval",
  "recognition",
  "refinement",
  "other",
] as const;

export const FAILURE_PRIORITIES: readonly FailurePriority[] = [
  "earliest",
  "primary",
  "secondary",
] as const;

export const WORKAROUND_TYPES: readonly WorkaroundType[] = [
  "manual_scroll",
  "browse_by_date",
  "browse_by_person",
  "browse_by_location",
  "check_albums",
  "search_other_app",
  "check_messages",
  "ask_person",
  "search_cloud_folders",
  "google_search",
  "give_up",
  "other",
] as const;

export const RETRIEVAL_OUTCOMES: readonly RetrievalOutcome[] = [
  "success",
  "partial_success",
  "failure",
  "abandoned",
  "unknown",
] as const;

export const FRUSTRATION_LEVELS: readonly FrustrationLevel[] = [
  "low",
  "moderate",
  "high",
  "extreme",
] as const;

export const IMPACT_TYPES: readonly ImpactType[] = [
  "functional",
  "emotional",
] as const;

export const EVIDENCE_TYPES: readonly EvidenceType[] = [
  "observed",
  "interpreted",
  "hypothesized",
] as const;

export const SPAN_STATUSES: readonly SpanStatus[] = [
  "matched",
  "ambiguous",
  "not_found",
  "pending",
] as const;

export const EVIDENCE_STRENGTH_LEVELS: readonly EvidenceStrength[] = [
  "strong",
  "moderate",
  "weak",
  "insufficient",
] as const;

export const QUESTION_TYPES: readonly QuestionType[] = [
  "quantitative",
  "qualitative",
  "mixed",
] as const;

export const DATASET_SPLITS: readonly DatasetSplit[] = [
  "development",
  "holdout",
] as const;

export const MATCH_METHODS: readonly MatchMethod[] = [
  "automatic",
  "manual",
] as const;

export const INSIGHT_TYPES: readonly InsightType[] = [
  "what_we_know",
  "what_we_think",
  "what_to_validate",
] as const;

export const QUALITY_FLAG_TYPES: readonly QualityFlagType[] = [
  "duplicate",
  "unsupported_claim",
  "small_sample",
  "irrelevant_included",
  "sentiment_as_severity",
  "frequency_as_importance",
  "hypothesis_as_fact",
  "source_overrepresentation",
  "broken_url",
  "overlapping_category",
  "premature_solution_bias",
] as const;

// Default versions
export const DEFAULT_CLASSIFIER_PROMPT_VERSION = "1.0";
export const DEFAULT_CLASSIFIER_SCHEMA_VERSION = "1.0";
export const DEFAULT_EXTRACTOR_PROMPT_VERSION = "1.0";
export const DEFAULT_EXTRACTOR_SCHEMA_VERSION = "1.0";
export const DEFAULT_QUERY_PLANNER_PROMPT_VERSION = "1.0";
export const DEFAULT_QUERY_PLANNER_SCHEMA_VERSION = "1.0";
export const DEFAULT_ANSWER_PROMPT_VERSION = "1.0";
export const DEFAULT_ANSWER_SCHEMA_VERSION = "1.0";
export const DEFAULT_SYNTHESIS_PROMPT_VERSION = "1.0";
export const DEFAULT_SYNTHESIS_SCHEMA_VERSION = "1.0";
