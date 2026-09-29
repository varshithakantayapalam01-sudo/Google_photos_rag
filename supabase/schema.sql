-- Combined Schema for Google Photos Discovery Engine (v2.1 FINAL)
-- Includes all extensions, tables, constraints, RLS policies, and indexes

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Collection Batches
CREATE TABLE IF NOT EXISTS collection_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL,
    search_query TEXT,
    collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
    collection_method TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    date_range_start DATE,
    date_range_end DATE,
    records_found INTEGER,
    records_imported INTEGER NOT NULL DEFAULT 0,
    relevant_records INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Raw Records (No author usernames stored)
CREATE TABLE IF NOT EXISTS raw_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES collection_batches(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    source_url TEXT,
    date_posted TIMESTAMPTZ,
    title TEXT,
    raw_text TEXT NOT NULL,
    thread_context TEXT,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_duplicate BOOLEAN NOT NULL DEFAULT false,
    duplicate_of UUID REFERENCES raw_records(id) ON DELETE SET NULL,
    text_hash TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 4. Relevance Classifications
CREATE TABLE IF NOT EXISTS relevance_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL UNIQUE REFERENCES raw_records(id) ON DELETE CASCADE,
    is_relevant BOOLEAN NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
    classification_basis TEXT NOT NULL,
    retrieval_target TEXT,
    evidence_of_vague_memory TEXT,
    classified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    model_version TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    schema_version TEXT NOT NULL
);

-- 5. Retrieval Episodes (Supports multiple episodes per raw record)
CREATE TABLE IF NOT EXISTS retrieval_episodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES raw_records(id) ON DELETE CASCADE,
    visual_item_type TEXT NOT NULL,
    retrieval_goal TEXT NOT NULL,
    why_user_needs_item TEXT,
    outcome TEXT NOT NULL,
    impact_type TEXT,
    urgency TEXT,
    frustration_level TEXT,
    consequence TEXT,
    rationale_summary TEXT NOT NULL,
    extraction_confidence DECIMAL(3,2) NOT NULL CHECK (extraction_confidence >= 0.0 AND extraction_confidence <= 1.0),
    model_version TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    extracted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Child Tables with deterministic spans & span_status
CREATE TABLE IF NOT EXISTS remembered_clues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES retrieval_episodes(id) ON DELETE CASCADE,
    clue_category TEXT NOT NULL,
    clue_description TEXT NOT NULL,
    evidence_quote TEXT NOT NULL,
    source_record_id UUID NOT NULL REFERENCES raw_records(id) ON DELETE CASCADE,
    char_start INTEGER,
    char_end INTEGER,
    span_status TEXT NOT NULL DEFAULT 'pending' CHECK (span_status IN ('matched', 'ambiguous', 'not_found', 'pending')),
    evidence_type TEXT NOT NULL CHECK (evidence_type IN ('observed', 'interpreted', 'hypothesized')),
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0)
);

CREATE TABLE IF NOT EXISTS forgotten_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES retrieval_episodes(id) ON DELETE CASCADE,
    attribute_category TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence_quote TEXT NOT NULL,
    source_record_id UUID NOT NULL REFERENCES raw_records(id) ON DELETE CASCADE,
    char_start INTEGER,
    char_end INTEGER,
    span_status TEXT NOT NULL DEFAULT 'pending' CHECK (span_status IN ('matched', 'ambiguous', 'not_found', 'pending')),
    evidence_type TEXT NOT NULL CHECK (evidence_type IN ('observed', 'interpreted', 'hypothesized')),
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0)
);

CREATE TABLE IF NOT EXISTS search_behaviors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES retrieval_episodes(id) ON DELETE CASCADE,
    behavior_type TEXT NOT NULL,
    description TEXT NOT NULL,
    sequence_order INTEGER,
    evidence_quote TEXT NOT NULL,
    source_record_id UUID NOT NULL REFERENCES raw_records(id) ON DELETE CASCADE,
    char_start INTEGER,
    char_end INTEGER,
    span_status TEXT NOT NULL DEFAULT 'pending' CHECK (span_status IN ('matched', 'ambiguous', 'not_found', 'pending'))
);

