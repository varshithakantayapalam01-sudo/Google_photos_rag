/**
 * Opportunity Generation Engine
 *
 * Generates research opportunities with:
 * - Deterministic SQL measurable dimensions (all using COUNT(DISTINCT episode_id))
 * - Explicit denominators for rates
 * - Multi-factor evidence strength (separate from extraction confidence)
 * - LLM qualitative synthesis (no LLM scoring)
 */

import { getEpisodeDataForOpportunities, getFailurePatternsByItemType } from "./patterns";
import {
  computeEvidenceStrength,
  computeObservedProportion,
  computeUnknownOutcomeProportion,
  type EvidenceStrengthInput,
} from "./evidence-strength";
import { insertOpportunity } from "@/lib/db/queries/opportunities";
import { getSupabaseClient } from "@/lib/db/client";
import { getGeminiClient, getSynthesisModelName } from "@/lib/ai/client";
import {
  buildOpportunitySynthesisPrompt,
  OPPORTUNITY_SYNTH_PROMPT_VERSION,
} from "@/lib/ai/prompts/opportunity-synth";
import type { Opportunity } from "@/types/database";
import type { EvidenceStrength } from "@/types/domain";

export interface OpportunityMetrics {
  supporting_episode_count: number;
  total_relevant_episodes: number;
  dataset_percentage: number;
  source_diversity: number;
  failure_rate: number | null;
  failure_rate_denominator: number | null;
  abandonment_rate: number | null;
  abandonment_rate_denominator: number | null;
  multi_attempt_rate: number | null;
  multi_attempt_denominator: number | null;
  workaround_rate: number | null;
  manual_scroll_rate: number | null;
  unknown_outcome_count: number | null;
  evidence_strength: EvidenceStrength;
}

interface EpisodeData {
  id: string;
  visual_item_type: string;
  outcome: string;
  platform: string;
  clue_categories: string[];
  forgotten_categories: string[];
  failure_types: string[];
  workaround_types: string[];
  search_behavior_count: number;
  evidence_types: string[];
}

/**
 * Compute all deterministic SQL measurable dimensions for a set of supporting episodes.
 *
 * Metric formulas (all using DISTINCT episode_id):
 * - dataset_percentage = supporting / total_relevant × 100
 * - failure_rate = outcome=failure / known_outcome_count × 100
 * - abandonment_rate = outcome=abandoned / known_outcome_count × 100
 * - multi_attempt_rate = episodes with ≥2 search behaviors / episodes with ≥1 behavior × 100
 * - workaround_rate = episodes with ≥1 workaround / all supporting × 100
 * - manual_scroll_rate = episodes with manual_scroll workaround / all supporting × 100
 */
