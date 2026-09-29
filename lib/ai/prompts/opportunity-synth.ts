/**
 * Opportunity Qualitative Synthesis Prompt
 *
 * Used with gemini-3.8-flash to generate qualitative analysis fields:
 * - observed_consequence
 * - root_cause_hypothesis
 * - alternative_explanations
 * - potential_ai_leverage
 * - uncertainty
 *
 * Does NOT assign any LLM score or rating.
 */

export const OPPORTUNITY_SYNTH_PROMPT_VERSION = "1.0";

export function buildOpportunitySynthesisPrompt(context: {
  title: string;
  retrieval_scenario: string;
  target_type: string;
  remembered_info_summary: string;
  forgotten_info_summary: string;
  failure_stage: string;
  observed_behavior: string;
  current_workaround: string | null;
  typical_outcome: string;
  supporting_episode_count: number;
  dataset_percentage: number;
  failure_rate: number | null;
  sample_quotes: string[];
}): string {
  const quotesSection = context.sample_quotes.length > 0
    ? `Sample user quotes from supporting episodes:\n${context.sample_quotes.map((q, i) => `  ${i + 1}. "${q}"`).join("\n")}`
    : "No sample quotes available.";

  return `You are a UX research analyst synthesizing qualitative findings from a structured analysis of user retrieval behavior patterns in Google Photos.

CONTEXT:
- Title: ${context.title}
- Scenario: ${context.retrieval_scenario}
- Target visual item type: ${context.target_type}
- What users remember: ${context.remembered_info_summary}
- What users forget: ${context.forgotten_info_summary}
- Primary failure stage: ${context.failure_stage}
- Observed behavior: ${context.observed_behavior}
- Current workaround: ${context.current_workaround || "None identified"}
- Typical outcome: ${context.typical_outcome}
- Supporting episodes: ${context.supporting_episode_count} (${context.dataset_percentage.toFixed(1)}% of dataset)
- Failure rate: ${context.failure_rate != null ? `${context.failure_rate.toFixed(1)}%` : "N/A"}

${quotesSection}

TASK:
Provide a structured qualitative synthesis with the following fields. Be grounded in the evidence above. Do NOT assign any numerical score, rating, or rank.

Respond with a JSON object containing exactly these fields:
{
  "observed_consequence": "What happens to users when this failure occurs? Describe the concrete impact based on evidence.",
  "root_cause_hypothesis": "What is the most likely root cause of this retrieval failure? Base this on the failure stage and user behavior patterns.",
  "alternative_explanations": "What other explanations could account for this pattern? Consider user skill level, platform limitations, or data gaps.",
  "potential_ai_leverage": "How could AI/ML improvements address this specific failure pattern? Be specific about technical approaches.",
  "uncertainty": "What are the key uncertainties in this analysis? What would we need to validate through primary research?"
}

CRITICAL RULES:
1. Do NOT assign any numerical score, confidence rating, or opportunity priority.
2. Ground all claims in the evidence provided.
3. Distinguish between what is directly observed and what is hypothesized.
4. Be honest about limitations and uncertainties.`;
}