CREATE TABLE IF NOT EXISTS failure_modes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES retrieval_episodes(id) ON DELETE CASCADE,
    failure_type TEXT NOT NULL,
    failure_priority TEXT NOT NULL CHECK (failure_priority IN ('earliest', 'primary', 'secondary')),
    description TEXT NOT NULL,
    evidence_quote TEXT NOT NULL,
    source_record_id UUID NOT NULL REFERENCES raw_records(id) ON DELETE CASCADE,
    char_start INTEGER,
    char_end INTEGER,
    span_status TEXT NOT NULL DEFAULT 'pending' CHECK (span_status IN ('matched', 'ambiguous', 'not_found', 'pending')),
    rationale_summary TEXT NOT NULL,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0)
);

CREATE TABLE IF NOT EXISTS workarounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL REFERENCES retrieval_episodes(id) ON DELETE CASCADE,
    workaround_type TEXT NOT NULL,
    description TEXT NOT NULL,
    evidence_quote TEXT NOT NULL,
    source_record_id UUID NOT NULL REFERENCES raw_records(id) ON DELETE CASCADE,
    char_start INTEGER,
    char_end INTEGER,
    span_status TEXT NOT NULL DEFAULT 'pending' CHECK (span_status IN ('matched', 'ambiguous', 'not_found', 'pending')),
    led_to_success BOOLEAN
);

-- 7. Opportunities & Insights (With measurable dimensions + denominator columns)
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    retrieval_scenario TEXT NOT NULL,
    target_type TEXT,
    remembered_info_summary TEXT NOT NULL,
    forgotten_info_summary TEXT NOT NULL,
    failure_stage TEXT NOT NULL,
    observed_behavior TEXT NOT NULL,
    current_workaround TEXT,
    typical_outcome TEXT NOT NULL,
    
    -- Measurable Dimensions
    supporting_episode_count INTEGER NOT NULL,
    total_relevant_episodes INTEGER NOT NULL,
    dataset_percentage DECIMAL(5,2) NOT NULL,
    source_diversity INTEGER NOT NULL,
    failure_rate DECIMAL(5,2),
    failure_rate_denominator INTEGER,
    abandonment_rate DECIMAL(5,2),
    abandonment_rate_denominator INTEGER,
    multi_attempt_rate DECIMAL(5,2),
    multi_attempt_denominator INTEGER,
    workaround_rate DECIMAL(5,2),
    manual_scroll_rate DECIMAL(5,2),
    unknown_outcome_count INTEGER,
    evidence_strength TEXT NOT NULL CHECK (evidence_strength IN ('strong', 'moderate', 'weak', 'insufficient')),
    
    -- Qualitative Fields
    observed_consequence TEXT,
    root_cause_hypothesis TEXT NOT NULL,
    alternative_explanations TEXT,
    potential_ai_leverage TEXT,
    uncertainty TEXT,
    
    -- Metadata
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    model_version TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    schema_version TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS opportunity_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    episode_id UUID NOT NULL REFERENCES retrieval_episodes(id) ON DELETE CASCADE,
    relevance_note TEXT
);

CREATE TABLE IF NOT EXISTS insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_statement TEXT NOT NULL,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('what_we_know', 'what_we_think', 'what_to_validate')),
    supporting_episode_count INTEGER NOT NULL,
    dataset_percentage DECIMAL(5,2),
    source_diversity INTEGER NOT NULL,
    representative_snippets JSONB NOT NULL DEFAULT '[]'::jsonb,
    contradictory_evidence TEXT,
    evidence_strength TEXT NOT NULL CHECK (evidence_strength IN ('strong', 'moderate', 'weak', 'insufficient')),
    research_limitation TEXT,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    model_version TEXT NOT NULL,
    prompt_version TEXT NOT NULL
);

