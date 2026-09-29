-- 003_raw_records.sql
-- Layer 1: Raw source data preserved verbatim without author usernames

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

-- Enable RLS
ALTER TABLE raw_records ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for raw_records"
    ON raw_records FOR SELECT
    TO anon, authenticated
    USING (true);

-- Admin write access (service role)
CREATE POLICY "Admin full access for raw_records"
    ON raw_records FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
