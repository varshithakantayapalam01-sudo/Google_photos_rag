/**
 * Gold Dataset Validation & Benchmark Evaluation Engine (Phase 5)
 * Computes Precision, Recall, F1, Episode Count Agreement, Jaccard Clue Similarity,
 * Failure Mode Agreement, and Outcome Agreement across Development and Holdout splits.
 */

import { getSupabaseAdminClient } from "@/lib/db/client";
import { insertValidationRun } from "@/lib/db/queries/gold";
import { matchEpisodesForRecord, EpisodeMatchResult } from "./matcher";
import {
  GoldRecord,
  GoldEpisodeLabel,
  RetrievalEpisode,
  RelevanceClassification,
  DatasetSplit,
  ValidationRun,
} from "@/types/database";

export interface SplitMetrics {
  record_count: number;
  relevant_gold_count: number;
  irrelevant_gold_count: number;
  gold_episode_count: number;
  ai_episode_count: number;
  // Confusion matrix for relevance
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  relevance_precision: number;
  relevance_recall: number;
  relevance_f1: number;
  // Episode agreement metrics
  episode_count_agreement: number; // 0-1
  clue_extraction_agreement: number; // 0-1 Jaccard average
  failure_mode_agreement: number; // 0-1
  outcome_agreement: number; // 0-1
  matched_episodes_count: number;
  unmatched_gold_episodes: number;
  unmatched_ai_episodes: number;
}

export interface EvaluationResult {
  run_id?: string;
  run_date: string;
  model_version: string;
  prompt_version: string;
  schema_version: string;
  development: SplitMetrics;
  holdout: SplitMetrics;
  combined: SplitMetrics;
  matches: EpisodeMatchResult[];
  directional_notice: string;
}

/**
 * Calculates Jaccard similarity between two sets of categories
 */
export function calculateJaccardSimilarity(arr1: string[], arr2: string[]): number {
  if (arr1.length === 0 && arr2.length === 0) return 1.0;
  if (arr1.length === 0 || arr2.length === 0) return 0.0;

  const set1 = new Set(arr1.map((s) => s.trim().toLowerCase()));
  const set2 = new Set(arr2.map((s) => s.trim().toLowerCase()));

  const intersection = [...set1].filter((item) => set2.has(item)).length;
  const union = new Set([...set1, ...set2]).size;

  return union > 0 ? intersection / union : 0.0;
}

/**
 * Calculates precision, recall, and F1 from confusion matrix
 */
export function calculateRelevanceMetrics(tp: number, fp: number, tn: number, fn: number) {
  const precision = tp + fp > 0 ? tp / (tp + fp) : tp === 0 && fp === 0 ? 1.0 : 0.0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : tp === 0 && fn === 0 ? 1.0 : 0.0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0.0;

  return {
    precision: Math.round(precision * 10000) / 10000,
    recall: Math.round(recall * 10000) / 10000,
    f1: Math.round(f1 * 10000) / 10000,
  };
}

/**
 * Evaluates a partition of gold records against AI predictions
 */
