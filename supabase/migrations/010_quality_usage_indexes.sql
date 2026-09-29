-- 010_quality_usage_indexes.sql
-- Quality flags, AI usage logs, and performance indexes

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

-- Enable RLS
ALTER TABLE quality_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for quality_flags" ON quality_flags FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access for ai_usage_log" ON ai_usage_log FOR SELECT TO anon, authenticated USING (true);

-- Admin write access
CREATE POLICY "Admin full access for quality_flags" ON quality_flags FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access for ai_usage_log" ON ai_usage_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =========================================================================
-- Performance Indexes (Architecture Section 17.3)
-- =========================================================================

-- Ingestion & Raw Records
CREATE INDEX IF NOT EXISTS idx_raw_records_batch_id ON raw_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_raw_records_platform ON raw_records(platform);
CREATE INDEX IF NOT EXISTS idx_raw_records_text_hash ON raw_records(text_hash);
CREATE INDEX IF NOT EXISTS idx_raw_records_is_duplicate ON raw_records(is_duplicate);
CREATE INDEX IF NOT EXISTS idx_raw_records_trgm ON raw_records USING gin (raw_text gin_trgm_ops);

-- Relevance Classification
CREATE INDEX IF NOT EXISTS idx_relevance_record_id ON relevance_classifications(record_id);
CREATE INDEX IF NOT EXISTS idx_relevance_is_relevant ON relevance_classifications(is_relevant);

-- Retrieval Episodes & Child Entities
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

-- Opportunities & Evidence
CREATE INDEX IF NOT EXISTS idx_opportunity_evidence_opp ON opportunity_evidence(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_evidence_ep ON opportunity_evidence(episode_id);

-- Gold Dataset & Validation
CREATE INDEX IF NOT EXISTS idx_gold_records_record_id ON gold_records(record_id);
CREATE INDEX IF NOT EXISTS idx_gold_records_split ON gold_records(dataset_split);
CREATE INDEX IF NOT EXISTS idx_gold_episode_labels_record ON gold_episode_labels(gold_record_id);
CREATE INDEX IF NOT EXISTS idx_gold_episode_matches_run ON gold_episode_matches(validation_run_id);
