/**
 * AI Episode Extraction & Evidence Span Location Engine (Stage 3)
 * Extracts structured vague-memory retrieval episodes, calculates deterministic character spans,
 * performs quality gating, generates vector embeddings, and stores all child entities.
 */

import { getGeminiClient, getExtractionModelName } from "./client";
import { buildExtractorPrompt, EXTRACTOR_PROMPT_VERSION } from "./prompts/extractor";
import {
  ExtractorResponseSchema,
  EXTRACTOR_SCHEMA_VERSION,
  SingleExtractedEpisode,
} from "./prompts/schemas/episode";
import { locateEvidenceSpan } from "./span-locator";
import { buildEpisodeEmbeddingText, embedAndStoreEpisode } from "./embeddings";
import { insertFullEpisode } from "@/lib/db/queries/episodes";
import { getSupabaseAdminClient } from "@/lib/db/client";
import { RawRecord, RetrievalEpisode } from "@/types/database";

export interface ExtractionRunOptions {
  batchId?: string;
  recordId?: string;
  limit?: number;
  maxRetries?: number;
}

export interface ExtractionRunSummary {
  total_records_processed: number;
  episodes_extracted: number;
  unmatched_spans_count: number;
  ambiguous_spans_count: number;
  low_confidence_flagged: number;
  errors_count: number;
}

/**
 * Calculates estimated cost for Gemini Flash model calls
 */
