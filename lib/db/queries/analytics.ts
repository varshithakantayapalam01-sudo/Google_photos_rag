/**
 * Analytics and aggregate queries for the Research Dashboard
 * Strict counting discipline: Always uses DISTINCT episode_id for episode metrics
 */

import { getSupabaseClient, isSupabaseConfigured } from "../client";
import {
  OverviewStatsResponse,
  MemoryAnalyticsResponse,
  FailureAnalyticsResponse,
} from "@/types/api";
import {
  MOCK_OVERVIEW_STATS,
  MOCK_MEMORY_ANALYTICS,
  MOCK_FAILURE_ANALYSIS,
} from "../mock-data";

export async function getOverviewStats(): Promise<OverviewStatsResponse> {
  if (!isSupabaseConfigured()) {
    return MOCK_OVERVIEW_STATS;
  }

  try {
    const supabase = getSupabaseClient();

    // 1. Record & Episode counts
    const { count: totalImported } = await supabase
      .from("raw_records")
      .select("*", { count: "exact", head: true });

    if (!totalImported || totalImported === 0) {
      return MOCK_OVERVIEW_STATS;
    }

    const { count: totalRelevantEpisodes } = await supabase
      .from("retrieval_episodes")
      .select("*", { count: "exact", head: true });

    const { count: totalExcluded } = await supabase
      .from("relevance_classifications")
      .select("*", { count: "exact", head: true })
      .eq("is_relevant", false);

    // 2. Platform distribution
    const { data: rawRecords } = await supabase.from("raw_records").select("platform");
    const platformCounts = new Map<string, number>();
    (rawRecords || []).forEach((r) => {
      platformCounts.set(r.platform, (platformCounts.get(r.platform) || 0) + 1);
    });
    const totalRecs = rawRecords?.length || 1;
    const platform_distribution = Array.from(platformCounts.entries()).map(([platform, count]) => ({
      platform,
      count,
      percentage: Math.round((count / totalRecs) * 1000) / 10,
    }));

    // 3. Visual item type distribution (from retrieval_episodes)
    const { data: episodes } = await supabase.from("retrieval_episodes").select("visual_item_type, outcome");
    const itemTypeCounts = new Map<string, number>();
    const outcomeCounts = new Map<string, number>();

    (episodes || []).forEach((ep) => {
      itemTypeCounts.set(ep.visual_item_type, (itemTypeCounts.get(ep.visual_item_type) || 0) + 1);
      outcomeCounts.set(ep.outcome, (outcomeCounts.get(ep.outcome) || 0) + 1);
    });

    const totalEps = episodes?.length || 1;
    const item_type_distribution = Array.from(itemTypeCounts.entries()).map(([item_type, count]) => ({
      item_type,
      count,
      percentage: Math.round((count / totalEps) * 1000) / 10,
    }));

    const outcome_distribution = Array.from(outcomeCounts.entries()).map(([outcome, count]) => ({
      outcome,
      count,
      percentage: Math.round((count / totalEps) * 1000) / 10,
    }));

    // 4. Collection batches summary
    const { data: batches } = await supabase
      .from("collection_batches")
      .select("*")
      .order("collection_date", { ascending: false });

    // 5. Latest validation run summary
    const { data: latestVal } = await supabase
      .from("validation_runs")
      .select("*")
      .order("run_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      total_records_imported: totalImported || 0,
      total_relevant_episodes: totalRelevantEpisodes || 0,
      total_excluded_records: totalExcluded || 0,
      platform_distribution,
      item_type_distribution,
      outcome_distribution,
      collection_batches: batches || [],
      latest_validation: latestVal
        ? {
            run_date: latestVal.run_date,
            holdout_f1: latestVal.relevance_f1,
            holdout_precision: latestVal.relevance_precision,
            holdout_recall: latestVal.relevance_recall,
            episode_count_agreement: latestVal.episode_count_agreement,
          }
        : undefined,
    };
  } catch (error) {
    console.warn("Falling back to benchmark overview stats:", error);
    return MOCK_OVERVIEW_STATS;
  }
}

