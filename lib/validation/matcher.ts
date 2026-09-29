/**
 * Episode Matching Engine (Phase 5)
 * Pairs human gold episode labels with AI-extracted retrieval episodes
 * Supports automatic 1:1, 1:N, N:M matching with semantic similarity and manual admin overrides.
 */

import { GoldEpisodeLabel, RetrievalEpisode, MatchMethod, MatchConfidence } from "@/types/database";
import { calculateStringSimilarity } from "@/lib/utils/helpers";

export interface EpisodeMatchResult {
  gold_episode_id: string;
  ai_episode_id: string | null;
  match_method: MatchMethod;
  match_confidence: MatchConfidence;
  similarity_score: number;
}

export interface MatchEvaluationResult {
  matches: EpisodeMatchResult[];
  unmatched_gold_ids: string[];
  unmatched_ai_ids: string[];
}

/**
 * Calculates similarity between a human gold episode label and an AI extracted episode
 */
export function computeEpisodePairSimilarity(
  goldEp: GoldEpisodeLabel,
  aiEp: RetrievalEpisode & { remembered_clues?: Array<{ clue_category: string }>; failure_modes?: Array<{ failure_type: string }> }
): number {
  let score = 0;
  let weights = 0;

  // 1. Visual Item Type match (weight: 0.3)
  weights += 0.3;
  if (goldEp.visual_item_type && aiEp.visual_item_type) {
    if (goldEp.visual_item_type.toLowerCase() === aiEp.visual_item_type.toLowerCase()) {
      score += 0.3;
    } else {
      score += 0.3 * calculateStringSimilarity(goldEp.visual_item_type, aiEp.visual_item_type);
    }
  }

  // 2. Goal / Description similarity (weight: 0.4)
  weights += 0.4;
  if (goldEp.episode_description && aiEp.retrieval_goal) {
    const textSim = calculateStringSimilarity(goldEp.episode_description, aiEp.retrieval_goal);
    score += 0.4 * textSim;
  }

  // 3. Outcome match (weight: 0.15)
  weights += 0.15;
  if (goldEp.outcome && aiEp.outcome) {
    if (goldEp.outcome.toLowerCase() === aiEp.outcome.toLowerCase()) {
      score += 0.15;
    }
  }

  // 4. Clue Category overlap (weight: 0.15)
  weights += 0.15;
  const rawGoldClues = Array.isArray(goldEp.remembered_clues) ? goldEp.remembered_clues : [];
  const rawAiClues = Array.isArray(aiEp.remembered_clues) ? aiEp.remembered_clues : [];

  const getCategory = (item: any): string => {
    if (!item) return "";
    if (typeof item === "string") return item.toLowerCase();
    return (item.clue_category || item.category || "").toLowerCase();
  };

  const goldCategories = new Set(rawGoldClues.map(getCategory).filter(Boolean));
  const aiCategories = new Set(rawAiClues.map(getCategory).filter(Boolean));

  if (goldCategories.size > 0 && aiCategories.size > 0) {
    const intersection = [...goldCategories].filter((c) => aiCategories.has(c)).length;
    const union = new Set([...goldCategories, ...aiCategories]).size;
    score += 0.15 * (union > 0 ? intersection / union : 0);
  } else if (goldCategories.size === 0 && aiCategories.size === 0) {
    score += 0.15;
  }


  return weights > 0 ? score / weights : 0;
}

/**
 * Matches gold episodes with AI episodes for a single raw record
 */
export function matchEpisodesForRecord(
  goldEpisodes: GoldEpisodeLabel[],
  aiEpisodes: Array<RetrievalEpisode & { remembered_clues?: Array<{ clue_category: string }>; failure_modes?: Array<{ failure_type: string }> }>,
  manualOverrides: Record<string, string> = {} // gold_episode_id -> ai_episode_id
): MatchEvaluationResult {
  const matches: EpisodeMatchResult[] = [];
  const matchedAiIds = new Set<string>();

  // 1. Apply Manual Overrides first
  for (const goldEp of goldEpisodes) {
    if (manualOverrides[goldEp.id]) {
      const targetAiId = manualOverrides[goldEp.id];
      const aiEp = aiEpisodes.find((e) => e.id === targetAiId);
      const similarity = aiEp ? computeEpisodePairSimilarity(goldEp, aiEp) : 1.0;

      matches.push({
        gold_episode_id: goldEp.id,
        ai_episode_id: targetAiId,
        match_method: "manual",
        match_confidence: "high",
        similarity_score: similarity,
      });
      matchedAiIds.add(targetAiId);
    }
  }

  const remainingGold = goldEpisodes.filter((g) => !manualOverrides[g.id]);
  const remainingAi = aiEpisodes.filter((a) => !matchedAiIds.has(a.id));

  // 2. Exact 1:1 Simple Case
  if (remainingGold.length === 1 && remainingAi.length === 1) {
    const goldEp = remainingGold[0];
    const aiEp = remainingAi[0];
    const sim = computeEpisodePairSimilarity(goldEp, aiEp);

    matches.push({
      gold_episode_id: goldEp.id,
      ai_episode_id: aiEp.id,
      match_method: "automatic",
      match_confidence: sim >= 0.5 ? "high" : "medium",
      similarity_score: sim,
    });
    matchedAiIds.add(aiEp.id);
  } else if (remainingGold.length > 0 && remainingAi.length > 0) {
    // 3. Multi-episode bipartite matching (greedy best-first on similarity)
    const pairs: Array<{ gold: GoldEpisodeLabel; ai: typeof aiEpisodes[0]; similarity: number }> = [];

    for (const g of remainingGold) {
      for (const a of remainingAi) {
        const sim = computeEpisodePairSimilarity(g, a);
        pairs.push({ gold: g, ai: a, similarity: sim });
      }
    }

    pairs.sort((a, b) => b.similarity - a.similarity);

    const usedGoldIds = new Set<string>();

    for (const pair of pairs) {
      if (usedGoldIds.has(pair.gold.id) || matchedAiIds.has(pair.ai.id)) continue;

      if (pair.similarity >= 0.3) {
        matches.push({
          gold_episode_id: pair.gold.id,
          ai_episode_id: pair.ai.id,
          match_method: "automatic",
          match_confidence: pair.similarity >= 0.7 ? "high" : pair.similarity >= 0.5 ? "medium" : "low",
          similarity_score: pair.similarity,
        });
        usedGoldIds.add(pair.gold.id);
        matchedAiIds.add(pair.ai.id);
      }
    }

    // Unmatched remaining gold episodes
    for (const g of remainingGold) {
      if (!usedGoldIds.has(g.id)) {
        matches.push({
          gold_episode_id: g.id,
          ai_episode_id: null,
          match_method: "automatic",
          match_confidence: "high",
          similarity_score: 0,
        });
      }
    }
  } else if (remainingGold.length > 0 && remainingAi.length === 0) {
    // AI failed to extract any episodes (False Negatives)
    for (const g of remainingGold) {
      matches.push({
        gold_episode_id: g.id,
        ai_episode_id: null,
        match_method: "automatic",
        match_confidence: "high",
        similarity_score: 0,
      });
    }
  }

  const unmatchedGoldIds = matches.filter((m) => m.ai_episode_id === null).map((m) => m.gold_episode_id);
  const unmatchedAiIds = aiEpisodes.filter((a) => !matchedAiIds.has(a.id)).map((a) => a.id);

  return {
    matches,
    unmatched_gold_ids: unmatchedGoldIds,
    unmatched_ai_ids: unmatchedAiIds,
  };
}