-- 8. Embeddings
CREATE TABLE IF NOT EXISTS episode_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL UNIQUE REFERENCES retrieval_episodes(id) ON DELETE CASCADE,
    embedding_text TEXT NOT NULL,
    embedding VECTOR(768) NOT NULL,
    model_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Gold Dataset Validation (Development vs Holdout splits)
CREATE TABLE IF NOT EXISTS gold_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL UNIQUE REFERENCES raw_records(id) ON DELETE CASCADE,
    is_relevant BOOLEAN NOT NULL,
    dataset_split TEXT NOT NULL DEFAULT 'development' CHECK (dataset_split IN ('development', 'holdout')),
    expected_episode_count INTEGER NOT NULL DEFAULT 1,
    labeller_notes TEXT,
    labelled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gold_episode_labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gold_record_id UUID NOT NULL REFERENCES gold_records(id) ON DELETE CASCADE,
    episode_index INTEGER NOT NULL,
    episode_description TEXT NOT NULL,
    visual_item_type TEXT NOT NULL,
    remembered_clues JSONB NOT NULL DEFAULT '[]'::jsonb,
    forgotten_attributes JSONB NOT NULL DEFAULT '[]'::jsonb,
    primary_failure_mode TEXT,
    outcome TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS validation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    gold_record_count INTEGER NOT NULL,
    gold_episode_count INTEGER NOT NULL,
    relevance_precision DECIMAL(5,4) NOT NULL,
    relevance_recall DECIMAL(5,4) NOT NULL,
    relevance_f1 DECIMAL(5,4) NOT NULL,
    episode_count_agreement DECIMAL(5,4),
    clue_extraction_agreement DECIMAL(5,4),
    failure_mode_agreement DECIMAL(5,4),
    outcome_agreement DECIMAL(5,4),
    model_version TEXT NOT NULL,
    prompt_version TEXT NOT NULL,
    schema_version TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS gold_episode_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validation_run_id UUID NOT NULL REFERENCES validation_runs(id) ON DELETE CASCADE,
    gold_episode_id UUID NOT NULL REFERENCES gold_episode_labels(id) ON DELETE CASCADE,
    ai_episode_id UUID REFERENCES retrieval_episodes(id) ON DELETE SET NULL,
    match_method TEXT NOT NULL CHECK (match_method IN ('automatic', 'manual')),
    match_confidence TEXT CHECK (match_confidence IN ('high', 'medium', 'low'))
);

-- 10. Quality Flags & Usage Logs
CREATE TABLE IF NOT EXISTS quality_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL CHECK (target_type IN ('record', 'episode', 'insight', 'opportunity')),
    target_id UUID NOT NULL,
    flag_type TEXT NOT NULL,
    description TEXT NOT NULL,
    resolved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operation TEXT NOT NULL CHECK (operation IN ('classify', 'extract', 'embed', 'query_engine', 'synthesis')),
    model TEXT NOT NULL,
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost_estimate DECIMAL(10,6),
    duration_ms INTEGER,
    record_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- Enable Row Level Security (RLS) & Policies
-- =========================================================================

ALTER TABLE collection_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE relevance_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE retrieval_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE remembered_clues ENABLE ROW LEVEL SECURITY;
ALTER TABLE forgotten_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE failure_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workarounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE episode_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_episode_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_episode_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read batches" ON collection_batches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read records" ON raw_records FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read classifications" ON relevance_classifications FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read episodes" ON retrieval_episodes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read clues" ON remembered_clues FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read forgotten" ON forgotten_attributes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read behaviors" ON search_behaviors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read failures" ON failure_modes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read workarounds" ON workarounds FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read opportunities" ON opportunities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read opp_evidence" ON opportunity_evidence FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read insights" ON insights FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read embeddings" ON episode_embeddings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read gold_records" ON gold_records FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read gold_episodes" ON gold_episode_labels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read validation" ON validation_runs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read gold_matches" ON gold_episode_matches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read quality_flags" ON quality_flags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read ai_usage" ON ai_usage_log FOR SELECT TO anon, authenticated USING (true);

