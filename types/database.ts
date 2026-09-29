/**
 * Database entity interfaces for PostgreSQL / Supabase
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
  DatasetSplit,
  MatchMethod,
  MatchConfidence,
  InsightType,
  QualityFlagType,
} from "./domain";

export * from "./domain";



export interface CollectionBatch {
  id: string;
  platform: string;
  search_query: string | null;
  collection_date: string;
  collection_method: string;
  language: string;
  date_range_start: string | null;
  date_range_end: string | null;
  records_found: number | null;
  records_imported: number;
  relevant_records: number;
  notes: string | null;
  created_at: string;
}

export interface RawRecord {
  id: string;
  batch_id: string;
  platform: string;
  source_url: string | null;
  date_posted: string | null;
  title: string | null;
  raw_text: string;
  thread_context: string | null;
  imported_at: string;
  is_duplicate: boolean;
  duplicate_of: string | null;
  text_hash: string;
  metadata: Record<string, unknown>;
}

export interface RelevanceClassification {
  id: string;
  record_id: string;
  is_relevant: boolean;
  confidence: number;
  classification_basis: string;
  retrieval_target: string | null;
  evidence_of_vague_memory: string | null;
  classified_at: string;
  model_version: string;
  prompt_version: string;
  schema_version: string;
}

export interface RetrievalEpisode {
  id: string;
  record_id: string;
  visual_item_type: VisualItemType | string;
  retrieval_goal: string;
  why_user_needs_item: string | null;
  outcome: RetrievalOutcome | string;
  impact_type: ImpactType | null;
  urgency: string | null;
  frustration_level: FrustrationLevel | null;
  consequence: string | null;
  rationale_summary: string;
  extraction_confidence: number;
  model_version: string;
  prompt_version: string;
  schema_version: string;
  extracted_at: string;
}

export interface RememberedClue {
  id: string;
  episode_id: string;
  clue_category: ClueCategory | string;
  clue_description: string;
  evidence_quote: string;
  source_record_id: string;
  char_start: number | null;
  char_end: number | null;
  span_status: SpanStatus;
  evidence_type: EvidenceType;
  confidence: number;
}

export interface ForgottenAttribute {
  id: string;
  episode_id: string;
  attribute_category: ForgottenAttributeCategory | string;
  description: string;
  evidence_quote: string;
  source_record_id: string;
  char_start: number | null;
  char_end: number | null;
  span_status: SpanStatus;
  evidence_type: EvidenceType;
  confidence: number;
}

export interface SearchBehavior {
  id: string;
  episode_id: string;
  behavior_type: SearchBehaviorType | string;
  description: string;
  sequence_order: number | null;
  evidence_quote: string;
  source_record_id: string;
  char_start: number | null;
  char_end: number | null;
  span_status: SpanStatus;
}

export interface FailureMode {
  id: string;
  episode_id: string;
  failure_type: FailureType | string;
  failure_priority: FailurePriority | string;
  description: string;
  evidence_quote: string;
  source_record_id: string;
  char_start: number | null;
  char_end: number | null;
  span_status: SpanStatus;
  rationale_summary: string;
  confidence: number;
}

export interface Workaround {
  id: string;
  episode_id: string;
  workaround_type: WorkaroundType | string;
  description: string;
  evidence_quote: string;
  source_record_id: string;
  char_start: number | null;
  char_end: number | null;
  span_status: SpanStatus;
  led_to_success: boolean | null;
}

export interface Opportunity {
  id: string;
  title: string;
  retrieval_scenario: string;
  target_type: string | null;
  remembered_info_summary: string;
  forgotten_info_summary: string;
  failure_stage: string;
  observed_behavior: string;
  current_workaround: string | null;
  typical_outcome: string;
  // Measurable Dimensions
  supporting_episode_count: number;
  total_relevant_episodes: number;
  dataset_percentage: number;
  source_diversity: number;
  failure_rate: number | null;
  failure_rate_denominator: number | null;
  abandonment_rate: number | null;
  abandonment_rate_denominator: number | null;
  multi_attempt_rate: number | null;
  multi_attempt_denominator: number | null;
  workaround_rate: number | null;
  manual_scroll_rate: number | null;
  unknown_outcome_count: number | null;
  evidence_strength: EvidenceStrength;
  // Qualitative Fields
  observed_consequence: string | null;
  root_cause_hypothesis: string;
  alternative_explanations: string | null;
  potential_ai_leverage: string | null;
  uncertainty: string | null;
  generated_at: string;
  model_version: string;
  prompt_version: string;
  schema_version: string;
}

export interface OpportunityEvidence {
  id: string;
  opportunity_id: string;
  episode_id: string;
  relevance_note: string | null;
}

export interface RepresentativeSnippet {
  quote: string;
  record_id: string;
  source_url: string | null;
  platform: string;
}

export interface Insight {
  id: string;
  insight_statement: string;
  insight_type: InsightType;
  supporting_episode_count: number;
  dataset_percentage: number | null;
  source_diversity: number;
  representative_snippets: RepresentativeSnippet[];
  contradictory_evidence: string | null;
  evidence_strength: EvidenceStrength;
  research_limitation: string | null;
  generated_at: string;
  model_version: string;
  prompt_version: string;
}

export interface EpisodeEmbedding {
  id: string;
  episode_id: string;
  embedding_text: string;
  embedding: number[];
  model_version: string;
  created_at: string;
}

export interface GoldRecord {
  id: string;
  record_id: string;
  is_relevant: boolean;
  dataset_split: DatasetSplit;
  expected_episode_count: number;
  labeller_notes: string | null;
  labelled_at: string;
}

export interface GoldEpisodeLabel {
  id: string;
  gold_record_id: string;
  episode_index: number;
  episode_description: string;
  visual_item_type: VisualItemType | string;
  remembered_clues: any;
  forgotten_attributes: any;
  primary_failure_mode: FailureType | string | null;
  outcome: RetrievalOutcome | string | null;
  notes: string | null;
}


export interface GoldEpisodeMatch {
  id: string;
  validation_run_id: string;
  gold_episode_id: string;
  ai_episode_id: string | null;
  match_method: MatchMethod;
  match_confidence: MatchConfidence | null;
}

export interface ValidationRun {
  id: string;
  run_date: string;
  gold_record_count: number;
  gold_episode_count: number;
  relevance_precision: number;
  relevance_recall: number;
  relevance_f1: number;
  episode_count_agreement: number | null;
  clue_extraction_agreement: number | null;
  failure_mode_agreement: number | null;
  outcome_agreement: number | null;
  model_version: string;
  prompt_version: string;
  schema_version: string;
  details: Record<string, unknown>;
  notes: string | null;
}

export interface QualityFlag {
  id: string;
  target_type: "record" | "episode" | "insight" | "opportunity";
  target_id: string;
  flag_type: QualityFlagType | string;
  description: string;
  resolved: boolean;
  created_at: string;
}

export interface AiUsageLog {
  id: string;
  operation: "classify" | "extract" | "embed" | "query_engine" | "synthesis";
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_estimate: number | null;
  duration_ms: number | null;
  record_id: string | null;
  created_at: string;
}
