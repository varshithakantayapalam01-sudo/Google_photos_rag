# Implementation Plan — Google Photos AI-Powered Discovery Engine

> **Based on:** [Architecture.md v2.1 (FINAL)](file:///d:/GOOGLE_PHOTOS_RAG/Architecture.md)  
> **Updated:** 2026-09-24  
> **Status:** Approved — Ready for Sequential Execution  

---

## Guiding Principles

1. **Strict Sequential Execution:** Each phase builds directly on the verified state of the preceding phase. Never skip phases or implement downstream views before upstream data and validation exist.
2. **Early Pipeline Validation:** Gold dataset validation occurs immediately after AI extraction (Phase 5) so extraction accuracy is verified before building downstream analytics, opportunities, or RAG.
3. **Continuous Automated Testing:** Every phase includes dedicated automated tests that must pass before that phase is marked complete.
4. **Functionality Over Decorative Polish:** Core research functionality, data accuracy, evidence traceability, and responsive layouts are built first. Decorative visual polish (dark mode, glassmorphism, micro-animations) is deferred to Phase 9.
5. **Clear Phase Checkpoints:** Every phase ends with a verification checklist, automated test run, and an unambiguous Definition of Done.

---

## Phase Summary

| Phase | Phase Name | Focus | Key Deliverable | Automated Tests |
|:---:|---|---|---|---|
| **0** | **Project Scaffold** | Foundation | Next.js App Router, TypeScript types, taxonomy constants, Zod schemas, utilities | Typecheck & config tests |
| **1** | **Database Schema** | Data Layer | 10 Supabase migrations, pgvector, pg_trgm, RLS policies, DB query builders | Schema & migration tests |
| **2** | **Data Ingestion Pipeline** | Stage 1 (Ingest) | CSV/JSON upload, collection batches provenance, deduplication, author stripping | Ingestion, hash & dedup tests |
| **3** | **AI Relevance Classification** | Stage 2 (Classify) | `gemini-3.5-flash-lite` classifier, batching, quality gates, usage logging | Classifier schema & mock tests |
| **4** | **AI Episode Extraction + Deterministic Spans** | Stage 3 (Extract) | `gemini-3.8-flash` extractor (quotes only), application `span-locator.ts`, 768-dim embeddings | Span locator test suite (5 match modes) |
| **5** | **Gold Dataset Validation** | Quality Gate | Development (30–35) & Holdout (15) splits, episode matching, Precision/Recall/F1 | Gold evaluation & matching tests |
| **6** | **Core Analytics + Public Dashboard + Evidence Explorer** | Frontend (Read) | Overview, Memory & Behaviour, Failure Explorer, Evidence Explorer with span highlighting | Metric formula & aggregation tests |
| **7** | **Pattern Discovery + Opportunity Generation** | Stage 4 (Analyze) | SQL pattern queries, opportunity generation with explicit denominators, multi-factor evidence strength | Opportunity & evidence strength tests |
| **8** | **Hybrid Ask-the-Research Query Engine** | Query Engine | Query router (Quant/Qual/Mixed), allowlisted SQL planner, semantic retrieval, grounded answers | Query planner, SQL & citation tests |
| **9** | **Research Synthesis + Limitations + Deployment + Final Polish** | Finalization | Synthesis page, limitations, full E2E test suite, dark mode & polish, Vercel deployment | Integration & E2E regression tests |

---

## Phase 0 — Project Scaffold

### Objective
Initialize the Next.js TypeScript project, install core dependencies, configure environment variables, create shared domain types, taxonomy constants, Zod schemas, and utility scaffolds.

### Entry Criteria
- [Architecture.md](file:///d:/GOOGLE_PHOTOS_RAG/Architecture.md) is finalized.

### Deliverables

#### 0.1 Next.js Application Initialization
- Create Next.js 14+ application with App Router, TypeScript, and Tailwind CSS.
- Configure `tsconfig.json` with strict mode and path alias `@/*`.

#### 0.2 Install Production & Development Dependencies
```bash
# Production dependencies
npm install @supabase/supabase-js @google/genai zod recharts lucide-react

# Development & testing dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom playwright
```

#### 0.3 Environment Configuration
- `.env.example` — Document all environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - `GEMINI_API_KEY`, `GEMINI_MODEL_CLASSIFICATION`, `GEMINI_MODEL_EXTRACTION`, `GEMINI_MODEL_SYNTHESIS`, `GEMINI_MODEL_EMBEDDING`, `GEMINI_EMBEDDING_DIMENSIONS`
  - `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`
- `.env.local` — Local credentials (gitignored).

#### 0.4 Type Definitions
- `types/database.ts` — TypeScript interfaces matching all tables: `RawRecord`, `CollectionBatch`, `RelevanceClassification`, `RetrievalEpisode`, `RememberedClue`, `ForgottenAttribute`, `SearchBehavior`, `FailureMode`, `Workaround`, `Opportunity`, `OpportunityEvidence`, `Insight`, `EpisodeEmbedding`, `GoldRecord` (including `dataset_split: 'development' | 'holdout'`), `GoldEpisodeLabel`, `GoldEpisodeMatch`, `ValidationRun`, `QualityFlag`, `AiUsageLog`.
- `types/api.ts` — API request/response payloads for ingestion, classification, extraction, validation, analytics, and hybrid queries.
- `types/domain.ts` — Domain union types: `QuestionType`, `Outcome`, `EvidenceType`, `EvidenceStrength`, `SpanStatus`, `MatchMethod`, `DatasetSplit`.

#### 0.5 Taxonomies & Constants
- `lib/utils/constants.ts` — Standard taxonomy arrays from Architecture Appendix B (visual item types, clue categories, forgotten categories, failure types, workaround types, outcome types, evidence types, question types, evidence strength levels).

#### 0.6 Core Utilities & Clients
- `lib/db/client.ts` — Supabase client factory (singleton for server/client).
- `lib/ai/client.ts` — Google Gemini API client wrapper reading configurable model names from env.
- `lib/utils/validators.ts` — Base validation helpers.
- `lib/utils/versioning.ts` — Model/prompt/schema version tracking.
- `lib/utils/helpers.ts` — Text normalization, SHA-256 hash helper, token estimation.

### Automated Tests
- `tests/unit/scaffold.test.ts`:
  - Verify all taxonomy arrays and enums are complete and non-empty.
  - Verify environment variable loader falls back to defaults or throws on missing critical keys.
  - Verify SHA-256 hash and text normalizer functions.

### Verification Checklist & Definition of Done
- [ ] Next.js app builds cleanly with zero TypeScript errors (`npm run build`).
- [ ] `vitest run` executes and passes scaffold unit tests.
- [ ] `.env.example` matches all variables in Architecture Appendix C.
- [ ] Project directory structure matches Architecture Appendix A.
- [ ] **Definition of Done:** Foundation compiles, dependencies are installed, and test runner is active.

---

## Phase 1 — Database Schema & Migrations

### Objective
Create and apply all PostgreSQL migrations in Supabase, enabling `vector`, `pg_trgm`, and `pgcrypto` extensions, creating all 14+ tables, indexes, constraints, and Row-Level Security (RLS) policies.

### Entry Criteria
- Phase 0 complete and verified.
- Supabase instance accessible.

### Deliverables

#### 1.1 Database Extensions & Migrations
Create migration files in `supabase/migrations/`:
1. `001_extensions.sql` — `CREATE EXTENSION IF NOT EXISTS vector;`, `pg_trgm;`, `pgcrypto;`
2. `002_collection_batches.sql` — `collection_batches` with provenance columns (`platform`, `search_query`, `collection_method`, `date_range_start`, `date_range_end`, etc.).
3. `003_raw_records.sql` — `raw_records` with `batch_id` FK, `text_hash`, `is_duplicate`, `duplicate_of` FK. **No author/username column**.
4. `004_relevance_classifications.sql` — `relevance_classifications` with `record_id` FK, `is_relevant`, `confidence`, `classification_basis`, prompt/model versions.
5. `005_retrieval_episodes.sql` — `retrieval_episodes` with `record_id` FK, `visual_item_type`, `retrieval_goal`, `outcome`, `rationale_summary`, `extraction_confidence`.
6. `006_episode_children.sql` — `remembered_clues`, `forgotten_attributes`, `search_behaviors`, `failure_modes`, `workarounds`. All include:
   - `evidence_quote TEXT NOT NULL`
   - `char_start INTEGER NULLABLE` (computed by application code)
   - `char_end INTEGER NULLABLE` (computed by application code)
   - `span_status TEXT NOT NULL DEFAULT 'pending'` (`matched` / `ambiguous` / `not_found` / `pending`)
   - `evidence_type TEXT NOT NULL` (`observed` / `interpreted` / `hypothesized`)
   - `confidence DECIMAL(3,2) NOT NULL`
7. `007_opportunities.sql` — `opportunities`, `opportunity_evidence`, `insights`:
   - `opportunities` includes all metric columns + explicit denominator columns: `supporting_episode_count`, `total_relevant_episodes`, `dataset_percentage`, `source_diversity`, `failure_rate`, `failure_rate_denominator`, `abandonment_rate`, `abandonment_rate_denominator`, `multi_attempt_rate`, `multi_attempt_denominator`, `workaround_rate`, `manual_scroll_rate`, `unknown_outcome_count`, `evidence_strength`.
   - `insights` uses `evidence_strength TEXT NOT NULL` (not confidence).
8. `008_embeddings.sql` — `episode_embeddings` (`VECTOR(768)`), with IVFFlat cosine index.
9. `009_gold_dataset.sql` — Multi-episode gold evaluation schema:
   - `gold_records`: `record_id`, `is_relevant`, `dataset_split` (`'development'` / `'holdout'`), `expected_episode_count`, `labeller_notes`.
   - `gold_episode_labels`: `gold_record_id` FK, `episode_index`, `episode_description`, `visual_item_type`, `remembered_clues` (JSONB), `forgotten_attributes` (JSONB), `primary_failure_mode`, `outcome`, `notes`.
   - `gold_episode_matches`: `validation_run_id` FK, `gold_episode_id` FK, `ai_episode_id` FK, `match_method` (`'automatic'` / `'manual'`), `match_confidence`.
   - `validation_runs`: `gold_record_count`, `gold_episode_count`, `relevance_precision`, `relevance_recall`, `relevance_f1`, `episode_count_agreement`, `clue_extraction_agreement`, `failure_mode_agreement`, `outcome_agreement`, `details` (JSONB).
10. `010_quality_usage_indexes.sql` — `quality_flags`, `ai_usage_log`, and performance indexes (B-tree on FKs/status, Trigram index on `raw_text`).

#### 1.2 Row Level Security (RLS)
- Public read access for research entities (anon key).
- Write access restricted to service-role key for ingestion, pipeline execution, and admin operations.

#### 1.3 Database Query Builders
- `lib/db/queries/batches.ts` — CRUD for collection batches.
- `lib/db/queries/records.ts` — Raw records CRUD and duplicate lookup.
- `lib/db/queries/episodes.ts` — Episode and child entities retrieval.
- `lib/db/queries/gold.ts` — Gold records, episode labels, and match persistence.

### Automated Tests
- `tests/unit/schema.test.ts`:
  - Verify database migrations apply in order without syntax or foreign key errors.
  - Verify table schema definitions match TypeScript types in `types/database.ts`.
  - Verify constraint checks (e.g., confidence 0–1, valid span_status enums, valid dataset_split enums).

### Verification Checklist & Definition of Done
- [ ] All 10 migrations successfully applied to Supabase.
- [ ] `span_status` column exists on all 5 episode child tables with default `'pending'`.
- [ ] `gold_records` has `dataset_split` column supporting `'development'` and `'holdout'`.
- [ ] `opportunities` table contains all numerator, denominator, and unknown count columns.
- [ ] `insights` uses `evidence_strength` column.
- [ ] Automated schema test passes.
- [ ] **Definition of Done:** Relational schema, vector tables, and query builders are fully deployed and verified.

---

## Phase 2 — Data Ingestion Pipeline (Stage 1)

### Objective
Implement the data ingestion flow: collection batch creation with provenance metadata, CSV/JSON file parsing, author stripping, Unicode normalization, SHA-256 exact deduplication, and trigram near-duplicate detection.

### Entry Criteria
- Phase 1 complete (database tables and query builders verified).

### Deliverables

#### 2.1 Ingestion & Cleaning Engine
- `lib/pipeline/ingest.ts`:
  - Parse CSV and JSON formats.
  - Required field validation (`raw_text`, `platform`).
  - Author/username stripping: completely remove any author field before insertion.
  - Unicode normalization and whitespace trimming.
  - Link every imported record to its parent `collection_batches.id`.
- `lib/pipeline/dedup.ts`:
  - Exact match: Compute SHA-256 hash of normalized text; set `is_duplicate = true` and `duplicate_of` if duplicate hash exists.
  - Near-duplicate detection: Trigram similarity via `pg_trgm` with threshold > 0.85; flag as duplicate without deleting raw text.

#### 2.2 Pipeline State & Administration
- `lib/pipeline/orchestrator.ts` — Stage execution manager.
- `lib/pipeline/status.ts` — Ingestion progress and batch status tracking.
- `lib/auth/admin.ts` — Simple JWT authentication against `ADMIN_PASSWORD`.

#### 2.3 API Endpoints & Admin UI
- `app/api/admin/auth/route.ts` — Admin session token generation.
- `app/api/admin/batches/route.ts` — List and create collection batches with provenance metadata.
- `app/api/admin/records/import/route.ts` — Multipart upload handling, batch assignment, and deduplication execution.
- `components/admin/FileUploader.tsx` — Upload form capturing provenance metadata (platform, query, method, date range).
- `components/admin/BatchManager.tsx` — Collection batch management table.
- `app/admin/import/page.tsx` & `app/admin/batches/page.tsx` — Admin views.

### Automated Tests
- `tests/unit/ingest-dedup.test.ts`:
  - Ingestion parser correctly handles CSV and JSON inputs.
  - Author fields are stripped and never stored.
  - Normalized exact duplicate strings produce identical SHA-256 hashes and flag duplicates.
  - Trigram near-duplicate detection flags strings with similarity > 0.85.
  - Duplicates are marked with `is_duplicate = true` without modifying raw source text.

### Verification Checklist & Definition of Done
- [ ] Successfully import test CSV containing diverse posts.
- [ ] Provenance metadata correctly recorded in `collection_batches`.
- [ ] Raw records link to their batch; `records_imported` counter updates.
- [ ] Exact and near-duplicates are flagged appropriately.
- [ ] Automated ingestion and deduplication tests pass.
- [ ] **Definition of Done:** Raw records and collection provenance can be imported, deduplicated, and audited.

---

## Phase 3 — AI Relevance Classification (Stage 2)

### Objective
Implement Stage 2 of the AI pipeline: classify imported raw records for relevance to vague-memory photo retrieval using `gemini-3.5-flash-lite`, with structured JSON validation, quality gating, retry backoff, and AI usage logging.

### Entry Criteria
- Phase 2 complete (records can be imported).
- `GEMINI_API_KEY` configured.

### Deliverables

#### 3.1 Prompts, Schemas & Classifier Logic
- `lib/ai/prompts/classifier.ts` — Relevance classification prompt (from Architecture Section 6.3) exporting `CLASSIFIER_PROMPT_VERSION`.
- `lib/ai/prompts/schemas/classification.ts` — Zod schema validating:
  ```typescript
  {
    is_relevant: boolean,
    confidence: number, // 0-1
    classification_basis: string,
    retrieval_target: string | null,
    evidence_of_vague_memory: string | null
  }
  ```
  Exports `CLASSIFIER_SCHEMA_VERSION`.
- `lib/ai/classifier.ts`:
  - Batching mechanism (10–20 records per batch for token efficiency).
  - Gemini API call with structured JSON mode.
  - Quality gate: Flag classifications with `confidence < 0.6` for manual review.
  - Persistence: Store result in `relevance_classifications` with `model_version`, `prompt_version`, `schema_version`.
  - AI usage logging: Record tokens, duration, and cost in `ai_usage_log`.

#### 3.2 Pipeline Orchestration & Admin API
- `app/api/admin/pipeline/classify/route.ts` — Trigger classification for unclassified records.
- `app/api/admin/pipeline/status/route.ts` — Pipeline progress reporting.
- `components/admin/PipelineStatus.tsx` — Progress bar and batch status.
- `app/admin/pipeline/page.tsx` — Pipeline management dashboard.

### Automated Tests
- `tests/unit/classifier.test.ts`:
  - Zod classification schema accepts valid AI payloads and rejects malformed outputs.
  - Mocked classifier verifies batching logic (10–20 records per API call).
  - Low confidence results (< 0.6) trigger quality review flags.
  - Exponential backoff retry logic handles simulated HTTP 429 rate limits.

### Verification Checklist & Definition of Done
- [ ] Test batch of records is processed through relevance classification.
- [ ] Relevant vs irrelevant decisions stored with grounded `classification_basis`.
- [ ] `collection_batches.relevant_records` count automatically updates.
- [ ] API usage logged in `ai_usage_log`.
- [ ] Classifier automated tests pass.
- [ ] **Definition of Done:** High-throughput relevance classification operates reliably with quality gating.

---

## Phase 4 — AI Episode Extraction + Deterministic Evidence Span Location + Embeddings (Stage 3)

### Objective
Implement Stage 3 of the AI pipeline: extract structured retrieval episodes using `gemini-3.8-flash` (returning verbatim `evidence_quote`, `evidence_type`, and `confidence` only — **never LLM character offsets**), run the deterministic application `span-locator.ts` to compute exact `char_start`/`char_end` spans in `raw_text`, and generate 768-dim embeddings with `gemini-embedding-2`.

### Entry Criteria
- Phase 3 complete (relevant records classified).

### Deliverables

#### 4.1 Episode Extraction Prompt & Logic
- `lib/ai/prompts/extractor.ts`:
  - Structured extraction prompt from Architecture Section 6.4.
  - Explicit rule: **Do NOT generate character offsets**. Return verbatim `evidence_quote`, `evidence_type` (`observed` / `interpreted` / `hypothesized`), and `confidence` for every extracted field.
  - Multi-episode extraction support (one raw record may yield multiple retrieval episodes).
  - Exports `EXTRACTOR_PROMPT_VERSION`.
- `lib/ai/prompts/schemas/episode.ts` — Zod schema for episode extraction output without character position fields. Exports `EXTRACTOR_SCHEMA_VERSION`.
- `lib/ai/extractor.ts` — Gemini API extraction invoker with Zod validation.

#### 4.2 Deterministic Evidence Span Locator
- `lib/ai/span-locator.ts`:
  - Takes `raw_text` and `evidence_quote`.
  - **Exact single match:** Set `char_start`, `char_end`, and `span_status = 'matched'`.
  - **No match found:** Set `char_start = null`, `char_end = null`, `span_status = 'not_found'` → create quality flag.
  - **Multiple ambiguous matches:** Set first match coordinates, `span_status = 'ambiguous'` → create quality flag.
  - **Fuzzy near-match (minor LLM rephrasing):** If string similarity $\ge 0.90$, locate best match and set `span_status = 'matched'`; otherwise set `span_status = 'not_found'` and flag for review.
  - Populate computed spans across `remembered_clues`, `forgotten_attributes`, `search_behaviors`, `failure_modes`, and `workarounds`.

#### 4.3 Vector Embeddings
- `lib/ai/embeddings.ts`:
  - Generate 768-dimensional embeddings using `gemini-embedding-2`.
  - Concatenate: `retrieval_goal` + clues + forgotten attributes + failure descriptions + source context.
  - Store vectors in `episode_embeddings` table.

#### 4.4 Admin Extraction Route
- `app/api/admin/pipeline/extract/route.ts` — Trigger extraction on relevant records.

### Automated Tests
- `tests/unit/span-locator.test.ts` (Comprehensive Span Locator Test Suite):
  1. **Exact match test:** Exact quote returns correct `char_start`, `char_end`, and `span_status = 'matched'`.
  2. **Multiple matches test:** Quote appearing twice in source text returns first index and flags `span_status = 'ambiguous'`.
  3. **Not found test:** Hallucinated/missing quote returns null coordinates and flags `span_status = 'not_found'`.
  4. **Fuzzy match test:** Quote with minor punctuation/whitespace differences matches above 0.90 threshold and returns valid coordinates.
  5. **Malformed quote test:** Empty, null, or extreme whitespace quotes handled gracefully without exceptions.

### Verification Checklist & Definition of Done
- [ ] Extractor prompt does not ask LLM for character numbers.
- [ ] Application code computes all `char_start` and `char_end` positions.
- [ ] Span statuses (`matched`, `ambiguous`, `not_found`) accurately populated on all child tables.
- [ ] Multi-episode raw records produce multiple distinct rows in `retrieval_episodes`.
- [ ] Embeddings generated and stored in `episode_embeddings`.
- [ ] All 5 span locator automated tests pass.
- [ ] **Definition of Done:** Extracted episodes have deterministic character spans and vector embeddings.

---

## Phase 5 — Gold Dataset Validation

### Objective
Validate the AI pipeline accuracy against a curated gold dataset of 40–50 records **before downstream analytics or RAG are built**, supporting multiple episodes per record, split into **Development (30–35)** and **Holdout (15)** sets, with automatic and manual episode matching and precision/recall/F1 metrics.

### Entry Criteria
- Phase 4 complete (classification, extraction, span location, and embeddings functional).

### Deliverables

#### 5.1 Gold Dataset Architecture & Split
- Split configuration:
  - **Development / Calibration Set (30–35 records):** Used to inspect extraction failures and calibrate prompt versions.
  - **Holdout Validation Set (~15 records):** Strictly held out from prompt tuning to provide unbiased evaluation metrics.
- `lib/validation/gold.ts`:
  - Gold record CRUD (saving human relevance classification and `dataset_split`).
  - Gold episode labels CRUD (saving human expected episodes, clues, forgotten attributes, failure modes, outcomes).
- `lib/validation/evaluate.ts`:
  - Evaluate AI output against gold labels.
  - Calculate metrics separately for:
    1. Development set
    2. Holdout set
    3. Combined set
  - Compute:
    - Relevance Precision, Recall, F1
    - Episode Count Agreement (% records where AI episode count = human count)
    - Clue Extraction Agreement (Jaccard similarity on clue categories per matched episode)
    - Failure Mode Agreement (Exact match on primary failure mode per matched episode)
    - Outcome Agreement (Exact match on outcome per matched episode)

#### 5.2 Episode Matching Engine
- **Automatic Matching:** Order-based matching when episode counts agree; semantic/type similarity matching when counts differ.
- **Manual Matching:** Admin UI fallback to manually pair AI-extracted episodes with human gold episode labels when automatic matching is ambiguous.
- Record match details in `gold_episode_matches` (`match_method`, `match_confidence`).
- Unmatched AI episodes counted as false positives; unmatched human episodes counted as false negatives.

#### 5.3 Admin Validation Interface
- `app/api/admin/gold/route.ts` & `app/api/admin/gold/[id]/route.ts` — Gold dataset management API.
- `app/api/admin/gold/validate/route.ts` — Execute validation run and record metrics in `validation_runs`.
- `app/api/validation/route.ts` — Public endpoint exposing latest validation summary for dashboard.
- `app/admin/gold/page.tsx` — Gold dataset manager (create gold records, assign `dataset_split`, label episodes).
- `components/admin/GoldLabelForm.tsx` — Multi-episode human labelling interface.
- `components/admin/GoldEpisodeMatcher.tsx` — Manual episode pairing interface.
- `components/admin/ValidationResults.tsx` — Metrics display with tabs for Development, Holdout, and Combined sets.

### Automated Tests
- `tests/unit/gold-evaluation.test.ts`:
  - Evaluation engine correctly calculates precision, recall, and F1 from confusion matrix.
  - Episode count agreement correctly computed across multi-episode records.
  - Jaccard similarity correctly computed for clue category arrays.
  - Evaluation results correctly partitioned by `development` and `holdout` splits.
  - Automatic episode matcher handles 1:1, 1:N, and N:M matching scenarios.

### Verification Checklist & Definition of Done
- [ ] Gold dataset populated with 40–50 records (including $\ge 5$ multi-episode records).
- [ ] Records assigned to `development` (30–35) and `holdout` (~15) splits.
- [ ] Validation run executes and populates `validation_runs`.
- [ ] Holdout validation metrics reported separately with clear notice that results are directional.
- [ ] Manual episode matcher interface functions in Admin area.
- [ ] Automated gold evaluation tests pass.
- [ ] **Definition of Done:** Pipeline extraction accuracy is formally benchmarked against human gold standards.

---

## Phase 6 — Core Analytics + Public Dashboard + Evidence Explorer

### Objective
Build the public read-only research dashboard focusing on **clarity, accessibility, readability, evidence traceability, correct charts, and responsive layout** (deferring non-essential visual polish like dark mode/glassmorphism to Phase 9). Implement Overview, Memory & Behaviour, Failure Explorer, and Evidence Explorer with span highlighting.

### Entry Criteria
- Phase 5 complete (pipeline accuracy validated against gold dataset).

### Deliverables

#### 6.1 Core Layout & Navigation (Clean Functional Design)
- `components/layout/Sidebar.tsx` — Clean, accessible navigation sidebar.
- `components/layout/Header.tsx` — Breadcrumbs, dataset provenance summary, and Validation Badge.
- `components/layout/PageContainer.tsx` — Standard responsive container.
- `app/layout.tsx` — Standard typography (Inter from Google Fonts) with clear contrast and responsive layout.

#### 6.2 Public API Routes
- `app/api/analytics/overview/route.ts` — Aggregate dataset statistics, platform distribution, outcome distribution, provenance summary.
- `app/api/analytics/memory/route.ts` — Clue frequency, forgotten attribute frequency, co-occurrence matrices.
- `app/api/analytics/failures/route.ts` — Failure mode distributions, failure by item type, clue $\rightarrow$ failure $\rightarrow$ outcome flow.
- `app/api/episodes/route.ts` — Filterable episode list.
- `app/api/episodes/[id]/route.ts` — Full episode detail with verbatim evidence quotes, application-computed spans, and `span_status`.

#### 6.3 Public Dashboard Pages
- `app/page.tsx` (Overview):
  - Total records, relevant episodes, excluded counts.
  - Platform distribution and item type breakdown.
  - Collection provenance summary card.
  - Validation Badge showing holdout pipeline accuracy (with directional notice).
- `app/memory/page.tsx` (Memory & Behaviour):
  - Most common remembered clues (bar chart).
  - Most common forgotten attributes (bar chart).
  - Remembered $\times$ Forgotten co-occurrence heatmap.
  - Workaround distribution.
- `app/failures/page.tsx` (Failure Explorer):
  - Primary failure mode distribution.
  - Failure mode by visual item type.
  - Clue $\rightarrow$ Failure Mode $\rightarrow$ Outcome flow.
- `app/evidence/page.tsx` & `app/evidence/[id]/page.tsx` (Evidence Explorer):
  - Filterable list of episodes by platform, item type, failure mode, outcome.
  - Episode detail view rendering raw text with **evidence span highlighting**:
    - Highlighted spans colored by category.
    - Status badge (`matched` / `ambiguous` / `not_found`).
    - Evidence type badge (`observed` / `interpreted` / `hypothesized`).
    - AI extraction confidence badge.
    - Direct provenance link to source URL and collection batch.

#### 6.4 Shared UI Components
- `components/evidence/RawTextHighlighter.tsx` — Deterministic character span highlighter.
- `components/dashboard/StatCard.tsx`, `DistributionChart.tsx`, `HeatmapChart.tsx`, `ValidationBadge.tsx`.
- `components/shared/FilterBar.tsx`, `DataTable.tsx`, `EmptyState.tsx`, `LoadingState.tsx`.

### Automated Tests
- `tests/unit/metrics.test.ts`:
  - All aggregation queries use `COUNT(DISTINCT episode_id)` (never raw record counts or clue-row counts).
  - Numerator and denominator calculations are mathematically correct.
  - Highlighting logic correctly computes slice indices from `char_start` and `char_end` without out-of-bounds errors.

### Verification Checklist & Definition of Done
- [ ] Overview, Memory, Failure, and Evidence pages render real data cleanly.
- [ ] Raw text highlighter highlights exact evidence spans in source text.
- [ ] Ambiguous and unmatched spans display appropriate status badges.
- [ ] Responsive design works across screen sizes.
- [ ] Metric formula automated tests pass.
- [ ] **Definition of Done:** Researchers can explore aggregate distributions and trace any finding to highlighted source quotes.

---

## Phase 7 — Pattern Discovery + Opportunity Generation (Stage 4)

### Objective
Implement Stage 4 of the architecture: execute SQL pattern discovery queries, generate research opportunities with **explicit metric formulas, denominator transparency, and multi-factor evidence strength**, and build the Opportunity Explorer comparison view.

### Entry Criteria
- Phase 6 complete (episodes and core analytics functioning).

### Deliverables

#### 7.1 Pattern Discovery Queries
- `lib/analysis/patterns.ts` — SQL aggregation queries from Architecture Section 11.1 using `COUNT(DISTINCT episode_id)`.

#### 7.2 Opportunity Generation Engine
- `lib/analysis/opportunities.ts`:
  - **Deterministic SQL Measurable Dimensions:**
    - `dataset_percentage` = DISTINCT supporting episodes / all DISTINCT relevant retrieval episodes $\times 100$
    - `failure_rate` = supporting episodes with outcome=failure / supporting episodes with known outcome (outcome $\neq$ unknown) $\times 100$
    - `abandonment_rate` = supporting episodes with outcome=abandoned / supporting episodes with known outcome (outcome $\neq$ unknown) $\times 100$
    - `multi_attempt_rate` = supporting episodes with $\ge 2$ search attempts / supporting episodes with known retrieval behaviour $\times 100$
    - `workaround_rate` = supporting episodes with $\ge 1$ workaround / all supporting episodes $\times 100$
    - `manual_scroll_rate` = supporting episodes with manual_scroll / all supporting episodes $\times 100$
    - Store explicit denominators (`failure_rate_denominator`, `abandonment_rate_denominator`, `multi_attempt_denominator`) and `unknown_outcome_count`.
  - **LLM Qualitative Synthesis (`gemini-3.8-flash`):**
    - Generate `observed_consequence`, `root_cause_hypothesis`, `alternative_explanations`, `potential_ai_leverage`, `uncertainty`.
    - Do **not** assign an overall LLM score.
- `lib/ai/prompts/opportunity-synth.ts` — Opportunity qualitative synthesis prompt.

#### 7.3 Multi-Factor Evidence Strength Engine
- Implement evidence strength scoring based on all 6 objective factors:
  1. Supporting episode count ($\ge 5$ for strong)
  2. Source platform diversity ($\ge 3$ for strong)
  3. Proportion of observed evidence ($\ge 60\%$ observed for strong)
  4. Absence of contradictory evidence
  5. Low proportion of unknown outcomes
  6. Pipeline gold validation benchmark
- Assign rating: `strong` / `moderate` / `weak`.

#### 7.4 Admin Pipeline & Public Opportunity Views
- `app/api/admin/pipeline/analyze/route.ts` — Trigger opportunity analysis.
- `app/api/analytics/opportunities/route.ts` — Opportunity list with full dimensions and denominators.
- `app/opportunities/page.tsx` — Opportunity Explorer with side-by-side comparison table.
- `components/opportunities/OpportunityComparisonTable.tsx` — Side-by-side comparison table displaying all 9 measurable dimensions alongside numerator, denominator, and unknown counts.
- `components/opportunities/OpportunityCard.tsx` — Qualitative drilldown card.
- `components/opportunities/OpportunityDrilldown.tsx` — Linked supporting episode list.

### Automated Tests
- `tests/unit/opportunity-evidence-strength.test.ts`:
  - Verify every metric formula uses `COUNT(DISTINCT episode_id)` and correct denominator.
  - Verify `failure_rate` and `abandonment_rate` denominators exclude unknown outcomes.
  - Multi-factor evidence strength assigns `strong`, `moderate`, and `weak` according to the 6 objective criteria.
  - Evidence strength is strictly differentiated from model extraction confidence.

### Verification Checklist & Definition of Done
- [ ] Opportunities generated with deterministic SQL dimensions and qualitative synthesis.
- [ ] Comparison table displays percentages with numerators, denominators, and unknown counts.
- [ ] No arbitrary LLM "opportunity score" is created.
- [ ] Multi-factor evidence strength accurately calculated.
- [ ] Opportunity and evidence strength automated tests pass.
- [ ] **Definition of Done:** Product managers can compare opportunities side-by-side with full denominator transparency.

---

## Phase 8 — Hybrid Ask-the-Research Query Engine

### Objective
Build the Ask-the-Research hybrid query engine: natural language query classification (Quantitative / Qualitative / Mixed), allowlisted structured query plan generation and execution (never computing counts from Top-K vectors), semantic vector search, grounded answer generation with citation verification, and rate limiting (10/min/IP).

### Entry Criteria
- Phase 7 complete (structured data, opportunities, and embeddings fully populated).

### Deliverables

#### 8.1 Query Classification & Planning
- `lib/ai/prompts/question-classifier.ts` — Classifies questions as `quantitative`, `qualitative`, or `mixed`.
- `lib/ai/prompts/query-planner.ts` — Generates a structured query plan with allowed operations (`count`, `count_group_by`, `percentage`, `distribution`, `cross_tabulation`, `top_n`, `comparison`).
- `lib/ai/prompts/schemas/query-plan.ts` — Zod schema validating query plan operations and table/column allowlists.

#### 8.2 Execution Engines
- `lib/db/queries/query-engine.ts`:
  - Validates query plan against strict allowlists (no raw text-to-SQL execution).
  - Executes deterministic SQL across the entire dataset.
- `lib/ai/embeddings.ts`:
  - Query embedding generation and cosine similarity vector search in `episode_embeddings` (Top-K = 15–20, threshold $\ge 0.65$, re-ranked by relevance and platform diversity).

#### 8.3 Grounded Answer Generation & Validation
- `lib/ai/prompts/answer-generator.ts` — Grounded response prompt instructing LLM to answer using SQL results and cited evidence, with `evidence_strength` ratings.
- `lib/ai/prompts/schemas/answer.ts` — Zod schema for structured answer response with citations and `evidence_strength_factors`.
- `lib/ai/query-engine.ts` — Main orchestrator:
  1. Classify question $\rightarrow$ 2. Route (SQL / Vector / Both) $\rightarrow$ 3. Execute $\rightarrow$ 4. Generate Answer $\rightarrow$ 5. Validate:
     - Verify every cited `episode_id` exists.
     - Verify user quotes match source text.
     - Verify stated numbers match SQL query results.
     - Assess multi-factor evidence strength.

#### 8.4 Rate Limiting & User Interface
- `lib/utils/rate-limiter.ts` — In-memory / IP rate limiter (10 requests/min per IP).
- `app/api/ask/route.ts` — Rate-limited POST endpoint.
- `app/ask/page.tsx` — Ask the Research interface.
- `components/ask/QueryInterface.tsx`, `QuestionTypeBadge.tsx`, `AnswerCard.tsx`, `QuantitativeResult.tsx`, `EvidenceList.tsx`, `SuggestedQuestions.tsx`.

### Automated Tests
- `tests/unit/query-engine.test.ts`:
  - Question classifier correctly routes sample queries to quantitative, qualitative, or mixed.
  - Query planner validator rejects queries targeting unauthorized tables or malicious SQL operations.
  - Quantitative engine calculates counts from the full dataset, not vector samples.
  - Grounded answer validator detects hallucinated episode IDs or fabricated quotes.
  - Rate limiter blocks requests exceeding 10 requests per minute per IP.

### Verification Checklist & Definition of Done
- [ ] Quantitative queries execute deterministic SQL and display accurate counts.
- [ ] Qualitative queries return relevant episodes with evidence spans.
- [ ] Mixed queries combine statistical summaries with grounded citations.
- [ ] Answer validation enforces citation integrity.
- [ ] Query engine automated tests pass.
- [ ] **Definition of Done:** Hybrid RAG engine delivers verifiable, citation-backed answers with strict question routing.

---

## Phase 9 — Research Synthesis + Limitations + Deployment + Final Polish

### Objective
Build the Research Synthesis page ("What We Know" / "What We Think" / "What We Need to Validate"), implement the Research Limitations panel, apply deferred visual polish (curated theme, dark mode, glassmorphism, micro-animations), execute full end-to-end integration tests, and prepare for Vercel deployment.

### Entry Criteria
- Phase 8 complete (all core functional engines and public explorers verified).

### Deliverables

#### 9.1 Research Synthesis Page
- `lib/analysis/synthesis.ts` — Aggregation into three structured sections:
  - **What We Know:** Strongly supported observed findings ($\ge 5$ episodes, $\ge 3$ platforms, directly observed).
  - **What We Think:** Root-cause hypotheses and behavioral interpretations.
  - **What We Need to Validate:** Key interview questions for upcoming primary user research (5–6 interviews).
- `app/api/analytics/synthesis/route.ts` — GET endpoint.
- `app/synthesis/page.tsx` — Research Synthesis page.
- `components/synthesis/SynthesisSection.tsx`, `FindingCard.tsx`, `HypothesisCard.tsx`, `ValidationQuestionCard.tsx`.

#### 9.2 Research Limitations Panel
- `lib/analysis/limitations.ts` — Computes dataset bias metrics (sampling bias, platform skew, unknown outcome %, vocal minority effects).
- `app/api/limitations/route.ts` & `app/limitations/page.tsx` — Public limitations documentation.
- `components/limitations/LimitationsPanel.tsx` — Limitations display with mitigations and provenance links.

#### 9.3 Visual Design Polish & Aesthetics
- Apply curated color palette, sleek dark mode toggle, subtle glassmorphism cards, and micro-animations on interactive elements.
- Ensure all charts, tables, and evidence highlighters maintain high contrast and responsive perfection.

#### 9.4 Full Test Suite & Deployment
- `tests/integration/pipeline.test.ts` — End-to-end pipeline integration test (Ingest $\rightarrow$ Classify $\rightarrow$ Extract $\rightarrow$ Validate $\rightarrow$ Analyze $\rightarrow$ Query).
- `tests/e2e/user-journey.test.ts` — Playwright test covering public dashboard navigation and Ask-the-Research flow.
- `README.md` — Setup, environment configuration, database migration guide, and deployment instructions.
- Deployment configuration for Vercel + Supabase Cloud.

### Automated Tests
- `tests/integration/pipeline.test.ts` & `tests/e2e/user-journey.test.ts`:
  - Full pipeline integration from raw file import to synthesized insights.
  - E2E browser test verifying navigation across all 6 explorer views, hybrid query submission, and responsive layout.

### Verification Checklist & Definition of Done
- [ ] Research Synthesis page displays three distinct sections with correct evidence strength ratings.
- [ ] Limitations page clearly documents all sampling biases and validation caveats.
- [ ] Full automated test suite (unit, integration, E2E) passes with 100% success.
- [ ] Application deploys cleanly to Vercel.
- [ ] **Definition of Done:** Project is production-ready, fully validated, tested, and deployed.

---

## Cross-Cutting Constraints & Governance

| Concern | Architectural Rule | Enforcement Mechanism |
|---|---|---|
| **Span Generation** | Application code deterministically locates quotes in `raw_text` | `lib/ai/span-locator.ts` (tested against 5 match modes) |
| **Metric Discipline** | All episode metrics use `COUNT(DISTINCT episode_id)` | SQL query builders & unit tests |
| **Denominator Transparency** | Surface numerator, denominator, and unknown counts | Explicit columns in `opportunities` table and UI |
| **Gold Dataset Integrity** | Split into Development (30–35) and Holdout (15) sets | `gold_records.dataset_split` column & separate reporting |
| **Evidence Strength** | Multi-factor research rating (episodes, sources, observed %, contradictions) | Distinct from model-level `confidence` field |
| **Query Engine Safety** | No raw text-to-SQL; validate plan against allowlist | `lib/ai/prompts/schemas/query-plan.ts` Zod schema |
| **Privacy** | Author usernames stripped on import | `lib/pipeline/ingest.ts` parser |
| **Test Gating** | Each phase must pass its tests before proceeding | Phase Definition of Done checkpoints |

---

> **Status:** Phase-wise implementation plan updated and approved. Ready to proceed with **Phase 0 (Project Scaffold)**.
