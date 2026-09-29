import { getGeminiClient, getSynthesisModelName } from "../client";
import { GroundedAnswer, GroundedAnswerSchema } from "./schemas/answer";

export const ANSWER_GENERATOR_PROMPT_VERSION = "1.0";

export function buildAnswerGeneratorPrompt(context: {
  question: string;
  question_type: string;
  sql_results?: string;
  semantic_episodes?: Array<{
    episode_id: string;
    platform: string;
    visual_item_type: string;
    outcome: string;
    retrieval_goal: string;
    raw_text: string;
    clues: Array<{ clue_category: string; quote: string; evidence_type: string }>;
    failures: Array<{ failure_type: string; quote: string; evidence_type: string }>;
  }>;
}): string {
  const episodesText =
    context.semantic_episodes && context.semantic_episodes.length > 0
      ? context.semantic_episodes
          .map((ep, idx) => {
            const clueQuotes = ep.clues.map((c) => `[Clue: ${c.clue_category}] "${c.quote}"`).join(" | ");
            const failQuotes = ep.failures.map((f) => `[Failure: ${f.failure_type}] "${f.quote}"`).join(" | ");
            return `--- EPISODE ${idx + 1} ---
Episode ID: ${ep.episode_id}
Platform: ${ep.platform}
Item Type: ${ep.visual_item_type}
Outcome: ${ep.outcome}
Goal: ${ep.retrieval_goal}
Quotes: ${clueQuotes} ${failQuotes}
Raw Text: "${ep.raw_text}"`;
          })
          .join("\n\n")
      : "No semantic episodes retrieved.";

  return `You are a specialized behavioral research assistant for Google Photos product research.
You answer user questions ONLY using the provided evidence from real user conversations and deterministic SQL results.

STRICT GROUNDED RESEARCH RULES:
1. Base EVERY claim strictly on the provided evidence.
2. For QUANTITATIVE claims: use ONLY the SQL query results provided below. NEVER calculate or estimate counts or percentages from sample episodes.
3. For QUALITATIVE claims: cite specific episodes by their exact "Episode ID" and platform.
4. Quote users using their exact verbatim words from the provided quotes or raw text.
5. If contradictory findings exist, report them explicitly.
6. Rate overall evidence strength (NOT model confidence):
   - "strong": ≥5 supporting episodes across ≥3 platforms, mostly directly observed evidence.
   - "moderate": 3–4 supporting episodes across ≥2 platforms.
   - "weak": 1–2 supporting episodes or single platform.
   - "insufficient": 0 relevant sources found.
7. If evidence is insufficient, state that clearly and objectively. Do NOT invent or pull from outside general knowledge.

USER RESEARCH QUESTION:
"${context.question}" (Type: ${context.question_type})

DETERMINISTIC SQL RESULTS (Full Dataset):
${context.sql_results || "No SQL analytics executed for this question."}

RETRIEVED EPISODES & VERBATIM QUOTES:
${episodesText}

OUTPUT FORMAT (JSON):
{
  "answer_markdown": "Full clear grounded answer formatted in Markdown. Cite [Episode: <episode_id>] when referencing quotes or user experiences.",
  "quantitative_summary": {
    "metric_name": "Primary metric name if applicable",
    "value": "Metric value (e.g., 42% or 120 episodes)",
    "numerator": 42,
    "denominator": 100
  },
  "cited_episode_ids": ["uuid-1", "uuid-2"],
  "cited_quotes": [
    { "episode_id": "uuid-1", "quote": "exact quote from text" }
  ],
  "contradictory_findings": ["Any contradictory observations if found"],
  "limitations_note": "Short note on sample coverage or data limitations",
  "evidence_strength_rating": "strong" | "moderate" | "weak" | "insufficient"
}`;
}

export async function generateGroundedAnswer(context: {
  question: string;
  question_type: string;
  sql_results?: string;
  semantic_episodes?: any[];
}): Promise<GroundedAnswer> {
  const gemini = getGeminiClient();
  const modelName = getSynthesisModelName();
  const prompt = buildAnswerGeneratorPrompt(context);

  const response = await gemini.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const text = response.text || "";
  const parsed = JSON.parse(text);
  return GroundedAnswerSchema.parse(parsed);
}