function estimateCost(inputTokens: number, outputTokens: number): number {
  // Flash pricing estimate: $0.15 / 1M input tokens, $0.60 / 1M output tokens
  const inputCost = (inputTokens / 1_000_000) * 0.15;
  const outputCost = (outputTokens / 1_000_000) * 0.60;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

/**
 * Invokes Gemini extraction model with exponential backoff
 */
async function invokeGeminiExtractor(
  prompt: string,
  modelName: string,
  maxRetries = 3
): Promise<{ text: string; inputTokens: number; outputTokens: number; durationMs: number }> {
  const gemini = getGeminiClient();
  let attempt = 0;
  let delay = 1000;
  const startTime = Date.now();

  while (attempt <= maxRetries) {
    try {
      const response = await gemini.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const durationMs = Date.now() - startTime;
      const text = response.text || "{}";
      const inputTokens = response.usageMetadata?.promptTokenCount || Math.ceil(prompt.length / 4);
      const outputTokens = response.usageMetadata?.candidatesTokenCount || Math.ceil(text.length / 4);

      return { text, inputTokens, outputTokens, durationMs };
    } catch (err: any) {
      attempt++;
      const isRateLimit =
        err.status === 429 || err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED");

      if (attempt > maxRetries || (!isRateLimit && attempt > 1)) {
        throw new Error(`Gemini extractor failed after ${attempt} attempts: ${err.message}`);
      }

      const jitter = Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      delay *= 2;
    }
  }

  throw new Error("Gemini extractor failed unexpectedly");
}

/**
 * Extracts episodes and deterministically locates evidence spans for a single raw record
 */
export async function extractEpisodesForRecord(
  record: RawRecord,
  modelName = getExtractionModelName()
): Promise<{ episodes: RetrievalEpisode[]; stats: { unmatched: number; ambiguous: number; lowConf: number } }> {
  const prompt = buildExtractorPrompt(record.raw_text, record.platform, record.title || undefined);
  const { text, inputTokens, outputTokens, durationMs } = await invokeGeminiExtractor(prompt, modelName);

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(text);
  } catch (err: any) {
    throw new Error(`Failed to parse extraction JSON response: ${err.message}`);
  }

  const parsed = ExtractorResponseSchema.safeParse(rawJson);
  if (!parsed.success) {
    throw new Error(`Extraction schema validation error: ${parsed.error.message}`);
  }

  const extractedList: SingleExtractedEpisode[] = parsed.data.episodes;
  const supabase = getSupabaseAdminClient();
  const createdEpisodes: RetrievalEpisode[] = [];

  let unmatchedCount = 0;
  let ambiguousCount = 0;
  let lowConfCount = 0;

  for (const item of extractedList) {
    // 1. Quality gate extraction confidence
    if (item.extraction_confidence < 0.6) {
      lowConfCount++;
    }

    // 2. Deterministically calculate evidence spans for all child entities
    // Clues
    const processedClues = (item.remembered_clues || []).map((clue) => {
      const span = locateEvidenceSpan(record.raw_text, clue.evidence_quote);
      if (span.span_status === "not_found") unmatchedCount++;
      if (span.span_status === "ambiguous") ambiguousCount++;
      return {
        clue_category: clue.clue_category,
        clue_description: clue.clue_description,
        evidence_quote: clue.evidence_quote,
        source_record_id: record.id,
        char_start: span.char_start,
        char_end: span.char_end,
        span_status: span.span_status,
        evidence_type: clue.evidence_type,
        confidence: clue.confidence,
      };
    });

    // Forgotten Attributes
    const processedAttributes = (item.forgotten_attributes || []).map((attr) => {
      const span = locateEvidenceSpan(record.raw_text, attr.evidence_quote);
      if (span.span_status === "not_found") unmatchedCount++;
      if (span.span_status === "ambiguous") ambiguousCount++;
      return {
        attribute_category: attr.attribute_category,
        description: attr.description,
        evidence_quote: attr.evidence_quote,
        source_record_id: record.id,
        char_start: span.char_start,
        char_end: span.char_end,
        span_status: span.span_status,
        evidence_type: attr.evidence_type,
        confidence: attr.confidence,
      };
    });

    // Search Behaviors
    const processedBehaviors = (item.search_behaviors || []).map((beh) => {
      const span = locateEvidenceSpan(record.raw_text, beh.evidence_quote);
      if (span.span_status === "not_found") unmatchedCount++;
      if (span.span_status === "ambiguous") ambiguousCount++;
      return {
        behavior_type: beh.behavior_type,
        description: beh.description,
        sequence_order: beh.sequence_order ?? null,
        evidence_quote: beh.evidence_quote,
        source_record_id: record.id,
        char_start: span.char_start,
        char_end: span.char_end,
        span_status: span.span_status,
      };
    });

    // Failure Modes
    const processedFailures = (item.failure_modes || []).map((fail) => {
      const span = locateEvidenceSpan(record.raw_text, fail.evidence_quote);
      if (span.span_status === "not_found") unmatchedCount++;
      if (span.span_status === "ambiguous") ambiguousCount++;
      return {
        failure_type: fail.failure_type,
        failure_priority: fail.failure_priority,
        description: fail.description,
        evidence_quote: fail.evidence_quote,
        source_record_id: record.id,
        char_start: span.char_start,
        char_end: span.char_end,
        span_status: span.span_status,
        rationale_summary: fail.rationale_summary,
        confidence: fail.confidence,
      };
    });

    // Workarounds
    const processedWorkarounds = (item.workarounds || []).map((work) => {
      const span = locateEvidenceSpan(record.raw_text, work.evidence_quote);
      if (span.span_status === "not_found") unmatchedCount++;
      if (span.span_status === "ambiguous") ambiguousCount++;
      return {
        workaround_type: work.workaround_type,
        description: work.description,
        evidence_quote: work.evidence_quote,
        source_record_id: record.id,
        char_start: span.char_start,
        char_end: span.char_end,
        span_status: span.span_status,
        led_to_success: work.led_to_success ?? null,
      };
    });

    // 3. Persist Episode and children into database
    const savedEpisode = await insertFullEpisode(
      {
        record_id: record.id,
        visual_item_type: item.visual_item_type,
        retrieval_goal: item.retrieval_goal,
        why_user_needs_item: item.why_user_needs_item || null,
        outcome: item.outcome,
        impact_type: item.impact_type || null,
        urgency: item.urgency || null,
        frustration_level: item.frustration_level || null,
        consequence: item.consequence || null,
        rationale_summary: item.rationale_summary,
        extraction_confidence: item.extraction_confidence,
        model_version: modelName,
        prompt_version: EXTRACTOR_PROMPT_VERSION,
        schema_version: EXTRACTOR_SCHEMA_VERSION,
      },
      processedClues,
      processedAttributes,
      processedBehaviors,
      processedFailures,
      processedWorkarounds
    );

    createdEpisodes.push(savedEpisode);

    // 4. Quality flag creations for low confidence or span anomalies
    if (item.extraction_confidence < 0.6) {
      await supabase.from("quality_flags").insert({
        target_type: "episode",
        target_id: savedEpisode.id,
        flag_type: "low_confidence_extraction",
        description: `Episode extraction confidence ${item.extraction_confidence} is below 0.6 threshold: ${item.rationale_summary}`,
        resolved: false,
      });
    }

    const allSpans = [
      ...processedClues,
      ...processedAttributes,
      ...processedBehaviors,
      ...processedFailures,
      ...processedWorkarounds,
    ];

    for (const s of allSpans) {
      if (s.span_status === "not_found") {
        await supabase.from("quality_flags").insert({
          target_type: "span",
          target_id: savedEpisode.id,
          flag_type: "unmatched_evidence_span",
          description: `Evidence quote could not be located in source text: "${s.evidence_quote}"`,
          resolved: false,
        });
      } else if (s.span_status === "ambiguous") {
        await supabase.from("quality_flags").insert({
          target_type: "span",
          target_id: savedEpisode.id,
          flag_type: "ambiguous_evidence_span",
          description: `Multiple occurrences of quote found in source text: "${s.evidence_quote}"`,
          resolved: false,
        });
      }
    }

    // 5. Build vector embedding and persist into episode_embeddings
    try {
      const embeddingText = buildEpisodeEmbeddingText({
        retrieval_goal: item.retrieval_goal,
        visual_item_type: item.visual_item_type,
        why_user_needs_item: item.why_user_needs_item || undefined,
        rationale_summary: item.rationale_summary,
        clues: (item.remembered_clues || []).map((c) => ({
          clue_type: c.clue_category,
          clue_value: c.clue_description,
          quote: c.evidence_quote,
        })),
        forgotten: (item.forgotten_attributes || []).map((f) => ({
          attribute_type: f.attribute_category,
          quote: f.evidence_quote,
        })),
        behaviors: (item.search_behaviors || []).map((b) => ({
          behavior_type: b.behavior_type,
          query_or_action: b.description,
        })),
        failures: (item.failure_modes || []).map((f) => ({
          failure_type: f.failure_type,
          observed_behavior: f.description,
        })),
        workarounds: (item.workarounds || []).map((w) => ({
          workaround_type: w.workaround_type,
          description: w.description,
        })),
      });

      await embedAndStoreEpisode(savedEpisode.id, embeddingText);
    } catch (embedErr) {
      console.error(`Failed to generate embedding for episode ${savedEpisode.id}:`, embedErr);
    }
  }

  // 6. Log AI usage
  const costEstimate = estimateCost(inputTokens, outputTokens);
  await supabase.from("ai_usage_log").insert({
    operation: "extract",
    model: modelName,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_estimate: costEstimate,
    duration_ms: durationMs,
  });

  return {
    episodes: createdEpisodes,
    stats: {
      unmatched: unmatchedCount,
      ambiguous: ambiguousCount,
      lowConf: lowConfCount,
    },
  };
}