export function computeOpportunityMetrics(
  supportingEpisodes: EpisodeData[],
  totalRelevantEpisodes: number,
  pipelineF1: number
): OpportunityMetrics {
  const count = supportingEpisodes.length;

  // Dataset percentage
  const dataset_percentage =
    totalRelevantEpisodes > 0
      ? (count / totalRelevantEpisodes) * 100
      : 0;

  // Source platform diversity
  const platforms = new Set(supportingEpisodes.map((e) => e.platform));
  const source_diversity = platforms.size;

  // Outcome counts
  const outcomeCounts: Record<string, number> = {};
  supportingEpisodes.forEach((e) => {
    outcomeCounts[e.outcome] = (outcomeCounts[e.outcome] || 0) + 1;
  });

  // Known outcome = total - unknown
  const unknown_outcome_count = outcomeCounts["unknown"] || 0;
  const known_outcome_count = count - unknown_outcome_count;

  // Failure rate: outcome=failure / known_outcome (excludes unknown)
  const failure_count = outcomeCounts["failure"] || 0;
  const failure_rate =
    known_outcome_count > 0
      ? (failure_count / known_outcome_count) * 100
      : null;
  const failure_rate_denominator = known_outcome_count > 0 ? known_outcome_count : null;

  // Abandonment rate: outcome=abandoned / known_outcome (excludes unknown)
  const abandoned_count = outcomeCounts["abandoned"] || 0;
  const abandonment_rate =
    known_outcome_count > 0
      ? (abandoned_count / known_outcome_count) * 100
      : null;
  const abandonment_rate_denominator = known_outcome_count > 0 ? known_outcome_count : null;

  // Multi-attempt rate: episodes with ≥2 search behaviors / episodes with ≥1 behavior
  const episodesWithBehavior = supportingEpisodes.filter(
    (e) => e.search_behavior_count >= 1
  );
  const episodesMultiAttempt = supportingEpisodes.filter(
    (e) => e.search_behavior_count >= 2
  );
  const multi_attempt_rate =
    episodesWithBehavior.length > 0
      ? (episodesMultiAttempt.length / episodesWithBehavior.length) * 100
      : null;
  const multi_attempt_denominator =
    episodesWithBehavior.length > 0 ? episodesWithBehavior.length : null;

  // Workaround rate: episodes with ≥1 workaround / all supporting
  const episodesWithWorkaround = supportingEpisodes.filter(
    (e) => e.workaround_types.length >= 1
  );
  const workaround_rate =
    count > 0
      ? (episodesWithWorkaround.length / count) * 100
      : null;

  // Manual scroll rate: episodes with manual_scroll / all supporting
  const episodesWithManualScroll = supportingEpisodes.filter((e) =>
    e.workaround_types.includes("manual_scroll")
  );
  const manual_scroll_rate =
    count > 0
      ? (episodesWithManualScroll.length / count) * 100
      : null;

  // Evidence strength computation
  const allEvidenceTypes = supportingEpisodes.flatMap((e) => e.evidence_types);
  const observed_proportion = computeObservedProportion(allEvidenceTypes);
  const unknown_proportion = computeUnknownOutcomeProportion(outcomeCounts);

  const strengthInput: EvidenceStrengthInput = {
    supporting_episode_count: count,
    source_diversity,
    observed_evidence_proportion: observed_proportion,
    has_contradictory_evidence: false, // Default: no contradictions detected programmatically
    unknown_outcome_proportion: unknown_proportion,
    pipeline_validation_f1: pipelineF1,
  };

  const strengthResult = computeEvidenceStrength(strengthInput);

  return {
    supporting_episode_count: count,
    total_relevant_episodes: totalRelevantEpisodes,
    dataset_percentage: Math.round(dataset_percentage * 10) / 10,
    source_diversity,
    failure_rate: failure_rate != null ? Math.round(failure_rate * 10) / 10 : null,
    failure_rate_denominator,
    abandonment_rate: abandonment_rate != null ? Math.round(abandonment_rate * 10) / 10 : null,
    abandonment_rate_denominator,
    multi_attempt_rate: multi_attempt_rate != null ? Math.round(multi_attempt_rate * 10) / 10 : null,
    multi_attempt_denominator,
    workaround_rate: workaround_rate != null ? Math.round(workaround_rate * 10) / 10 : null,
    manual_scroll_rate: manual_scroll_rate != null ? Math.round(manual_scroll_rate * 10) / 10 : null,
    unknown_outcome_count,
    evidence_strength: strengthResult.rating,
  };
}

export interface OpportunityGenerationResult {
  opportunities_generated: number;
  errors: string[];
}

/**
 * Run full opportunity generation pipeline:
 * 1. Discover failure patterns
 * 2. Compute deterministic metrics for each pattern
 * 3. Generate qualitative synthesis via LLM
 * 4. Persist opportunities with evidence links
 */