export function evaluatePartition(
  records: Array<{
    goldRecord: GoldRecord;
    goldEpisodes: GoldEpisodeLabel[];
    aiClassification: RelevanceClassification | null;
    aiEpisodes: Array<RetrievalEpisode & { remembered_clues?: Array<{ clue_category: string }>; failure_modes?: Array<{ failure_type: string }> }>;
  }>,
  manualOverrides: Record<string, string> = {}
): { metrics: SplitMetrics; matches: EpisodeMatchResult[] } {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  let relevantGoldCount = 0;
  let irrelevantGoldCount = 0;
  let goldEpisodeCount = 0;
  let aiEpisodeCount = 0;

  let episodeCountAgreementMatches = 0;
  let totalRelevantRecordsEvaluated = 0;

  let clueJaccardSum = 0;
  let cluePairCount = 0;

  let failureMatches = 0;
  let failurePairCount = 0;

  let outcomeMatches = 0;
  let outcomePairCount = 0;

  let matchedPairsCount = 0;
  let unmatchedGoldCount = 0;
  let unmatchedAiCount = 0;

  const allMatches: EpisodeMatchResult[] = [];

  for (const item of records) {
    const goldIsRelevant = item.goldRecord.is_relevant;
    const aiIsRelevant = item.aiClassification ? item.aiClassification.is_relevant : false;

    if (goldIsRelevant) relevantGoldCount++;
    else irrelevantGoldCount++;

    goldEpisodeCount += item.goldEpisodes.length;
    aiEpisodeCount += item.aiEpisodes.length;

    // Relevance confusion matrix
    if (goldIsRelevant && aiIsRelevant) tp++;
    else if (!goldIsRelevant && aiIsRelevant) fp++;
    else if (!goldIsRelevant && !aiIsRelevant) tn++;
    else if (goldIsRelevant && !aiIsRelevant) fn++;

    // Episode Agreement (only for gold relevant records)
    if (goldIsRelevant) {
      totalRelevantRecordsEvaluated++;
      if (item.goldRecord.expected_episode_count === item.aiEpisodes.length) {
        episodeCountAgreementMatches++;
      }

      // Match episodes
      const matchRes = matchEpisodesForRecord(item.goldEpisodes, item.aiEpisodes, manualOverrides);
      allMatches.push(...matchRes.matches);

      unmatchedGoldCount += matchRes.unmatched_gold_ids.length;
      unmatchedAiCount += matchRes.unmatched_ai_ids.length;

      for (const m of matchRes.matches) {
        if (m.ai_episode_id) {
          matchedPairsCount++;
          const goldEp = item.goldEpisodes.find((g) => g.id === m.gold_episode_id);
          const aiEp = item.aiEpisodes.find((a) => a.id === m.ai_episode_id);

          if (goldEp && aiEp) {
            // Clue extraction Jaccard
            const goldClues = (Array.isArray(goldEp.remembered_clues) ? goldEp.remembered_clues : []).map((c: any) => c.clue_category || "");
            const aiClues = (Array.isArray(aiEp.remembered_clues) ? aiEp.remembered_clues : []).map((c: any) => c.clue_category || "");
            clueJaccardSum += calculateJaccardSimilarity(goldClues, aiClues);
            cluePairCount++;

            // Outcome agreement
            if (goldEp.outcome && aiEp.outcome) {
              outcomePairCount++;
              if (goldEp.outcome.toLowerCase() === aiEp.outcome.toLowerCase()) {
                outcomeMatches++;
              }
            }

            // Failure mode agreement
            const aiFailure = (aiEp.failure_modes || [])[0]?.failure_type;
            if (goldEp.primary_failure_mode && aiFailure) {
              failurePairCount++;
              if (goldEp.primary_failure_mode.toLowerCase() === aiFailure.toLowerCase()) {
                failureMatches++;
              }
            }
          }
        }
      }
    }
  }

  const { precision, recall, f1 } = calculateRelevanceMetrics(tp, fp, tn, fn);

  const episodeCountAgreement = totalRelevantRecordsEvaluated > 0
    ? Math.round((episodeCountAgreementMatches / totalRelevantRecordsEvaluated) * 10000) / 10000
    : 1.0;

  const clueAgreement = cluePairCount > 0
    ? Math.round((clueJaccardSum / cluePairCount) * 10000) / 10000
    : 1.0;

  const failureAgreement = failurePairCount > 0
    ? Math.round((failureMatches / failurePairCount) * 10000) / 10000
    : 1.0;

  const outcomeAgreement = outcomePairCount > 0
    ? Math.round((outcomeMatches / outcomePairCount) * 10000) / 10000
    : 1.0;

  return {
    metrics: {
      record_count: records.length,
      relevant_gold_count: relevantGoldCount,
      irrelevant_gold_count: irrelevantGoldCount,
      gold_episode_count: goldEpisodeCount,
      ai_episode_count: aiEpisodeCount,
      tp,
      fp,
      tn,
      fn,
      relevance_precision: precision,
      relevance_recall: recall,
      relevance_f1: f1,
      episode_count_agreement: episodeCountAgreement,
      clue_extraction_agreement: clueAgreement,
      failure_mode_agreement: failureAgreement,
      outcome_agreement: outcomeAgreement,
      matched_episodes_count: matchedPairsCount,
      unmatched_gold_episodes: unmatchedGoldCount,
      unmatched_ai_episodes: unmatchedAiCount,
    },
    matches: allMatches,
  };
}

