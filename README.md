# Google Photos AI-Powered Discovery Engine

> **A research-grade intelligence engine and hybrid query platform for Product Managers and UX Researchers studying photo & visual-item retrieval behavior.**

---

## 🌟 System Architecture & Capabilities

The Discovery Engine ingests publicly available user conversations regarding photo retrieval, passes them through a deterministic AI pipeline with gold dataset validation, and surfaces actionable behavioral insights through an interactive research dashboard and hybrid query engine.

```
┌─────────────────┐     ┌───────────────────────┐     ┌────────────────────────┐
│  Stage 1 Ingest │ ──► │  Stage 2 Classification│ ──► │ Stage 3 Episode Extract│
│ (CSV/JSON Dedup)│     │ (gemini-3.5-flash-lite│     │ (gemini-3.8-flash)     │
└─────────────────┘     └───────────────────────┘     └───────────┬────────────┘
                                                                  │
┌─────────────────────────┐     ┌──────────────────────┐          ▼
│ Stage 4 Pattern & Synth │ ◄── │ Gold Validation Gate │ ◄─── Deterministic
│ (SQL Measurable Dims)   │     │ (Holdout F1 ≥ 0.70)  │      Span Locator
└───────────┬─────────────┘     └──────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                    Hybrid Ask-the-Research Query Engine                       │
│   • Quantitative: Safe allowlisted SQL across complete structured dataset    │
│   • Qualitative: 768-dim semantic vector search with diversity re-ranking     │
│   • Grounded Validation: 6-factor evidence strength & quote verification      │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Deployment Guide (Railway Backend + Vercel Frontend)

The system is engineered to deploy seamlessly with the **Backend on Railway** and the **Frontend on Vercel**, connected to **Supabase** as the PostgreSQL/pgvector database.

### 1. Database Setup (Supabase)
1. Create a new project in [Supabase](https://supabase.com).
2. Open the SQL Editor and execute all migrations in sequence from `supabase/migrations/`:
   - `001_initial_schema.sql` (Enables `vector`, `pg_trgm`, `pgcrypto`)
   - `002_collection_batches.sql`
   - `003_raw_records.sql`
   - `004_classifications.sql`
   - `005_retrieval_episodes.sql`
   - `006_episode_children.sql`
   - `007_embeddings.sql`
   - `008_opportunities_insights.sql`
   - `009_gold_dataset.sql`
   - `010_ai_usage_logging.sql`
3. Copy your project URL, anon key, and service role key.

---

### 2. Backend Deployment on Railway
The project includes a production-ready, multi-stage `Dockerfile` and `railway.json`.

1. Go to [Railway](https://railway.app) and create a **New Project** → **Deploy from GitHub repo**.
2. Railway will automatically detect `railway.json` and build the container using `Dockerfile`.
3. Set the following **Environment Variables** in your Railway service settings:
   ```env
   NODE_ENV=production
   PORT=3000
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   GEMINI_API_KEY=<your-google-gemini-api-key>
   GEMINI_MODEL_CLASSIFICATION=gemini-3.5-flash-lite
   GEMINI_MODEL_EXTRACTION=gemini-3.8-flash
   GEMINI_MODEL_SYNTHESIS=gemini-3.8-flash
   GEMINI_MODEL_EMBEDDING=gemini-embedding-2
   GEMINI_EMBEDDING_DIMENSIONS=768
   ADMIN_PASSWORD=<your-secure-admin-password>
   ADMIN_JWT_SECRET=<your-random-32char-secret>
   ```
4. Deploy the service and copy the assigned Railway domain (e.g. `https://google-photos-rag-backend.up.railway.app`).

---

### 3. Frontend Deployment on Vercel
1. Go to [Vercel](https://vercel.com) and click **Add New Project** → Import your GitHub repository.
2. Framework Preset: **Next.js**.
3. Configure the following **Environment Variables** in Vercel:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   GEMINI_API_KEY=<your-google-gemini-api-key>
   ADMIN_PASSWORD=<your-secure-admin-password>
   ADMIN_JWT_SECRET=<your-random-32char-secret>
   ```
4. Click **Deploy**. Vercel will build the frontend with serverless API edge routes and high-speed global CDN delivery.

---

## 🛠️ Local Development & Testing

### Prerequisites
- Node.js 20+
- npm 10+

### Setup
```bash
# 1. Clone repository
git clone <repo-url>
cd GOOGLE_PHOTOS_RAG

# 2. Install dependencies
npm install

# 3. Configure local environment
cp .env.example .env.local
# Edit .env.local with your Supabase and Gemini credentials
```

### Run Locally
```bash
# Start development server
npm run dev
# App will be accessible at http://localhost:3000
```

### Run Automated Test Suites
```bash
# Run all unit and integration tests (Vitest)
npx vitest run

# Run TypeScript typecheck
npx tsc --noEmit

# Build production bundle (Standalone)
npm run build
```

---

## 🔬 Explorer Views Summary

| View | Route | Description |
|---|---|---|
| **Overview** | `/` | Ingestion statistics, platform distributions, provenance metadata, holdout gold validation badge. |
| **Memory & Behaviour** | `/memory` | Remembered clues, forgotten attributes, co-occurrence heatmaps, search workarounds. |
| **Failure Explorer** | `/failures` | Primary failure stages, failure by item type breakdown, clue $\rightarrow$ failure flow. |
| **Evidence Explorer** | `/evidence` & `/evidence/[id]` | Filterable episodes with exact deterministic character-span evidence highlighting. |
| **Opportunity Explorer** | `/opportunities` | 9 measurable dimensions with explicit denominators and 6-factor evidence strength ratings. |
| **Ask the Research** | `/ask` | Hybrid query interface (Quantitative SQL + Qualitative Vector RAG + Grounded Validation). |
| **Research Synthesis** | `/synthesis` | Three epistemic tiers: *What We Know*, *What We Think*, *What We Need to Validate* (5–6 user interview guide). |
| **Limitations & Bias** | `/limitations` | Sampling bias analysis, platform skew metrics, unknown outcome exclusions, researcher governance rules. |
| **Admin Operations** | `/admin` | Provenance-tracked batch imports, Stage 2–4 pipeline runners, holdout gold dataset validator. |

---

## 🛡️ Epistemic & Methodological Integrity Rules

1. **Deterministic Spans:** Character offsets (`char_start`, `char_end`) are computed by application code ([`lib/ai/span-locator.ts`](file:///d:/GOOGLE_PHOTOS_RAG/lib/ai/span-locator.ts)) across 5 match modes.
2. **Strict Metric Discipline:** All aggregate metrics enforce `COUNT(DISTINCT episode_id)`.
3. **Denominator Transparency:** Failure and abandonment rates strictly exclude unknown outcomes and display explicit denominators ($n = \dots$).
4. **Separation of Concerns:** Model-level extraction confidence is strictly separated from 6-factor multi-platform Evidence Strength.
5. **Safe Query Routing:** Quantitative queries execute safe allowlisted query plans across the complete structured database—never estimating counts from Top-K vector samples.
