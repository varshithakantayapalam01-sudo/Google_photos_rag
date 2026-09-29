/**
 * Gemini Embedding Generation Engine (Stage 3)
 * Generates 768-dimensional vector embeddings for retrieval episodes and stores them in pgvector.
 */

import { getGeminiClient, getEmbeddingModelName, getEmbeddingDimensions } from "./client";
import { getSupabaseAdminClient } from "@/lib/db/client";

/**
 * Builds the comprehensive text representation of an episode for semantic embedding
 */
export function buildEpisodeEmbeddingText(episodeData: {
  retrieval_goal: string;
  visual_item_type: string;
  why_user_needs_item?: string;
  rationale_summary?: string;
  clues?: Array<{ clue_type: string; clue_value: string; quote: string }>;
  forgotten?: Array<{ attribute_type: string; quote: string }>;
  behaviors?: Array<{ behavior_type: string; query_or_action: string }>;
  failures?: Array<{ failure_type: string; observed_behavior: string }>;
  workarounds?: Array<{ workaround_type: string; description: string }>;
}): string {
  const parts: string[] = [];

  parts.push(`Retrieval Goal: ${episodeData.retrieval_goal}`);
  parts.push(`Visual Item Type: ${episodeData.visual_item_type}`);

  if (episodeData.why_user_needs_item) {
    parts.push(`Context/Motivation: ${episodeData.why_user_needs_item}`);
  }
  if (episodeData.rationale_summary) {
    parts.push(`Summary: ${episodeData.rationale_summary}`);
  }

  if (episodeData.clues && episodeData.clues.length > 0) {
    const clueStrs = episodeData.clues.map((c) => `[${c.clue_type}] ${c.clue_value} (quote: "${c.quote}")`).join("; ");
    parts.push(`Remembered Clues: ${clueStrs}`);
  }

  if (episodeData.forgotten && episodeData.forgotten.length > 0) {
    const forgottenStrs = episodeData.forgotten.map((f) => `[${f.attribute_type}] (quote: "${f.quote}")`).join("; ");
    parts.push(`Forgotten Attributes: ${forgottenStrs}`);
  }

  if (episodeData.behaviors && episodeData.behaviors.length > 0) {
    const behStrs = episodeData.behaviors.map((b) => `[${b.behavior_type}] ${b.query_or_action}`).join("; ");
    parts.push(`Search Behaviors: ${behStrs}`);
  }

  if (episodeData.failures && episodeData.failures.length > 0) {
    const failStrs = episodeData.failures.map((f) => `[${f.failure_type}] ${f.observed_behavior}`).join("; ");
    parts.push(`Failure Modes: ${failStrs}`);
  }

  if (episodeData.workarounds && episodeData.workarounds.length > 0) {
    const workStrs = episodeData.workarounds.map((w) => `[${w.workaround_type}] ${w.description}`).join("; ");
    parts.push(`Workarounds: ${workStrs}`);
  }

  return parts.join("\n");
}

/**
 * Generates an embedding vector using Gemini
 */
export async function generateEmbedding(
  text: string,
  modelName = getEmbeddingModelName(),
  dimensions = getEmbeddingDimensions()
): Promise<{ embedding: number[]; durationMs: number }> {
  const gemini = getGeminiClient();
  const startTime = Date.now();

  const response = await gemini.models.embedContent({
    model: modelName,
    contents: text,
    config: {
      outputDimensionality: dimensions,
    },
  });

  const durationMs = Date.now() - startTime;
  // Handle various response shapes from Google GenAI SDK
  const resAny = response as any;
  const embedding = resAny.embedding?.values || resAny.embeddings?.[0]?.values || [];

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("Failed to generate embedding: empty vector received from Gemini API");
  }

  return { embedding, durationMs };
}


/**
 * Generates an embedding for an episode and persists it into episode_embeddings
 */
