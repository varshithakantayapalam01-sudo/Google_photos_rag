-- 005_retrieval_episodes.sql
-- Layer 2: Structured retrieval episodes extracted from relevant records

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

-- Enable RLS
ALTER TABLE retrieval_episodes ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for retrieval_episodes"
    ON retrieval_episodes FOR SELECT
    TO anon, authenticated
    USING (true);

-- Admin write access (service role)
CREATE POLICY "Admin full access for retrieval_episodes"
    ON retrieval_episodes FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
