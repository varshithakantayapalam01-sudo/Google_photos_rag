-- 007_opportunities.sql
-- Layer 3: Opportunities, Opportunity Evidence, and Research Insights
-- Explicitly documents all measurable opportunity metrics and their denominator columns

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
    
    -- Measurable Dimensions (SQL Computed)
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
    
    -- Qualitative Fields (LLM Synthesized)
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

-- Table: opportunity_evidence
CREATE TABLE IF NOT EXISTS opportunity_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    episode_id UUID NOT NULL REFERENCES retrieval_episodes(id) ON DELETE CASCADE,
    relevance_note TEXT
);

-- Table: insights
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

-- Enable RLS
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for opportunities" ON opportunities FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access for opportunity_evidence" ON opportunity_evidence FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access for insights" ON insights FOR SELECT TO anon, authenticated USING (true);

-- Admin write access
CREATE POLICY "Admin full access for opportunities" ON opportunities FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access for opportunity_evidence" ON opportunity_evidence FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admin full access for insights" ON insights FOR ALL TO service_role USING (true) WITH CHECK (true);
