-- 004_relevance_classifications.sql
-- Stage 2: AI relevance classifications with grounded rationale and versioning

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

-- Enable RLS
ALTER TABLE relevance_classifications ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for relevance_classifications"
    ON relevance_classifications FOR SELECT
    TO anon, authenticated
    USING (true);

-- Admin write access (service role)
CREATE POLICY "Admin full access for relevance_classifications"
    ON relevance_classifications FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
