-- 009_gold_dataset.sql
-- Gold dataset multi-episode benchmarking and validation schema
-- Supports Development (calibration/tuning) and Holdout (unseen validation) splits

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

-- Enable RLS
ALTER TABLE gold_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_episode_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gold_episode_matches ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for gold_records" ON gold_records FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access for gold_episode_labels" ON gold_episode_labels FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access for validation_runs" ON validation_runs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access for gold_episode_matches" ON gold_episode_matches FOR SELECT TO anon, authenticated USING (true);

-- Admin write access
CREATE POLICY "Admin full access for gold_records" ON gold_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access for gold_episode_labels" ON gold_episode_labels FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access for validation_runs" ON validation_runs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access for gold_episode_matches" ON gold_episode_matches FOR ALL TO service_role USING (true) WITH CHECK (true);
