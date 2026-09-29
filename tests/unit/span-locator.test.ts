/**
 * Unit tests for Deterministic Evidence Span Locator
 * Verifies exact match, case normalization, ambiguous multiple matches, fuzzy sliding window (>=0.90), and not found.
 */

import { describe, it, expect } from "vitest";
import { locateEvidenceSpan } from "@/lib/ai/span-locator";

describe("Deterministic Evidence Span Locator", () => {
  const sampleRawText = `I have been looking everywhere for a picture of my brown dog playing in the snow in Lake Tahoe from winter 2021. 
I searched "dog snow" and "Tahoe dog" in Google Photos but it only returned recent photos of my cat. 
Eventually I gave up and scrolled through 3 years of photos manually.`;

  it("Condition 1: Exact case-sensitive match", () => {
    const quote = 'I searched "dog snow" and "Tahoe dog" in Google Photos';
    const result = locateEvidenceSpan(sampleRawText, quote);

    expect(result.span_status).toBe("matched");
    expect(result.char_start).not.toBeNull();
    expect(result.char_end).not.toBeNull();
    expect(sampleRawText.substring(result.char_start!, result.char_end!)).toBe(quote);
  });

  it("Condition 2: Case-insensitive match", () => {
    const quote = "brown dog playing in the snow in lake tahoe";
    const result = locateEvidenceSpan(sampleRawText, quote);

    expect(result.span_status).toBe("matched");
    expect(result.char_start).not.toBeNull();
    expect(result.char_end).not.toBeNull();
    expect(sampleRawText.substring(result.char_start!, result.char_end!).toLowerCase()).toBe(quote.toLowerCase());
  });

  it("Condition 3: Multiple ambiguous occurrences in raw text", () => {
    const textWithDuplicates = `I searched dog in the app. Then I searched dog again.`;
    const quote = "searched dog";
    const result = locateEvidenceSpan(textWithDuplicates, quote);

    expect(result.span_status).toBe("ambiguous");
    expect(result.char_start).not.toBeNull();
  });

  it("Condition 4: Sliding window fuzzy match (>= 0.90 similarity)", () => {
    // Minor typographical or whitespace discrepancy by LLM
    const slightlyModifiedQuote = "I searched dog snow and Tahoe dog in Google Photos"; // missing inner quotation marks
    const result = locateEvidenceSpan(sampleRawText, slightlyModifiedQuote);

    expect(result.span_status).toBe("matched");
    expect(result.char_start).not.toBeNull();
    expect(result.char_end).not.toBeNull();
    expect(result.similarity).toBeGreaterThanOrEqual(0.90);
  });

  it("Condition 5: Not found / malformed quote", () => {
    const hallucinatedQuote = "I took a flight to Paris and photographed the Eiffel Tower";
    const result = locateEvidenceSpan(sampleRawText, hallucinatedQuote);

    expect(result.span_status).toBe("not_found");
    expect(result.char_start).toBeNull();
    expect(result.char_end).toBeNull();
  });

  it("Handles null, undefined, or empty quotes safely", () => {
    expect(locateEvidenceSpan(sampleRawText, null).span_status).toBe("not_found");
    expect(locateEvidenceSpan(sampleRawText, undefined).span_status).toBe("not_found");
    expect(locateEvidenceSpan(sampleRawText, "   ").span_status).toBe("not_found");
    expect(locateEvidenceSpan("", "test").span_status).toBe("not_found");
  });
});