export async function embedAndStoreEpisode(
  episodeId: string,
  embeddingText: string,
  modelName = getEmbeddingModelName()
): Promise<void> {
  const { embedding, durationMs } = await generateEmbedding(embeddingText, modelName);
  const supabase = getSupabaseAdminClient();

  const { error: upsertError } = await supabase
    .from("episode_embeddings")
    .upsert(
      {
        episode_id: episodeId,
        embedding_text: embeddingText,
        embedding: embedding,
        model_version: modelName,
      },
      { onConflict: "episode_id" }
    );

  if (upsertError) {
    throw new Error(`Failed to store episode embedding: ${upsertError.message}`);
  }

  // Log usage
  await supabase.from("ai_usage_log").insert({
    operation: "embed",
    model: modelName,
    input_tokens: Math.ceil(embeddingText.length / 4),
    output_tokens: 0,
    cost_estimate: 0.00001,
    duration_ms: durationMs,
  });
}

/**
 * Computes cosine similarity between two numeric vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface VectorSearchResult {
  episode_id: string;
  similarity: number;
  retrieval_goal: string;
  visual_item_type: string;
  outcome: string;
  platform: string;
  source_url: string | null;
  raw_text: string;
  clues: Array<{ clue_category: string; quote: string; evidence_type: string; char_start: number | null; char_end: number | null }>;
  failures: Array<{ failure_type: string; quote: string; evidence_type: string; char_start: number | null; char_end: number | null }>;
}

/**
 * Performs semantic vector search on episode embeddings with cosine similarity,
 * filtering (threshold >= 0.65), and platform diversity re-ranking.
 */
export async function searchEpisodeEmbeddings(
  queryText: string,
  topK = 15,
  threshold = 0.65
): Promise<VectorSearchResult[]> {
  const { embedding: queryEmbedding } = await generateEmbedding(queryText);
  const supabase = getSupabaseAdminClient();

  // Fetch embeddings with episode and raw record data
  const { data: records, error } = await supabase
    .from("episode_embeddings")
    .select(`
      episode_id,
      embedding,
      retrieval_episodes!inner(
        id,
        retrieval_goal,
        visual_item_type,
        outcome,
        raw_records!inner(
          platform,
          source_url,
          raw_text
        ),
        remembered_clues(clue_category, quote, evidence_type, char_start, char_end),
        failure_modes(failure_type, quote, evidence_type, char_start, char_end)
      )
    `);

  if (error || !records) {
    console.error("Vector search query error:", error);
    return [];
  }

  // Calculate cosine similarity for all
  const scored: Array<VectorSearchResult> = [];

  for (const item of records) {
    let vec: number[] = [];
    if (Array.isArray(item.embedding)) {
      vec = item.embedding;
    } else if (typeof item.embedding === "string") {
      try {
        vec = JSON.parse(item.embedding);
      } catch {
        vec = [];
      }
    }

    if (vec.length === 0) continue;

    const sim = cosineSimilarity(queryEmbedding, vec);
    if (sim >= threshold) {
      const ep: any = item.retrieval_episodes;
      scored.push({
        episode_id: item.episode_id,
        similarity: Math.round(sim * 1000) / 1000,
        retrieval_goal: ep?.retrieval_goal || "",
        visual_item_type: ep?.visual_item_type || "other",
        outcome: ep?.outcome || "unknown",
        platform: ep?.raw_records?.platform || "unknown",
        source_url: ep?.raw_records?.source_url || null,
        raw_text: ep?.raw_records?.raw_text || "",
        clues: ep?.remembered_clues || [],
        failures: ep?.failure_modes || [],
      });
    }
  }

  // Sort by similarity descending
  scored.sort((a, b) => b.similarity - a.similarity);

  // Platform diversity re-ranking: promote first occurrences of different platforms
  const platformSeen = new Set<string>();
  const diverse: VectorSearchResult[] = [];
  const remaining: VectorSearchResult[] = [];

  for (const s of scored) {
    if (!platformSeen.has(s.platform)) {
      platformSeen.add(s.platform);
      diverse.push(s,);
    } else {
      remaining.push(s);
    }
  }

  const results = [...diverse, ...remaining].slice(0, topK);
  return results;
}

