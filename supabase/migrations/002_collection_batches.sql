-- 002_collection_batches.sql
-- Collection provenance layer for transparent sampling methodology

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

-- Enable RLS
ALTER TABLE collection_batches ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for collection_batches"
    ON collection_batches FOR SELECT
    TO anon, authenticated
    USING (true);

-- Admin write access (service role)
CREATE POLICY "Admin full access for collection_batches"
    ON collection_batches FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