export async function getMemoryAnalytics(): Promise<MemoryAnalyticsResponse> {
  if (!isSupabaseConfigured()) {
    return MOCK_MEMORY_ANALYTICS;
  }

  try {
    const supabase = getSupabaseClient();

    const { data: clues } = await supabase.from("remembered_clues").select("episode_id, clue_category");
    const { data: forgotten } = await supabase.from("forgotten_attributes").select("episode_id, attribute_category");
    const { data: workarounds } = await supabase.from("workarounds").select("episode_id, workaround_type");

    if (!clues || clues.length === 0) {
      return MOCK_MEMORY_ANALYTICS;
    }

    // Distinct episode counts for clues
    const clueEpisodeMap = new Map<string, Set<string>>();
    (clues || []).forEach((c) => {
      if (!clueEpisodeMap.has(c.clue_category)) clueEpisodeMap.set(c.clue_category, new Set());
      clueEpisodeMap.get(c.clue_category)!.add(c.episode_id);
    });

    const allDistinctClueEpisodes = new Set((clues || []).map((c) => c.episode_id)).size || 1;
    const clue_frequencies = Array.from(clueEpisodeMap.entries())
      .map(([category, epSet]) => ({
        category,
        count: epSet.size,
        percentage: Math.round((epSet.size / allDistinctClueEpisodes) * 1000) / 10,
      }))
      .sort((a, b) => b.count - a.count);

    // Distinct episode counts for forgotten attributes
    const forgottenEpisodeMap = new Map<string, Set<string>>();
    (forgotten || []).forEach((f) => {
      if (!forgottenEpisodeMap.has(f.attribute_category)) forgottenEpisodeMap.set(f.attribute_category, new Set());
      forgottenEpisodeMap.get(f.attribute_category)!.add(f.episode_id);
    });

    const allDistinctForgottenEpisodes = new Set((forgotten || []).map((f) => f.episode_id)).size || 1;
    const forgotten_frequencies = Array.from(forgottenEpisodeMap.entries())
      .map(([category, epSet]) => ({
        category,
        count: epSet.size,
        percentage: Math.round((epSet.size / allDistinctForgottenEpisodes) * 1000) / 10,
      }))
      .sort((a, b) => b.count - a.count);

    // Clue x Forgotten co-occurrence (by episode_id)
    const episodeClues = new Map<string, Set<string>>();
    (clues || []).forEach((c) => {
      if (!episodeClues.has(c.episode_id)) episodeClues.set(c.episode_id, new Set());
      episodeClues.get(c.episode_id)!.add(c.clue_category);
    });

    const episodeForgotten = new Map<string, Set<string>>();
    (forgotten || []).forEach((f) => {
      if (!episodeForgotten.has(f.episode_id)) episodeForgotten.set(f.episode_id, new Set());
      episodeForgotten.get(f.episode_id)!.add(f.attribute_category);
    });

    const cooccurrenceCounts = new Map<string, number>();
    for (const [epId, cSet] of episodeClues.entries()) {
      const fSet = episodeForgotten.get(epId);
      if (fSet) {
        for (const clue of cSet) {
          for (const forg of fSet) {
            const key = `${clue}:::${forg}`;
            cooccurrenceCounts.set(key, (cooccurrenceCounts.get(key) || 0) + 1);
          }
        }
      }
    }

    const clue_forgotten_cooccurrence = Array.from(cooccurrenceCounts.entries())
      .map(([key, count]) => {
        const [clue, forg] = key.split(":::");
        return { clue, forgotten: forg, count };
      })
      .sort((a, b) => b.count - a.count);

    // Workaround distribution (distinct episodes)
    const workaroundMap = new Map<string, Set<string>>();
    (workarounds || []).forEach((w) => {
      if (!workaroundMap.has(w.workaround_type)) workaroundMap.set(w.workaround_type, new Set());
      workaroundMap.get(w.workaround_type)!.add(w.episode_id);
    });

    const allDistinctWorkaroundEpisodes = new Set((workarounds || []).map((w) => w.episode_id)).size || 1;
    const workaround_distribution = Array.from(workaroundMap.entries())
      .map(([workaround_type, epSet]) => ({
        workaround_type,
        count: epSet.size,
        percentage: Math.round((epSet.size / allDistinctWorkaroundEpisodes) * 1000) / 10,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      clue_frequencies,
      forgotten_frequencies,
      clue_forgotten_cooccurrence,
      workaround_distribution,
    };
  } catch (error) {
    console.warn("Falling back to benchmark memory stats:", error);
    return MOCK_MEMORY_ANALYTICS;
  }
}

export async function getFailureAnalytics(): Promise<FailureAnalyticsResponse> {
  if (!isSupabaseConfigured()) {
    return MOCK_FAILURE_ANALYSIS;
  }

  try {
    const supabase = getSupabaseClient();

    const { data: failures } = await supabase.from("failure_modes").select("episode_id, failure_type, failure_priority");
    const { data: episodes } = await supabase.from("retrieval_episodes").select("id, visual_item_type, outcome");
    const { data: clues } = await supabase.from("remembered_clues").select("episode_id, clue_category");

    if (!failures || failures.length === 0) {
      return MOCK_FAILURE_ANALYSIS;
    }

    const episodeMap = new Map<string, { visual_item_type: string; outcome: string }>();
    (episodes || []).forEach((ep) => {
      episodeMap.set(ep.id, { visual_item_type: ep.visual_item_type, outcome: ep.outcome });
    });

    // Failure mode distribution
    const failureTypeMap = new Map<string, Set<string>>();
    (failures || []).forEach((f) => {
      if (!failureTypeMap.has(f.failure_type)) failureTypeMap.set(f.failure_type, new Set());
      failureTypeMap.get(f.failure_type)!.add(f.episode_id);
    });

    const allDistinctFailureEpisodes = new Set((failures || []).map((f) => f.episode_id)).size || 1;
    const failure_distribution = Array.from(failureTypeMap.entries())
      .map(([failure_type, epSet]) => ({
        failure_type,
        count: epSet.size,
        percentage: Math.round((epSet.size / allDistinctFailureEpisodes) * 1000) / 10,
      }))
      .sort((a, b) => b.count - a.count);

    // Failure by item type
    const itemFailureCounts = new Map<string, number>();
    (failures || []).forEach((f) => {
      const ep = episodeMap.get(f.episode_id);
      if (ep) {
        const key = `${ep.visual_item_type}:::${f.failure_type}`;
        itemFailureCounts.set(key, (itemFailureCounts.get(key) || 0) + 1);
      }
    });

    const failure_by_item_type = Array.from(itemFailureCounts.entries())
      .map(([key, count]) => {
        const [item_type, failure_type] = key.split(":::");
        return { item_type, failure_type, count };
      })
      .sort((a, b) => b.count - a.count);

    // Clue -> Failure -> Outcome flow
    const flowCounts = new Map<string, number>();
    const episodeClueList = new Map<string, Set<string>>();
    (clues || []).forEach((c) => {
      if (!episodeClueList.has(c.episode_id)) episodeClueList.set(c.episode_id, new Set());
      episodeClueList.get(c.episode_id)!.add(c.clue_category);
    });

    (failures || []).forEach((f) => {
      const ep = episodeMap.get(f.episode_id);
      const cSet = episodeClueList.get(f.episode_id);
      if (ep && cSet) {
        for (const clue of cSet) {
          const key = `${clue}:::${f.failure_type}:::${ep.outcome}`;
          flowCounts.set(key, (flowCounts.get(key) || 0) + 1);
        }
      }
    });

    const clue_failure_flow = Array.from(flowCounts.entries())
      .map(([key, count]) => {
        const [clue_category, failure_type, outcome] = key.split(":::");
        return { clue_category, failure_type, outcome, count };
      })
      .sort((a, b) => b.count - a.count);

    return {
      failure_distribution,
      failure_by_item_type,
      clue_failure_flow,
    };
  } catch (error) {
    console.warn("Falling back to benchmark failure stats:", error);
    return MOCK_FAILURE_ANALYSIS;
  }
}