/**
 * Runs episode extraction on all relevant classified records lacking episodes
 */
export async function runEpisodeExtraction(
  options: ExtractionRunOptions = {}
): Promise<ExtractionRunSummary> {
  const supabase = getSupabaseAdminClient();
  const limit = options.limit || 50;
  const modelName = getExtractionModelName();

  // Query records that are classified as is_relevant = true but have no retrieval_episodes yet
  let query = supabase
    .from("raw_records")
    .select(`
      *,
      relevance_classifications!inner(is_relevant),
      retrieval_episodes(id)
    `)
    .eq("relevance_classifications.is_relevant", true)
    .is("retrieval_episodes", null)
    .limit(limit);

  if (options.batchId) {
    query = query.eq("batch_id", options.batchId);
  }
  if (options.recordId) {
    query = query.eq("id", options.recordId);
  }

  const { data: recordsData, error } = await query;
  if (error) throw new Error(`Failed to fetch records for extraction: ${error.message}`);

  const records = (recordsData || []) as unknown as RawRecord[];

  const summary: ExtractionRunSummary = {
    total_records_processed: 0,
    episodes_extracted: 0,
    unmatched_spans_count: 0,
    ambiguous_spans_count: 0,
    low_confidence_flagged: 0,
    errors_count: 0,
  };

  const affectedBatchIds = new Set<string>();

  for (const record of records) {
    affectedBatchIds.add(record.batch_id);
    try {
      const result = await extractEpisodesForRecord(record, modelName);
      summary.total_records_processed++;
      summary.episodes_extracted += result.episodes.length;
      summary.unmatched_spans_count += result.stats.unmatched;
      summary.ambiguous_spans_count += result.stats.ambiguous;
      summary.low_confidence_flagged += result.stats.lowConf;
    } catch (err) {
      summary.errors_count++;
      console.error(`Error extracting episode for record ${record.id}:`, err);
    }
  }

  // Update extracted_episodes count on collection batches
  for (const batchId of affectedBatchIds) {
    const { count: epCount } = await supabase
      .from("retrieval_episodes")
      .select("id, raw_records!inner(batch_id)", { count: "exact", head: true })
      .eq("raw_records.batch_id", batchId);

    await supabase
      .from("collection_batches")
      .update({ extracted_episodes: epCount || 0 })
      .eq("id", batchId);
  }

  return summary;
}
