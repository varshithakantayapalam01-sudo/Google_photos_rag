/**
 * Pattern Discovery Queries
 * SQL aggregation queries using COUNT(DISTINCT episode_id) discipline.
 * These queries identify patterns in the dataset for opportunity generation.
 */

import { getSupabaseClient } from "@/lib/db/client";

export interface PatternGroup {
  /** Grouping identifier (e.g., visual item type, failure mode) */
  group_key: string;
  /** DISTINCT episode IDs in this group */
  episode_ids: string[];
  /** Count of distinct episodes */
  episode_count: number;
  /** Distinct platforms represented */
  platforms: string[];
  /** Platform diversity count */
  platform_count: number;
}

export interface FailurePattern extends PatternGroup {
  failure_type: string;
  visual_item_type: string;
  outcomes: Record<string, number>;
}

export interface ClueFailurePattern {
  clue_category: string;
  failure_type: string;
  episode_count: number;
  episode_ids: string[];
}

/**
 * Get episode groupings by visual item type with failure correlation
 */
export async function getFailurePatternsByItemType(): Promise<FailurePattern[]> {
  const supabase = getSupabaseClient();

  const { data: episodes } = await supabase
    .from("retrieval_episodes")
    .select("id, visual_item_type, outcome, record_id, raw_records!inner(platform)");

  const { data: failures } = await supabase
    .from("failure_modes")
    .select("episode_id, failure_type");

  if (!episodes || !failures) return [];

  // Map episode to its metadata
  const episodeMap = new Map<string, {
    visual_item_type: string;
    outcome: string;
    platform: string;
  }>();
  episodes.forEach((ep: any) => {
    episodeMap.set(ep.id, {
      visual_item_type: ep.visual_item_type,
      outcome: ep.outcome,
      platform: ep.raw_records?.platform || "unknown",
    });
  });

  // Group by (visual_item_type, failure_type)
  const groups = new Map<string, {
    failure_type: string;
    visual_item_type: string;
    episode_ids: Set<string>;
    platforms: Set<string>;
    outcomes: Map<string, number>;
  }>();

  failures.forEach((f) => {
    const ep = episodeMap.get(f.episode_id);
    if (!ep) return;

    const key = `${ep.visual_item_type}:::${f.failure_type}`;
    if (!groups.has(key)) {
      groups.set(key, {
        failure_type: f.failure_type,
        visual_item_type: ep.visual_item_type,
        episode_ids: new Set(),
        platforms: new Set(),
        outcomes: new Map(),
      });
    }
    const g = groups.get(key)!;
    g.episode_ids.add(f.episode_id);
    g.platforms.add(ep.platform);
    g.outcomes.set(ep.outcome, (g.outcomes.get(ep.outcome) || 0) + 1);
  });

  return Array.from(groups.values())
    .map((g) => ({
      group_key: `${g.visual_item_type}:::${g.failure_type}`,
      failure_type: g.failure_type,
      visual_item_type: g.visual_item_type,
      episode_ids: Array.from(g.episode_ids),
      episode_count: g.episode_ids.size,
      platforms: Array.from(g.platforms),
      platform_count: g.platforms.size,
      outcomes: Object.fromEntries(g.outcomes),
    }))
    .sort((a, b) => b.episode_count - a.episode_count);
}

/**
 * Get clue → failure correlations for opportunity discovery
 */
export async function getClueFailureCorrelations(): Promise<ClueFailurePattern[]> {
  const supabase = getSupabaseClient();

  const { data: clues } = await supabase
    .from("remembered_clues")
    .select("episode_id, clue_category");

  const { data: failures } = await supabase
    .from("failure_modes")
    .select("episode_id, failure_type");

  if (!clues || !failures) return [];

  // Build episode→clue and episode→failure maps
  const episodeClues = new Map<string, Set<string>>();
  clues.forEach((c) => {
    if (!episodeClues.has(c.episode_id)) episodeClues.set(c.episode_id, new Set());
    episodeClues.get(c.episode_id)!.add(c.clue_category);
  });

  const episodeFailures = new Map<string, Set<string>>();
  failures.forEach((f) => {
    if (!episodeFailures.has(f.episode_id)) episodeFailures.set(f.episode_id, new Set());
    episodeFailures.get(f.episode_id)!.add(f.failure_type);
  });

  // Correlate: for each episode that has both clues and failures
  const correlations = new Map<string, Set<string>>();
  for (const [epId, clueSet] of episodeClues.entries()) {
    const failSet = episodeFailures.get(epId);
    if (!failSet) continue;
    for (const clue of clueSet) {
      for (const fail of failSet) {
        const key = `${clue}:::${fail}`;
        if (!correlations.has(key)) correlations.set(key, new Set());
        correlations.get(key)!.add(epId);
      }
    }
  }

  return Array.from(correlations.entries())
    .map(([key, epSet]) => {
      const [clue_category, failure_type] = key.split(":::");
      return {
        clue_category,
        failure_type,
        episode_count: epSet.size,
        episode_ids: Array.from(epSet),
      };
    })
    .sort((a, b) => b.episode_count - a.episode_count);
}

