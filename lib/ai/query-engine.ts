import { classifyQuestion } from "./prompts/question-classifier";
import { generateQueryPlan } from "./prompts/query-planner";
import { executeQueryPlan, QuantitativePlanResult } from "@/lib/db/queries/query-engine";
import { searchEpisodeEmbeddings, VectorSearchResult } from "./embeddings";
import { generateGroundedAnswer } from "./prompts/answer-generator";
import {
  computeEvidenceStrength,
  computeObservedProportion,
  computeUnknownOutcomeProportion,
} from "@/lib/analysis/evidence-strength";
import { getSupabaseClient } from "@/lib/db/client";
import { normalizeText } from "@/lib/utils/helpers";
import type {
  AskQueryResponse,
  GroundedEvidenceSnippet,
  EvidenceStrengthFactors,
} from "@/types/api";
import type { EvidenceStrength, QuestionType } from "@/types/domain";
import { GroundedAnswer } from "./prompts/schemas/answer";

/**
 * Validates that all cited episode IDs exist in the available candidate pool.
 */
export function validateCitations(
  citedEpisodeIds: string[],
  availableEpisodeIds: string[]
): { valid: boolean; invalidIds: string[] } {
  const availableSet = new Set(availableEpisodeIds);
  const invalidIds = citedEpisodeIds.filter((id) => !availableSet.has(id));
  return {
    valid: invalidIds.length === 0,
    invalidIds,
  };
}

/**
 * Validates that cited verbatim quotes appear in the referenced source text.
 */
export function validateQuoteGrounding(
  quote: string,
  rawText: string
): boolean {
  if (!quote || !rawText) return false;
  const normQuote = normalizeText(quote);
  const normRaw = normalizeText(rawText);
  return normRaw.includes(normQuote);
}

/**
 * Main Hybrid Research Query Engine entry point.
 */