/**
 * Runs complete gold dataset validation across development and holdout splits,
 * computes all precision/recall/F1 metrics, and records the run in validation_runs.
 */
export async function runGoldValidation(
  manualOverrides: Record<string, string> = {}
): Promise<EvaluationResult> {
  const supabase = getSupabaseAdminClient();

  // 1. Fetch all gold records with raw records, episode labels, AI classifications, and AI episodes
  const { data: goldRecordsData, error } = await supabase
    .from("gold_records")
    .select(`
      *,
      gold_episode_labels(*),
      raw_records(
        id,
        raw_text,
        relevance_classifications(*),
        retrieval_episodes(
          *,
          remembered_clues(clue_category),
          failure_modes(failure_type)
        )
      )
    `);

  if (error) throw new Error(`Failed to load gold records for validation: ${error.message}`);

  const records = (goldRecordsData || []).map((g: any) => ({
    goldRecord: {
      id: g.id,
      record_id: g.record_id,
      is_relevant: g.is_relevant,
      dataset_split: g.dataset_split as DatasetSplit,
      expected_episode_count: g.expected_episode_count,
      labeller_notes: g.labeller_notes,
      labelled_at: g.labelled_at,
    },
    goldEpisodes: (g.gold_episode_labels || []) as GoldEpisodeLabel[],
    aiClassification: (g.raw_records?.relevance_classifications?.[0] || null) as RelevanceClassification | null,
    aiEpisodes: (g.raw_records?.retrieval_episodes || []) as any,
  }));

  const devRecords = records.filter((r) => r.goldRecord.dataset_split === "development");
  const holdoutRecords = records.filter((r) => r.goldRecord.dataset_split === "holdout");

  const devResult = evaluatePartition(devRecords, manualOverrides);
  const holdoutResult = evaluatePartition(holdoutRecords, manualOverrides);
  const combinedResult = evaluatePartition(records, manualOverrides);

  const modelVersion = records[0]?.aiClassification?.model_version || "gemini-3.8-flash";
  const promptVersion = records[0]?.aiClassification?.prompt_version || "1.0";
  const schemaVersion = records[0]?.aiClassification?.schema_version || "1.0";

  // 2. Persist validation run in database
  const runPayload = {
    gold_record_count: combinedResult.metrics.record_count,
    gold_episode_count: combinedResult.metrics.gold_episode_count,
    relevance_precision: combinedResult.metrics.relevance_precision,
    relevance_recall: combinedResult.metrics.relevance_recall,
    relevance_f1: combinedResult.metrics.relevance_f1,
    episode_count_agreement: combinedResult.metrics.episode_count_agreement,
    clue_extraction_agreement: combinedResult.metrics.clue_extraction_agreement,
    failure_mode_agreement: combinedResult.metrics.failure_mode_agreement,
    outcome_agreement: combinedResult.metrics.outcome_agreement,
    model_version: modelVersion,
    prompt_version: promptVersion,
    schema_version: schemaVersion,
    details: {
      development: devResult.metrics,
      holdout: holdoutResult.metrics,
      combined: combinedResult.metrics,
    },
    notes: "Automated gold dataset benchmark evaluation across Development (tuning) and Holdout (unbiased) splits.",
  };

  const matchesToInsert = combinedResult.matches.map((m) => ({
    gold_episode_id: m.gold_episode_id,
    ai_episode_id: m.ai_episode_id,
    match_method: m.match_method,
    match_confidence: m.match_confidence,
  }));

  let savedRun: ValidationRun | null = null;
  try {
    savedRun = await insertValidationRun(runPayload, matchesToInsert);
  } catch (dbErr) {
    console.warn("Could not persist validation run to database (continuing with in-memory result):", dbErr);
  }

  return {
    run_id: savedRun?.id,
    run_date: new Date().toISOString(),
    model_version: modelVersion,
    prompt_version: promptVersion,
    schema_version: schemaVersion,
    development: devResult.metrics,
    holdout: holdoutResult.metrics,
    combined: combinedResult.metrics,
    matches: combinedResult.matches,
    directional_notice: "Notice: Holdout validation metrics are evaluated on an unbiased test split to measure generalization before downstream synthesis.",
  };
}
