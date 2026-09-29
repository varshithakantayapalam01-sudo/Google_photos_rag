/**
 * Domain enums and union types for the Google Photos AI-Powered Discovery Engine
 */

export type VisualItemType =
  | "photo"
  | "screenshot"
  | "receipt"
  | "document"
  | "video"
  | "meme"
  | "ticket"
  | "chat_image"
  | "artwork"
  | "other";

export type ClueCategory =
  | "visual_feature"
  | "color"
  | "setting"
  | "temporal_approx"
  | "people_present"
  | "activity"
  | "associated_event"
  | "emotional_state"
  | "device_used"
  | "co_occurring_media"
  | "location_coarse"
  | "location_fine"
  | "text_on_image"
  | "composition"
  | "lighting"
  | "season_weather";

export type ForgottenAttributeCategory =
  | "exact_date"
  | "exact_location"
  | "album_name"
  | "file_name"
  | "device_source"
  | "associated_person_name"
  | "text_content"
  | "account_source"
  | "sync_status";

export type SearchBehaviorType =
  | "initial_query"
  | "subsequent_query"
  | "filter"
  | "browse"
  | "scroll"
  | "strategy_change";

export type FailureType =
  | "expression"
  | "interpretation"
  | "candidate_retrieval"
  | "recognition"
  | "refinement"
  | "other";

export type FailurePriority = "earliest" | "primary" | "secondary";

export type WorkaroundType =
  | "manual_scroll"
  | "browse_by_date"
  | "browse_by_person"
  | "browse_by_location"
  | "check_albums"
  | "search_other_app"
  | "check_messages"
  | "ask_person"
  | "search_cloud_folders"
  | "google_search"
  | "give_up"
  | "other";

export type RetrievalOutcome =
  | "success"
  | "partial_success"
  | "failure"
  | "abandoned"
  | "unknown";

export type FrustrationLevel = "low" | "moderate" | "high" | "extreme";

export type ImpactType = "functional" | "emotional";

export type EvidenceType = "observed" | "interpreted" | "hypothesized";

export type SpanStatus = "matched" | "ambiguous" | "not_found" | "pending";

export type EvidenceStrength = "strong" | "moderate" | "weak" | "insufficient";

export type QuestionType = "quantitative" | "qualitative" | "mixed";

export type DatasetSplit = "development" | "holdout";

export type MatchMethod = "automatic" | "manual";

export type MatchConfidence = "high" | "medium" | "low";

export type InsightType =
  | "what_we_know"
  | "what_we_think"
  | "what_to_validate";

export type QualityFlagType =
  | "duplicate"
  | "unsupported_claim"
  | "small_sample"
  | "irrelevant_included"
  | "sentiment_as_severity"
  | "frequency_as_importance"
  | "hypothesis_as_fact"
  | "source_overrepresentation"
  | "broken_url"
  | "overlapping_category"
  | "premature_solution_bias";
