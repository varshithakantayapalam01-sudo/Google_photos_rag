/**
 * API Request and Response payload types
 */

import {
  CollectionBatch,
  RawRecord,
  RetrievalEpisode,
  RememberedClue,
  ForgottenAttribute,
  SearchBehavior,
  FailureMode,
  Workaround,
  Opportunity,
  Insight,
  ValidationRun,
} from "./database";
import { QuestionType, EvidenceStrength } from "./domain";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Ingestion API
export interface ImportRecordsRequest {
  batch_id?: string;
  provenance: {
    platform: string;
    search_query?: string;
    collection_date: string;
    collection_method: string;
    language?: string;
    date_range_start?: string;
    date_range_end?: string;
    notes?: string;
  };
  records: Array<{
    platform: string;
    raw_text: string;
    source_url?: string;
    date_posted?: string;
    title?: string;
    thread_context?: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface ImportRecordsResponse {
  batch_id: string;
  records_imported: number;
  duplicates_flagged: number;
  near_duplicates_flagged: number;
}

// Episode Detail API
export interface EpisodeDetailResponse {
  episode: RetrievalEpisode;
  remembered_clues: RememberedClue[];
  forgotten_attributes: ForgottenAttribute[];
  search_behaviors: SearchBehavior[];
  failure_modes: FailureMode[];
  workarounds: Workaround[];
  raw_record: {
    id: string;
    raw_text: string;
    platform: string;
    source_url: string | null;
    date_posted: string | null;
    title: string | null;
  };
}

// Overview Analytics API
export interface OverviewStatsResponse {
  total_records_imported: number;
  total_relevant_episodes: number;
  total_excluded_records: number;
  platform_distribution: Array<{ platform: string; count: number; percentage: number }>;
  item_type_distribution: Array<{ item_type: string; count: number; percentage: number }>;
  outcome_distribution: Array<{ outcome: string; count: number; percentage: number }>;
  latest_validation?: {
    run_date: string;
    holdout_f1: number;
    holdout_precision: number;
    holdout_recall: number;
    episode_count_agreement: number | null;
  };
  collection_batches: CollectionBatch[];
}

// Memory & Behaviour Analytics API
export interface MemoryAnalyticsResponse {
  clue_frequencies: Array<{ category: string; count: number; percentage: number }>;
  forgotten_frequencies: Array<{ category: string; count: number; percentage: number }>;
  clue_forgotten_cooccurrence: Array<{ clue: string; forgotten: string; count: number }>;
  workaround_distribution: Array<{ workaround_type: string; count: number; percentage: number }>;
}

// Failure Analytics API
export interface FailureAnalyticsResponse {
  failure_distribution: Array<{ failure_type: string; count: number; percentage: number }>;
  failure_by_item_type: Array<{ item_type: string; failure_type: string; count: number }>;
  clue_failure_flow: Array<{ clue_category: string; failure_type: string; outcome: string; count: number }>;
}

// Ask the Research Hybrid Query API
export interface AskQueryRequest {
  query: string;
}

export interface GroundedEvidenceSnippet {
  episode_id: string;
  quote: string;
  char_start: number | null;
  char_end: number | null;
  platform: string;
  source_url: string | null;
  visual_item_type: string;
  outcome: string;
  evidence_type: string;
}

export interface EvidenceStrengthFactors {
  supporting_episodes_count: number;
  independent_platforms_count: number;
  observed_evidence_percentage: number;
  has_contradictory_evidence: boolean;
  unknown_outcome_percentage: number;
  pipeline_validation_f1: number;
}

export interface AskQueryResponse {
  question: string;
  question_type: QuestionType;
  answer_markdown: string;
  quantitative_summary?: {
    metric_name: string;
    value: number | string;
    numerator?: number;
    denominator?: number;
    table_data?: Array<Record<string, unknown>>;
  };
  supporting_evidence: GroundedEvidenceSnippet[];
  evidence_strength: EvidenceStrength;
  evidence_strength_factors: EvidenceStrengthFactors;
  contradictory_findings?: string[];
  limitations_note?: string;
}

// Research Synthesis API
export interface ResearchSynthesisResponse {
  what_we_know: Insight[];
  what_we_think: Insight[];
  what_to_validate: Array<{
    id: string;
    question: string;
    why_it_matters: string;
    suggested_interview_approach: string;
    related_insights: string[];
  }>;
}
