/**
 * Deduplication Engine: Exact SHA-256 hash match and near-duplicate similarity detection
 * Preserves all raw records (flags duplicates rather than deleting them)
 */

import { computeTextHash, calculateStringSimilarity } from "@/lib/utils/helpers";
import { RawRecord } from "@/types/database";

export interface DedupCheckResult {
  text_hash: string;
  is_duplicate: boolean;
  duplicate_of: string | null;
  duplicate_reason?: "exact_hash" | "near_duplicate_similarity";
  similarity_score?: number;
}

export const NEAR_DUPLICATE_SIMILARITY_THRESHOLD = 0.85;

/**
 * Checks a single text against a candidate list of existing records or in-batch records
 */
export function checkDuplicate(
  rawText: string,
  existingRecords: Array<{ id: string; text_hash: string; raw_text: string }>
): DedupCheckResult {
  const textHash = computeTextHash(rawText);

  // 1. Exact Hash Match
  const exactMatch = existingRecords.find((r) => r.text_hash === textHash);
  if (exactMatch) {
    return {
      text_hash: textHash,
      is_duplicate: true,
      duplicate_of: exactMatch.id,
      duplicate_reason: "exact_hash",
      similarity_score: 1.0,
    };
  }

  // 2. Near-duplicate similarity check (> 0.85)
  for (const record of existingRecords) {
    const similarity = calculateStringSimilarity(rawText, record.raw_text);
    if (similarity >= NEAR_DUPLICATE_SIMILARITY_THRESHOLD) {
      return {
        text_hash: textHash,
        is_duplicate: true,
        duplicate_of: record.id,
        duplicate_reason: "near_duplicate_similarity",
        similarity_score: similarity,
      };
    }
  }

  return {
    text_hash: textHash,
    is_duplicate: false,
    duplicate_of: null,
  };
}

/**
 * Performs intra-batch and cross-database deduplication on a batch of incoming records
 */
export function deduplicateBatch(
  incomingRecords: Array<{ platform: string; raw_text: string; source_url?: string; date_posted?: string; title?: string; thread_context?: string; metadata?: Record<string, unknown> }>,
  existingDatabaseRecords: Array<{ id: string; text_hash: string; raw_text: string }>
): Array<{
  platform: string;
  raw_text: string;
  source_url: string | null;
  date_posted: string | null;
  title: string | null;
  thread_context: string | null;
  is_duplicate: boolean;
  duplicate_of: string | null;
  text_hash: string;
  metadata: Record<string, unknown>;
}> {
  const processedPool: Array<{ id: string; text_hash: string; raw_text: string }> = [
    ...existingDatabaseRecords,
  ];

  return incomingRecords.map((item, index) => {
    const check = checkDuplicate(item.raw_text, processedPool);
    const virtualId = `batch-item-${index}`;

    const record = {
      platform: item.platform.trim().toLowerCase(),
      raw_text: item.raw_text,
      source_url: item.source_url || null,
      date_posted: item.date_posted || null,
      title: item.title || null,
      thread_context: item.thread_context || null,
      is_duplicate: check.is_duplicate,
      duplicate_of: check.duplicate_of,
      text_hash: check.text_hash,
      metadata: {
        ...(item.metadata || {}),
        ...(check.duplicate_reason ? { duplicate_reason: check.duplicate_reason } : {}),
        ...(check.similarity_score ? { similarity_score: check.similarity_score } : {}),
      },
    };

    // Add this item to the pool for intra-batch duplicate detection if it's not a duplicate
    if (!check.is_duplicate) {
      processedPool.push({
        id: virtualId,
        text_hash: check.text_hash,
        raw_text: item.raw_text,
      });
    }

    return record;
  });
}
