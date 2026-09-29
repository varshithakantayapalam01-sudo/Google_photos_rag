/**
 * Google Gemini AI API client wrapper
 */

import { GoogleGenAI } from "@google/genai";

let geminiClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY environment variable.");
    }
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

export function getClassificationModelName(): string {
  return process.env.GEMINI_MODEL_CLASSIFICATION || "gemini-3.5-flash-lite";
}

export function getExtractionModelName(): string {
  return process.env.GEMINI_MODEL_EXTRACTION || "gemini-3.8-flash";
}

export function getSynthesisModelName(): string {
  return process.env.GEMINI_MODEL_SYNTHESIS || "gemini-3.8-flash";
}

export function getEmbeddingModelName(): string {
  return process.env.GEMINI_MODEL_EMBEDDING || "gemini-embedding-2";
}

export function getEmbeddingDimensions(): number {
  return parseInt(process.env.GEMINI_EMBEDDING_DIMENSIONS || "768", 10);
}
