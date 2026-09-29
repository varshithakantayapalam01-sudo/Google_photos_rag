-- 006_episode_children.sql
-- Layer 2 Child Tables: Clues, Forgotten Attributes, Search Behaviors, Failure Modes, and Workarounds
-- All evidence-bearing tables contain evidence_quote, NULLABLE char_start/char_end, and span_status

-- Table: remembered_clues
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

-- Table: forgotten_attributes
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

-- Table: search_behaviors
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

-- Table: failure_modes
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

-- Table: workarounds
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

-- Enable RLS on all child tables
ALTER TABLE remembered_clues ENABLE ROW LEVEL SECURITY;
ALTER TABLE forgotten_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_behaviors ENABLE ROW LEVEL SECURITY;
ALTER TABLE failure_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workarounds ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public read access for remembered_clues" ON remembered_clues FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access for forgotten_attributes" ON forgotten_attributes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access for search_behaviors" ON search_behaviors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access for failure_modes" ON failure_modes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access for workarounds" ON workarounds FOR SELECT TO anon, authenticated USING (true);

-- Admin write policies
CREATE POLICY "Admin full access for remembered_clues" ON remembered_clues FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access for forgotten_attributes" ON forgotten_attributes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access for search_behaviors" ON search_behaviors FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access for failure_modes" ON failure_modes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access for workarounds" ON workarounds FOR ALL TO service_role USING (true) WITH CHECK (true);
