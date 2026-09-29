/**
 * Deterministic Evidence Span Locator
 * Locates verbatim and near-match quotes inside raw source text and computes exact character offsets.
 * Flags missing, ambiguous, or near-matched spans.
 */

import { calculateStringSimilarity, normalizeText } from "@/lib/utils/helpers";
import { SpanStatus } from "@/types/domain";

export interface LocatedSpan {
  char_start: number | null;
  char_end: number | null;
  span_status: SpanStatus;
  matched_text?: string;
  similarity?: number;
}

export const FUZZY_MATCH_THRESHOLD = 0.90;

/**
 * Finds all exact start indices of searchStr in sourceText
 */
function findAllIndices(sourceText: string, searchStr: string): number[] {
  if (!searchStr || !sourceText) return [];
  const indices: number[] = [];
  let startIndex = 0;
  while ((startIndex = sourceText.indexOf(searchStr, startIndex)) !== -1) {
    indices.push(startIndex);
    startIndex += searchStr.length;
  }
  return indices;
}

/**
 * Deterministically locates an evidence quote inside the raw source text
 */
export function locateEvidenceSpan(rawText: string, quote: string | null | undefined): LocatedSpan {
  if (!rawText || !quote || typeof quote !== "string" || !quote.trim()) {
    return {
      char_start: null,
      char_end: null,
      span_status: "not_found",
    };
  }

  const cleanQuote = quote.trim();

  // 1. Exact case-sensitive search
  const exactIndices = findAllIndices(rawText, cleanQuote);
  if (exactIndices.length === 1) {
    const start = exactIndices[0];
    return {
      char_start: start,
      char_end: start + cleanQuote.length,
      span_status: "matched",
      matched_text: rawText.substring(start, start + cleanQuote.length),
      similarity: 1.0,
    };
  }

  if (exactIndices.length > 1) {
    const start = exactIndices[0];
    return {
      char_start: start,
      char_end: start + cleanQuote.length,
      span_status: "ambiguous",
      matched_text: rawText.substring(start, start + cleanQuote.length),
      similarity: 1.0,
    };
  }

  // 2. Case-insensitive search
  const lowerRaw = rawText.toLowerCase();
  const lowerQuote = cleanQuote.toLowerCase();
  const caseInsensitiveIndices = findAllIndices(lowerRaw, lowerQuote);

  if (caseInsensitiveIndices.length === 1) {
    const start = caseInsensitiveIndices[0];
    return {
      char_start: start,
      char_end: start + cleanQuote.length,
      span_status: "matched",
      matched_text: rawText.substring(start, start + cleanQuote.length),
      similarity: 1.0,
    };
  }

  if (caseInsensitiveIndices.length > 1) {
    const start = caseInsensitiveIndices[0];
    return {
      char_start: start,
      char_end: start + cleanQuote.length,
      span_status: "ambiguous",
      matched_text: rawText.substring(start, start + cleanQuote.length),
      similarity: 1.0,
    };
  }

  // 3. Punctuation and whitespace-normalized search
  const stripPunctuation = (str: string) => str.replace(/["'“”‘’`]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  const normQuote = stripPunctuation(cleanQuote);
  
  if (normQuote.length >= 5) {
    // Check if substring with normalized quotes matches
    const lowerRaw = rawText.toLowerCase();
    const rawTokens = lowerRaw.split(/(\s+|["'“”‘’`])/);
    
    // Check sliding window across rawText
    const quoteLen = cleanQuote.length;
    let bestSimilarity = 0;
    let bestStart: number | null = null;
    let bestEnd: number | null = null;

    const minWindow = Math.max(5, quoteLen - 15);
    const maxWindow = Math.min(rawText.length, quoteLen + 15);

    for (let w = minWindow; w <= maxWindow; w++) {
      for (let i = 0; i <= rawText.length - w; i++) {
        const candidate = rawText.substring(i, i + w);
        // Direct dice similarity
        const directSim = calculateStringSimilarity(candidate, cleanQuote);
        // Punctuation-stripped similarity
        const punctSim = calculateStringSimilarity(stripPunctuation(candidate), normQuote);
        const similarity = Math.max(directSim, punctSim);

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestStart = i;
          bestEnd = i + w;
        }
      }
    }

    if (bestSimilarity >= FUZZY_MATCH_THRESHOLD && bestStart !== null && bestEnd !== null) {
      return {
        char_start: bestStart,
        char_end: bestEnd,
        span_status: "matched",
        matched_text: rawText.substring(bestStart, bestEnd),
        similarity: bestSimilarity,
      };
    }

    // 4. Quote could not be reliably located
    return {
      char_start: null,
      char_end: null,
      span_status: "not_found",
      similarity: bestSimilarity,
    };
  }

  // 4. Quote could not be reliably located
  return {
    char_start: null,
    char_end: null,
    span_status: "not_found",
  };
}
