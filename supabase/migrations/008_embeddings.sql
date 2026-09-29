-- 008_embeddings.sql
-- Vector store for semantic episode similarity search using pgvector

CREATE TABLE IF NOT EXISTS episode_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id UUID NOT NULL UNIQUE REFERENCES retrieval_episodes(id) ON DELETE CASCADE,
    embedding_text TEXT NOT NULL,
    embedding VECTOR(768) NOT NULL,
    model_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cosine similarity IVFFlat index
CREATE INDEX IF NOT EXISTS episode_embeddings_cosine_idx 
    ON episode_embeddings USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);

-- Enable RLS
ALTER TABLE episode_embeddings ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access for episode_embeddings"
    ON episode_embeddings FOR SELECT
    TO anon, authenticated
    USING (true);

-- Admin write access
CREATE POLICY "Admin full access for episode_embeddings"
    ON episode_embeddings FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