/**
 * Get all episode data needed for opportunity metric computation.
 * Returns episode-level data with associated child entity summaries.
 */
export async function getEpisodeDataForOpportunities(): Promise<{
  totalRelevantEpisodes: number;
  episodes: Array<{
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
  }>;
}> {
  const supabase = getSupabaseClient();

  const { data: episodes, count: totalCount } = await supabase
    .from("retrieval_episodes")
    .select("id, visual_item_type, outcome, record_id, raw_records!inner(platform)", { count: "exact" });

  const { data: clues } = await supabase.from("remembered_clues").select("episode_id, clue_category, evidence_type");
  const { data: forgotten } = await supabase.from("forgotten_attributes").select("episode_id, attribute_category");
  const { data: failures } = await supabase.from("failure_modes").select("episode_id, failure_type");
  const { data: workarounds } = await supabase.from("workarounds").select("episode_id, workaround_type");
  const { data: behaviors } = await supabase.from("search_behaviors").select("episode_id");

  if (!episodes) return { totalRelevantEpisodes: 0, episodes: [] };

  // Build lookup maps
  const clueMap = new Map<string, { categories: Set<string>; evidenceTypes: string[] }>();
  (clues || []).forEach((c) => {
    if (!clueMap.has(c.episode_id)) clueMap.set(c.episode_id, { categories: new Set(), evidenceTypes: [] });
    const entry = clueMap.get(c.episode_id)!;
    entry.categories.add(c.clue_category);
    entry.evidenceTypes.push(c.evidence_type);
  });

  const forgottenMap = new Map<string, Set<string>>();
  (forgotten || []).forEach((f) => {
    if (!forgottenMap.has(f.episode_id)) forgottenMap.set(f.episode_id, new Set());
    forgottenMap.get(f.episode_id)!.add(f.attribute_category);
  });

  const failureMap = new Map<string, Set<string>>();
  (failures || []).forEach((f) => {
    if (!failureMap.has(f.episode_id)) failureMap.set(f.episode_id, new Set());
    failureMap.get(f.episode_id)!.add(f.failure_type);
  });

  const workaroundMap = new Map<string, Set<string>>();
  (workarounds || []).forEach((w) => {
    if (!workaroundMap.has(w.episode_id)) workaroundMap.set(w.episode_id, new Set());
    workaroundMap.get(w.episode_id)!.add(w.workaround_type);
  });

  const behaviorCountMap = new Map<string, number>();
  (behaviors || []).forEach((b) => {
    behaviorCountMap.set(b.episode_id, (behaviorCountMap.get(b.episode_id) || 0) + 1);
  });

  const enrichedEpisodes = episodes.map((ep: any) => ({
    id: ep.id,
    visual_item_type: ep.visual_item_type,
    outcome: ep.outcome,
    platform: ep.raw_records?.platform || "unknown",
    clue_categories: Array.from(clueMap.get(ep.id)?.categories || []),
    forgotten_categories: Array.from(forgottenMap.get(ep.id) || []),
    failure_types: Array.from(failureMap.get(ep.id) || []),
    workaround_types: Array.from(workaroundMap.get(ep.id) || []),
    search_behavior_count: behaviorCountMap.get(ep.id) || 0,
    evidence_types: clueMap.get(ep.id)?.evidenceTypes || [],
  }));

  return {
    totalRelevantEpisodes: totalCount || episodes.length,
    episodes: enrichedEpisodes,
  };
}
