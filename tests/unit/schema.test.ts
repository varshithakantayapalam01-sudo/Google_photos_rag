import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Phase 1 — Database Schema & Migrations", () => {
  const migrationsDir = path.resolve(__dirname, "../../supabase/migrations");
  const combinedSchemaFile = path.resolve(__dirname, "../../supabase/schema.sql");

  const expectedMigrations = [
    "001_extensions.sql",
    "002_collection_batches.sql",
    "003_raw_records.sql",
    "004_relevance_classifications.sql",
    "005_retrieval_episodes.sql",
    "006_episode_children.sql",
    "007_opportunities.sql",
    "008_embeddings.sql",
    "009_gold_dataset.sql",
    "010_quality_usage_indexes.sql",
  ];

  it("should have all 10 SQL migration files present and non-empty", () => {
    expectedMigrations.forEach((filename) => {
      const filePath = path.join(migrationsDir, filename);
      expect(fs.existsSync(filePath), `Missing migration: ${filename}`).toBe(true);
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content.trim().length).toBeGreaterThan(20);
    });
  });

  it("should have combined schema.sql file matching migration structure", () => {
    expect(fs.existsSync(combinedSchemaFile)).toBe(true);
    const content = fs.readFileSync(combinedSchemaFile, "utf-8");
    expect(content).toContain("CREATE TABLE IF NOT EXISTS collection_batches");
    expect(content).toContain("CREATE TABLE IF NOT EXISTS raw_records");
    expect(content).toContain("CREATE TABLE IF NOT EXISTS retrieval_episodes");
    expect(content).toContain("CREATE TABLE IF NOT EXISTS opportunities");
    expect(content).toContain("CREATE TABLE IF NOT EXISTS gold_records");
  });

  describe("Provenance & Privacy Verification (Layer 1)", () => {
    it("should include collection provenance columns in 002_collection_batches.sql", () => {
      const sql = fs.readFileSync(path.join(migrationsDir, "002_collection_batches.sql"), "utf-8");
      expect(sql).toContain("platform TEXT NOT NULL");
      expect(sql).toContain("search_query TEXT");
      expect(sql).toContain("collection_method TEXT NOT NULL");
      expect(sql).toContain("records_imported INTEGER NOT NULL DEFAULT 0");
      expect(sql).toContain("relevant_records INTEGER NOT NULL DEFAULT 0");
    });

    it("should NOT include author or username column in raw_records table definition (PII minimization)", () => {
      const sql = fs.readFileSync(path.join(migrationsDir, "003_raw_records.sql"), "utf-8");
      
      // Extract the CREATE TABLE statement block
      const tableMatch = sql.match(/CREATE TABLE IF NOT EXISTS raw_records \(([\s\S]*?)\);/);
      expect(tableMatch).toBeTruthy();
      const tableBody = tableMatch![1];

      expect(tableBody).not.toMatch(/^\s*author\s+/im);
      expect(tableBody).not.toMatch(/^\s*username\s+/im);
      expect(tableBody).not.toMatch(/^\s*user_id\s+/im);
      expect(tableBody).toContain("batch_id UUID NOT NULL REFERENCES collection_batches(id)");
      expect(tableBody).toContain("text_hash TEXT NOT NULL");
      expect(tableBody).toContain("is_duplicate BOOLEAN NOT NULL DEFAULT false");
    });
  });

  describe("Evidence Span & Child Tables Verification (Layer 2)", () => {
    it("should define span_status and nullable char offsets in child tables", () => {
      const sql = fs.readFileSync(path.join(migrationsDir, "006_episode_children.sql"), "utf-8");
      
      const tables = [
        "remembered_clues",
        "forgotten_attributes",
        "search_behaviors",
        "failure_modes",
        "workarounds",
      ];

      tables.forEach((table) => {
        expect(sql).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
        expect(sql).toContain("char_start INTEGER");
        expect(sql).toContain("char_end INTEGER");
        expect(sql).toContain("evidence_quote TEXT NOT NULL");
      });

      // Verify span_status constraint
      expect(sql).toContain("span_status TEXT NOT NULL DEFAULT 'pending'");
      expect(sql).toContain("CHECK (span_status IN ('matched', 'ambiguous', 'not_found', 'pending'))");
    });
  });

  describe("Opportunities & Denominator Transparency (Layer 3)", () => {
    it("should include all 9 measurable dimensions and denominator columns in opportunities", () => {
      const sql = fs.readFileSync(path.join(migrationsDir, "007_opportunities.sql"), "utf-8");
      expect(sql).toContain("supporting_episode_count INTEGER NOT NULL");
      expect(sql).toContain("total_relevant_episodes INTEGER NOT NULL");
      expect(sql).toContain("dataset_percentage DECIMAL(5,2) NOT NULL");
      expect(sql).toContain("source_diversity INTEGER NOT NULL");
      expect(sql).toContain("failure_rate DECIMAL(5,2)");
      expect(sql).toContain("failure_rate_denominator INTEGER");
      expect(sql).toContain("abandonment_rate DECIMAL(5,2)");
      expect(sql).toContain("abandonment_rate_denominator INTEGER");
      expect(sql).toContain("multi_attempt_rate DECIMAL(5,2)");
      expect(sql).toContain("multi_attempt_denominator INTEGER");
      expect(sql).toContain("workaround_rate DECIMAL(5,2)");
      expect(sql).toContain("manual_scroll_rate DECIMAL(5,2)");
      expect(sql).toContain("unknown_outcome_count INTEGER");
      expect(sql).toContain("evidence_strength TEXT NOT NULL");
    });

    it("should use evidence_strength in insights table (not confidence)", () => {
      const sql = fs.readFileSync(path.join(migrationsDir, "007_opportunities.sql"), "utf-8");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS insights");
      expect(sql).toContain("evidence_strength TEXT NOT NULL CHECK (evidence_strength IN ('strong', 'moderate', 'weak', 'insufficient'))");
    });
  });

  describe("Gold Dataset Multi-Episode & Split Verification", () => {
    it("should include dataset_split with development and holdout options", () => {
      const sql = fs.readFileSync(path.join(migrationsDir, "009_gold_dataset.sql"), "utf-8");
      expect(sql).toContain("dataset_split TEXT NOT NULL DEFAULT 'development'");
      expect(sql).toContain("CHECK (dataset_split IN ('development', 'holdout'))");
      expect(sql).toContain("expected_episode_count INTEGER NOT NULL DEFAULT 1");
    });

    it("should define separate gold_episode_labels and gold_episode_matches tables", () => {
      const sql = fs.readFileSync(path.join(migrationsDir, "009_gold_dataset.sql"), "utf-8");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS gold_episode_labels");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS gold_episode_matches");
      expect(sql).toContain("CREATE TABLE IF NOT EXISTS validation_runs");
    });
  });

  describe("Extensions & Vector Search", () => {
    it("should define 768-dimensional pgvector column with IVFFlat index", () => {
      const sql = fs.readFileSync(path.join(migrationsDir, "008_embeddings.sql"), "utf-8");
      expect(sql).toContain("embedding VECTOR(768) NOT NULL");
      expect(sql).toContain("USING ivfflat (embedding vector_cosine_ops)");
    });
  });

  describe("Row Level Security (RLS)", () => {
    it("should enable RLS on all tables with public read and admin write policies", () => {
      const sql = fs.readFileSync(combinedSchemaFile, "utf-8");
      const tables = [
        "collection_batches",
        "raw_records",
        "relevance_classifications",
        "retrieval_episodes",
        "remembered_clues",
        "forgotten_attributes",
        "search_behaviors",
        "failure_modes",
        "workarounds",
        "opportunities",
        "opportunity_evidence",
        "insights",
        "episode_embeddings",
        "gold_records",
        "gold_episode_labels",
        "validation_runs",
        "gold_episode_matches",
        "quality_flags",
        "ai_usage_log",
      ];

      tables.forEach((table) => {
        expect(sql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
      });
    });
  });
});