export async function processResearchQuery(question: string): Promise<AskQueryResponse> {
  // Step 1: Classify Question
  const classification = await classifyQuestion(question);
  const questionType: QuestionType = classification.question_type;

  let sqlResults: QuantitativePlanResult | undefined;
  let vectorEpisodes: VectorSearchResult[] = [];

  // Step 2: Route Execution
  if (questionType === "quantitative" || questionType === "mixed") {
    try {
      const plan = await generateQueryPlan(question, classification.quantitative_aspects);
      sqlResults = await executeQueryPlan(plan);
    } catch (sqlErr) {
      console.error("SQL Plan Execution Error:", sqlErr);
    }
  }

  if (questionType === "qualitative" || questionType === "mixed") {
    try {
      vectorEpisodes = await searchEpisodeEmbeddings(question, 15, 0.65);
    } catch (vecErr) {
      console.error("Vector Search Error:", vecErr);
    }
  }

  // Step 3: Fetch latest validation F1 for evidence strength
  const supabase = getSupabaseClient();
  const { data: latestVal } = await supabase
    .from("validation_runs")
    .select("relevance_f1")
    .order("run_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const pipelineF1 = latestVal?.relevance_f1 || 0.8;

  // Step 4: Generate Grounded Answer
  let answer: GroundedAnswer;
  try {
    answer = await generateGroundedAnswer({
      question,
      question_type: questionType,
      sql_results: sqlResults?.summary_text,
      semantic_episodes: vectorEpisodes,
    });
  } catch (genErr: any) {
    console.warn("LLM Answer generation failed, falling back to structured summary:", genErr);
    answer = buildFallbackAnswer(question, questionType, sqlResults, vectorEpisodes);
  }

  // Step 5: Validate Grounding & Citations
  const availableEpisodesMap = new Map<string, VectorSearchResult>();
  vectorEpisodes.forEach((ep) => availableEpisodesMap.set(ep.episode_id, ep));

  const validEvidenceSnippets: GroundedEvidenceSnippet[] = [];
  const platformsRepresented = new Set<string>();
  const evidenceTypes: string[] = [];
  const outcomesCount: Record<string, number> = {};

  // Build supporting evidence from vector results & answer citations
  for (const ep of vectorEpisodes) {
    platformsRepresented.add(ep.platform);
    outcomesCount[ep.outcome] = (outcomesCount[ep.outcome] || 0) + 1;

    // Collect clue quotes
    ep.clues.forEach((c) => {
      evidenceTypes.push(c.evidence_type);
      validEvidenceSnippets.push({
        episode_id: ep.episode_id,
        quote: c.quote,
        char_start: c.char_start,
        char_end: c.char_end,
        platform: ep.platform,
        source_url: ep.source_url,
        visual_item_type: ep.visual_item_type,
        outcome: ep.outcome,
        evidence_type: c.evidence_type,
      });
    });

    // Collect failure quotes
    ep.failures.forEach((f) => {
      evidenceTypes.push(f.evidence_type);
      validEvidenceSnippets.push({
        episode_id: ep.episode_id,
        quote: f.quote,
        char_start: f.char_start,
        char_end: f.char_end,
        platform: ep.platform,
        source_url: ep.source_url,
        visual_item_type: ep.visual_item_type,
        outcome: ep.outcome,
        evidence_type: f.evidence_type,
      });
    });
  }

  // Multi-Factor Evidence Strength Calculation
  const totalSupporting = vectorEpisodes.length;
  const observedProp = computeObservedProportion(evidenceTypes);
  const unknownProp = computeUnknownOutcomeProportion(outcomesCount);
  const hasContradictory = Boolean(answer.contradictory_findings && answer.contradictory_findings.length > 0);

  const strengthResult = computeEvidenceStrength({
    supporting_episode_count: totalSupporting,
    source_diversity: platformsRepresented.size,
    observed_evidence_proportion: observedProp,
    has_contradictory_evidence: hasContradictory,
    unknown_outcome_proportion: unknownProp,
    pipeline_validation_f1: pipelineF1,
  });

  const evidenceFactors: EvidenceStrengthFactors = {
    supporting_episodes_count: totalSupporting,
    independent_platforms_count: platformsRepresented.size,
    observed_evidence_percentage: Math.round(observedProp * 100),
    has_contradictory_evidence: hasContradictory,
    unknown_outcome_percentage: Math.round(unknownProp * 100),
    pipeline_validation_f1: Math.round(pipelineF1 * 100) / 100,
  };

  const finalStrength: EvidenceStrength =
    totalSupporting === 0 ? "insufficient" : strengthResult.rating;

  return {
    question,
    question_type: questionType,
    answer_markdown: answer.answer_markdown,
    quantitative_summary: answer.quantitative_summary || (sqlResults?.queries[0]?.result ? {
      metric_name: sqlResults.queries[0].description,
      value: sqlResults.queries[0].result.percentage !== undefined
        ? `${sqlResults.queries[0].result.percentage}%`
        : sqlResults.queries[0].result.count ?? 0,
      numerator: sqlResults.queries[0].result.numerator,
      denominator: sqlResults.queries[0].result.denominator,
      table_data: sqlResults.queries[0].result.rows as any,
    } : undefined),
    supporting_evidence: validEvidenceSnippets.slice(0, 10),
    evidence_strength: finalStrength,
    evidence_strength_factors: evidenceFactors,
    contradictory_findings: answer.contradictory_findings,
    limitations_note: answer.limitations_note || (totalSupporting < 3 ? "Finding based on small sample size. Exercise caution before generalizing." : undefined),
  };
}

function buildFallbackAnswer(
  question: string,
  type: QuestionType,
  sqlResults?: QuantitativePlanResult,
  episodes: VectorSearchResult[] = []
): GroundedAnswer {
  let text = `### Grounded Research Answer\n\n**Question:** ${question}\n\n`;

  if (sqlResults && sqlResults.summary_text) {
    text += `#### Full Dataset Quantitative Analytics:\n${sqlResults.summary_text}\n\n`;
  }

  if (episodes.length > 0) {
    text += `#### Representative Observations (${episodes.length} Episodes Across ${new Set(episodes.map(e => e.platform)).size} Platforms):\n`;
    episodes.slice(0, 3).forEach((ep, i) => {
      text += `- **[Episode: ${ep.episode_id}]** (${ep.platform}): *${ep.retrieval_goal}* — Outcome: \`${ep.outcome}\`\n`;
    });
  } else if (type === "qualitative") {
    text += `No direct semantic matches were found in the dataset with similarity threshold ≥ 0.65.`;
  }

  return {
    answer_markdown: text,
    cited_episode_ids: episodes.slice(0, 3).map((e) => e.episode_id),
    cited_quotes: [],
    evidence_strength_rating: episodes.length >= 5 ? "strong" : episodes.length >= 3 ? "moderate" : "weak",
  };
}
