import { z } from "zod";
import { getGeminiClient, getClassificationModelName } from "../client";
import type { QuestionType } from "@/types/domain";

export const QuestionClassificationResultSchema = z.object({
  question_type: z.enum(["quantitative", "qualitative", "mixed"]),
  quantitative_aspects: z.array(z.string()).default([]),
  qualitative_aspects: z.array(z.string()).default([]),
  classification_basis: z.string(),
});

export type QuestionClassificationResult = z.infer<typeof QuestionClassificationResultSchema>;

export const QUESTION_CLASSIFIER_PROMPT_VERSION = "1.0";

/**
 * Builds system & user prompt for question classification
 */
export function buildQuestionClassifierPrompt(question: string): string {
  return `You are a query router for a Google Photos behavioral research knowledge engine.
Your task is to classify user research questions into one of three execution categories:

1. "quantitative"
   - Signal: Questions asking for counts, percentages, failure rates, frequencies, distributions, comparisons, rankings, or statistical metrics across the dataset.
   - Example: "How many users complain about screenshot retrieval?", "What is the most common failure mode?", "What percentage of searches fail?"

2. "qualitative"
   - Signal: Questions asking what, how, why, seeking user quotes, narratives, psychological motivations, specific retrieval scenarios, or verbatim examples without requiring statistical aggregations.
   - Example: "What do users remember when searching for travel photos?", "How do users describe their frustration when finding receipts?", "Give me examples of manual scroll workarounds."

3. "mixed"
   - Signal: Questions that combine both quantitative metrics (counts, rates, comparisons) AND qualitative behavioral narrative or quote requests.
   - Example: "Compare failure rates between screenshots and documents and explain what users typically forget.", "How often does keyword stuffing happen and why do users do it?"

USER QUESTION:
"${question}"

Respond with ONLY a JSON object matching this schema:
{
  "question_type": "quantitative" | "qualitative" | "mixed",
  "quantitative_aspects": ["list of metrics/counts needed"],
  "qualitative_aspects": ["list of behavioral/narrative aspects needed"],
  "classification_basis": "short explanation"
}`;
}

/**
 * Fast deterministic heuristic classifier used for testing and instantaneous pre-filtering.
 */
export function classifyQuestionHeuristic(question: string): QuestionClassificationResult {
  const q = question.toLowerCase().trim();

  const quantKeywords = [
    "how many",
    "percentage",
    "percent",
    "rate",
    "distribution",
    "frequency",
    "count",
    "number of",
    "how often",
    "most common",
    "top",
    "proportion",
    "stats",
    "statistics",
    "average",
    "compare",
    "vs",
  ];

  const qualKeywords = [
    "what do users remember",
    "why",
    "how do users",
    "describe",
    "explain",
    "quote",
    "example",
    "narrative",
    "story",
    "experience",
    "frustration",
    "workaround",
    "sentiment",
    "feel",
  ];

  const hasQuant = quantKeywords.some((k) => q.includes(k));
  const hasQual = qualKeywords.some((k) => q.includes(k));

  if (hasQuant && hasQual) {
    return {
      question_type: "mixed",
      quantitative_aspects: ["Dataset counts / percentages related to query terms"],
      qualitative_aspects: ["Verbatim quotes and context explaining behavior"],
      classification_basis: "Question requests both statistical aggregations and qualitative narrative/examples.",
    };
  }

  if (hasQuant) {
    return {
      question_type: "quantitative",
      quantitative_aspects: ["Statistical aggregations and frequency distribution"],
      qualitative_aspects: [],
      classification_basis: "Question asks for counts, rates, or distributions across dataset.",
    };
  }

  return {
    question_type: "qualitative",
    quantitative_aspects: [],
    qualitative_aspects: ["Semantic context and grounded retrieval episodes"],
    classification_basis: "Question asks for descriptive behaviors, retrieval context, or user quotes.",
  };
}

/**
 * Classifies a user question using Gemini LLM with fallback to heuristic classification.
 */
export async function classifyQuestion(question: string): Promise<QuestionClassificationResult> {
  try {
    const gemini = getGeminiClient();
    const modelName = getClassificationModelName();
    const prompt = buildQuestionClassifierPrompt(question);

    const response = await gemini.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const text = response.text || "";
    const parsed = JSON.parse(text);
    return QuestionClassificationResultSchema.parse(parsed);
  } catch (err) {
    console.warn("LLM question classification fallback to heuristic:", err);
    return classifyQuestionHeuristic(question);
  }
}
