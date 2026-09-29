/**
 * AI Relevance Classification Execution Engine (Stage 2)
 * Performs batch classification with Gemini, quality gating, version tracking, and usage logging
 */

import { getGeminiClient, getClassificationModelName } from "./client";
import { buildClassificationPrompt, CLASSIFIER_PROMPT_VERSION } from "./prompts/classifier";
import {
  BatchClassificationResponseSchema,
  CLASSIFIER_SCHEMA_VERSION,
  SingleClassificationResult,
} from "./prompts/schemas/classification";
import { getSupabaseAdminClient } from "@/lib/db/client";
import { RawRecord, RelevanceClassification } from "@/types/database";

export interface ClassificationRunOptions {
  batchSize?: number;
  batchId?: string;
  limit?: number;
  maxRetries?: number;
}

export interface ClassificationRunSummary {
  total_processed: number;
  relevant_count: number;
  irrelevant_count: number;
  low_confidence_flagged: number;
  errors_count: number;
}

/**
 * Calculates estimated cost for Gemini Flash-Lite model calls
 */
function estimateCost(inputTokens: number, outputTokens: number): number {
  // Flash-Lite pricing estimate: $0.075 / 1M input tokens, $0.30 / 1M output tokens
  const inputCost = (inputTokens / 1_000_000) * 0.075;
  const outputCost = (outputTokens / 1_000_000) * 0.30;
  return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000;
}

/**
 * Invokes Gemini API with exponential backoff on 429 / network errors
 */
export async function invokeGeminiWithRetry(
  prompt: string,
  modelName: string,
  maxRetries = 4
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
      const isRateLimit = err.status === 429 || err.message?.includes("429") || err.message?.includes("RESOURCE_EXHAUSTED");
      
      if (attempt > maxRetries || (!isRateLimit && attempt > 1)) {
        throw new Error(`Gemini API classification failed after ${attempt} attempts: ${err.message}`);
      }

      // Exponential backoff with jitter
      const jitter = Math.random() * 200;
      await new Promise((resolve) => setTimeout(resolve, delay + jitter));
      delay *= 2;
    }
  }

  throw new Error("Gemini API call failed unexpectedly");
}

/**
 * Classifies a single batch of records (10–20 records) using Gemini and persists the results
 */
export async function classifyBatch(
  records: RawRecord[],
  modelName = getClassificationModelName()
): Promise<SingleClassificationResult[]> {
  if (records.length === 0) return [];

  const prompt = buildClassificationPrompt(records);
  const { text, inputTokens, outputTokens, durationMs } = await invokeGeminiWithRetry(prompt, modelName);

  let rawJson: unknown;
  try {
    rawJson = JSON.parse(text);
  } catch (err: any) {
    throw new Error(`Failed to parse AI classification JSON: ${err.message}`);
  }

  const parsed = BatchClassificationResponseSchema.safeParse(rawJson);
  if (!parsed.success) {
    throw new Error(`AI classification schema validation failed: ${parsed.error.message}`);
  }

  const results = parsed.data.classifications;
  const supabase = getSupabaseAdminClient();

  // 1. Insert relevance classifications
  const classificationsToInsert = results.map((res) => ({
    record_id: res.record_id,
    is_relevant: res.is_relevant,
    confidence: res.confidence,
    classification_basis: res.classification_basis,
    retrieval_target: res.retrieval_target,
    evidence_of_vague_memory: res.evidence_of_vague_memory,
    model_version: modelName,
    prompt_version: CLASSIFIER_PROMPT_VERSION,
    schema_version: CLASSIFIER_SCHEMA_VERSION,
  }));

  const { error: insertError } = await supabase
    .from("relevance_classifications")
    .upsert(classificationsToInsert, { onConflict: "record_id" });

  if (insertError) {
    throw new Error(`Failed to persist classifications: ${insertError.message}`);
  }

  // 2. Quality gating: flag classifications with confidence < 0.6
  const lowConfidenceItems = results.filter((r) => r.confidence < 0.6);
  if (lowConfidenceItems.length > 0) {
    const flags = lowConfidenceItems.map((item) => ({
      target_type: "record" as const,
      target_id: item.record_id,
      flag_type: "low_confidence_classification",
      description: `Classification confidence ${item.confidence} is below 0.6 threshold: ${item.classification_basis}`,
      resolved: false,
    }));
    await supabase.from("quality_flags").insert(flags);
  }

  // 3. Log AI usage
  const costEstimate = estimateCost(inputTokens, outputTokens);
  await supabase.from("ai_usage_log").insert({
    operation: "classify",
    model: modelName,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_estimate: costEstimate,
    duration_ms: durationMs,
  });

  return results;
}

/**
 * Runs classification on all unclassified records across the database
 */
export async function runRelevanceClassification(
  options: ClassificationRunOptions = {}
): Promise<ClassificationRunSummary> {
  const supabase = getSupabaseAdminClient();
  const batchSize = options.batchSize || 15;
  const limit = options.limit || 100;
  const modelName = getClassificationModelName();

  // Query unclassified records
  let query = supabase
    .from("raw_records")
    .select(`
      *,
      relevance_classifications(id)
    `)
    .eq("is_duplicate", false)
    .is("relevance_classifications", null)
    .limit(limit);

  if (options.batchId) {
    query = query.eq("batch_id", options.batchId);
  }

  const { data: unclassified, error } = await query;
  if (error) throw new Error(`Failed to fetch unclassified records: ${error.message}`);

  const records = (unclassified || []) as unknown as RawRecord[];
  if (records.length === 0) {
    return {
      total_processed: 0,
      relevant_count: 0,
      irrelevant_count: 0,
      low_confidence_flagged: 0,
      errors_count: 0,
    };
  }

  const summary: ClassificationRunSummary = {
    total_processed: 0,
    relevant_count: 0,
    irrelevant_count: 0,
    low_confidence_flagged: 0,
    errors_count: 0,
  };

  const affectedBatchIds = new Set<string>();

  // Process in chunks of batchSize
  for (let i = 0; i < records.length; i += batchSize) {
    const chunk = records.slice(i, i + batchSize);
    chunk.forEach((r) => affectedBatchIds.add(r.batch_id));

    try {
      const results = await classifyBatch(chunk, modelName);
      summary.total_processed += results.length;
      summary.relevant_count += results.filter((r) => r.is_relevant).length;
      summary.irrelevant_count += results.filter((r) => !r.is_relevant).length;
      summary.low_confidence_flagged += results.filter((r) => r.confidence < 0.6).length;
    } catch (err) {
      summary.errors_count += chunk.length;
      console.error("Batch classification error:", err);
    }
  }

  // Update relevant_records counts on all affected collection batches
  for (const batchId of affectedBatchIds) {
    const { count: relCount } = await supabase
      .from("raw_records")
      .select("id, relevance_classifications!inner(id, is_relevant)", { count: "exact", head: true })
      .eq("batch_id", batchId)
      .eq("relevance_classifications.is_relevant", true);

    await supabase
      .from("collection_batches")
      .update({ relevant_records: relCount || 0 })
      .eq("id", batchId);
  }

  return summary;
}
