/**
 * Shared utility functions: normalization, hashing, fuzzy similarity
 */

import { createHash } from "crypto";

/**
 * Normalizes text by trimming whitespace, normalizing Unicode, and stripping non-printable characters
 */
export function normalizeText(text: string): string {
  if (!text) return "";
  return text
    .normalize("NFKC")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Computes SHA-256 hash of normalized text for exact deduplication
 */
export function computeTextHash(text: string): string {
  const normalized = normalizeText(text).toLowerCase();
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

/**
 * Strips potential author or username fields from raw imported objects
 */
export function sanitizeRawRecordData<T extends Record<string, unknown>>(data: T): Omit<T, "author" | "username" | "user" | "author_name"> {
  const sanitized = { ...data };
  delete sanitized.author;
  delete sanitized.username;
  delete sanitized.user;
  delete sanitized.author_name;
  return sanitized;
}

/**
 * Calculates dice coefficient / ngram similarity between two strings (0.0 to 1.0)
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1).toLowerCase();
  const s2 = normalizeText(str2).toLowerCase();

  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0.0;

  const getBigrams = (str: string) => {
    const bigrams = new Map<string, number>();
    for (let i = 0; i < str.length - 1; i++) {
      const bigram = str.substring(i, i + 2);
      bigrams.set(bigram, (bigrams.get(bigram) || 0) + 1);
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);

  let intersection = 0;
  for (const [bigram, count1] of b1.entries()) {
    if (b2.has(bigram)) {
      intersection += Math.min(count1, b2.get(bigram)!);
    }
  }

  const total = (s1.length - 1) + (s2.length - 1);
  return (2.0 * intersection) / total;
}