export async function generateOpportunities(): Promise<OpportunityGenerationResult> {
  const errors: string[] = [];

  // Fetch all episode data
  const { totalRelevantEpisodes, episodes } = await getEpisodeDataForOpportunities();

  if (episodes.length === 0) {
    return { opportunities_generated: 0, errors: ["No episodes found"] };
  }

  // Get latest validation F1 for evidence strength
  const supabase = getSupabaseClient();
  const { data: latestVal } = await supabase
    .from("validation_runs")
    .select("relevance_f1")
    .order("run_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  const pipelineF1 = latestVal?.relevance_f1 || 0;

  // Discover failure patterns
  const failurePatterns = await getFailurePatternsByItemType();

  // Filter to meaningful patterns (≥3 episodes)
  const significantPatterns = failurePatterns.filter((p) => p.episode_count >= 3);

  let opportunitiesGenerated = 0;

  for (const pattern of significantPatterns) {
    try {
      // Get supporting episodes for this pattern
      const supportingEpisodes = episodes.filter((e) =>
        pattern.episode_ids.includes(e.id)
      );

      if (supportingEpisodes.length === 0) continue;

      // Compute deterministic metrics
      const metrics = computeOpportunityMetrics(
        supportingEpisodes,
        totalRelevantEpisodes,
        pipelineF1
      );

      // Build summary fields from supporting episodes
      const clueCategories = new Set<string>();
      const forgottenCategories = new Set<string>();
      const workaroundTypes = new Set<string>();
      supportingEpisodes.forEach((e) => {
        e.clue_categories.forEach((c) => clueCategories.add(c));
        e.forgotten_categories.forEach((f) => forgottenCategories.add(f));
        e.workaround_types.forEach((w) => workaroundTypes.add(w));
      });

      const title = `${formatLabel(pattern.visual_item_type)} — ${formatLabel(pattern.failure_type)} Failure`;
      const retrieval_scenario = `Users attempting to find ${formatLabel(pattern.visual_item_type)} items experience ${formatLabel(pattern.failure_type)} failures`;

      // Attempt LLM qualitative synthesis
      let qualitative = {
        observed_consequence: null as string | null,
        root_cause_hypothesis: `${formatLabel(pattern.failure_type)} failure occurs during retrieval of ${formatLabel(pattern.visual_item_type)} items`,
        alternative_explanations: null as string | null,
        potential_ai_leverage: null as string | null,
        uncertainty: null as string | null,
      };

      try {
        qualitative = await synthesizeOpportunityQualitative({
          title,
          retrieval_scenario,
          target_type: pattern.visual_item_type,
          remembered_info_summary: Array.from(clueCategories).map(formatLabel).join(", ") || "None identified",
          forgotten_info_summary: Array.from(forgottenCategories).map(formatLabel).join(", ") || "None identified",
          failure_stage: pattern.failure_type,
          observed_behavior: `${supportingEpisodes.length} episodes with ${formatLabel(pattern.failure_type)} failure, ${pattern.outcomes["failure"] || 0} resulting in failure outcome`,
          current_workaround: workaroundTypes.size > 0 ? Array.from(workaroundTypes).map(formatLabel).join(", ") : null,
          typical_outcome: getMostCommonOutcome(pattern.outcomes),
          supporting_episode_count: metrics.supporting_episode_count,
          dataset_percentage: metrics.dataset_percentage,
          failure_rate: metrics.failure_rate,
        });
      } catch (synthErr: any) {
        errors.push(`LLM synthesis failed for ${title}: ${synthErr.message}`);
      }

      // Build opportunity record
      const opportunityData: Omit<Opportunity, "id" | "generated_at"> = {
        title,
        retrieval_scenario,
        target_type: pattern.visual_item_type,
        remembered_info_summary: Array.from(clueCategories).map(formatLabel).join(", ") || "None identified",
        forgotten_info_summary: Array.from(forgottenCategories).map(formatLabel).join(", ") || "None identified",
        failure_stage: pattern.failure_type,
        observed_behavior: `${supportingEpisodes.length} episodes with ${formatLabel(pattern.failure_type)} failure`,
        current_workaround: workaroundTypes.size > 0 ? Array.from(workaroundTypes).map(formatLabel).join(", ") : null,
        typical_outcome: getMostCommonOutcome(pattern.outcomes),
        ...metrics,
        observed_consequence: qualitative.observed_consequence,
        root_cause_hypothesis: qualitative.root_cause_hypothesis,
        alternative_explanations: qualitative.alternative_explanations,
        potential_ai_leverage: qualitative.potential_ai_leverage,
        uncertainty: qualitative.uncertainty,
        model_version: getSynthesisModelName(),
        prompt_version: OPPORTUNITY_SYNTH_PROMPT_VERSION,
        schema_version: "1.0",
      };

      await insertOpportunity(opportunityData, pattern.episode_ids);
      opportunitiesGenerated++;
    } catch (err: any) {
      errors.push(`Failed to generate opportunity for ${pattern.group_key}: ${err.message}`);
    }
  }

  return {
    opportunities_generated: opportunitiesGenerated,
    errors,
  };
}

/**
 * LLM qualitative synthesis for a single opportunity
 */
async function synthesizeOpportunityQualitative(context: {
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
}): Promise<{
  observed_consequence: string | null;
  root_cause_hypothesis: string;
  alternative_explanations: string | null;
  potential_ai_leverage: string | null;
  uncertainty: string | null;
}> {
  const client = getGeminiClient();
  const modelName = getSynthesisModelName();

  const prompt = buildOpportunitySynthesisPrompt({
    ...context,
    sample_quotes: [], // Could be enriched with actual quotes in future
  });

  const response = await client.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
  });

  const text = response.text || "";
  const parsed = JSON.parse(text);

  return {
    observed_consequence: parsed.observed_consequence || null,
    root_cause_hypothesis: parsed.root_cause_hypothesis || `${formatLabel(context.failure_stage)} failure in ${formatLabel(context.target_type)} retrieval`,
    alternative_explanations: parsed.alternative_explanations || null,
    potential_ai_leverage: parsed.potential_ai_leverage || null,
    uncertainty: parsed.uncertainty || null,
  };
}

function getMostCommonOutcome(outcomes: Record<string, number>): string {
  let max = 0;
  let result = "unknown";
  for (const [outcome, count] of Object.entries(outcomes)) {
    if (count > max) {
      max = count;
      result = outcome;
    }
  }
  return result;
}

function formatLabel(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