-- Admin write access
CREATE POLICY "Admin write batches" ON collection_batches FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write records" ON raw_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write classifications" ON relevance_classifications FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write episodes" ON retrieval_episodes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write clues" ON remembered_clues FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write forgotten" ON forgotten_attributes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write behaviors" ON search_behaviors FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write failures" ON failure_modes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write workarounds" ON workarounds FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write opportunities" ON opportunities FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write opp_evidence" ON opportunity_evidence FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write insights" ON insights FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write embeddings" ON episode_embeddings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write gold_records" ON gold_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write gold_episodes" ON gold_episode_labels FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write validation" ON validation_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write gold_matches" ON gold_episode_matches FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write quality_flags" ON quality_flags FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin write ai_usage" ON ai_usage_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =========================================================================
-- Performance & Deduplication Indexes
-- =========================================================================

CREATE INDEX IF NOT EXISTS idx_raw_records_batch_id ON raw_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_raw_records_platform ON raw_records(platform);
CREATE INDEX IF NOT EXISTS idx_raw_records_text_hash ON raw_records(text_hash);
CREATE INDEX IF NOT EXISTS idx_raw_records_is_duplicate ON raw_records(is_duplicate);
CREATE INDEX IF NOT EXISTS idx_raw_records_trgm ON raw_records USING gin (raw_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_relevance_record_id ON relevance_classifications(record_id);
CREATE INDEX IF NOT EXISTS idx_relevance_is_relevant ON relevance_classifications(is_relevant);

CREATE INDEX IF NOT EXISTS idx_retrieval_episodes_record_id ON retrieval_episodes(record_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_episodes_visual_type ON retrieval_episodes(visual_item_type);
CREATE INDEX IF NOT EXISTS idx_retrieval_episodes_outcome ON retrieval_episodes(outcome);

CREATE INDEX IF NOT EXISTS idx_remembered_clues_episode ON remembered_clues(episode_id);
CREATE INDEX IF NOT EXISTS idx_remembered_clues_category ON remembered_clues(clue_category);
CREATE INDEX IF NOT EXISTS idx_remembered_clues_status ON remembered_clues(span_status);

CREATE INDEX IF NOT EXISTS idx_forgotten_attributes_episode ON forgotten_attributes(episode_id);
CREATE INDEX IF NOT EXISTS idx_forgotten_attributes_category ON forgotten_attributes(attribute_category);

CREATE INDEX IF NOT EXISTS idx_failure_modes_episode ON failure_modes(episode_id);
CREATE INDEX IF NOT EXISTS idx_failure_modes_type ON failure_modes(failure_type);
CREATE INDEX IF NOT EXISTS idx_failure_modes_priority ON failure_modes(failure_priority);

CREATE INDEX IF NOT EXISTS idx_workarounds_episode ON workarounds(episode_id);
CREATE INDEX IF NOT EXISTS idx_workarounds_type ON workarounds(workaround_type);

CREATE INDEX IF NOT EXISTS idx_search_behaviors_episode ON search_behaviors(episode_id);

CREATE INDEX IF NOT EXISTS idx_opportunity_evidence_opp ON opportunity_evidence(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_evidence_ep ON opportunity_evidence(episode_id);

CREATE INDEX IF NOT EXISTS idx_gold_records_record_id ON gold_records(record_id);
CREATE INDEX IF NOT EXISTS idx_gold_records_split ON gold_records(dataset_split);
CREATE INDEX IF NOT EXISTS idx_gold_episode_labels_record ON gold_episode_labels(gold_record_id);
CREATE INDEX IF NOT EXISTS idx_gold_episode_matches_run ON gold_episode_matches(validation_run_id);

CREATE INDEX IF NOT EXISTS idx_episode_embeddings_cosine 
    ON episode_embeddings USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);
