/**
 * Retrieval Episodes and Child entities database queries
 */

import { getSupabaseAdminClient, getSupabaseClient } from "../client";
import {
  RetrievalEpisode,
  RememberedClue,
  ForgottenAttribute,
  SearchBehavior,
  FailureMode,
  Workaround,
} from "@/types/database";

export interface FullEpisodeData {
  episode: RetrievalEpisode;
  remembered_clues: RememberedClue[];
  forgotten_attributes: ForgottenAttribute[];
  search_behaviors: SearchBehavior[];
  failure_modes: FailureMode[];
  workarounds: Workaround[];
  raw_record: {
    id: string;
    raw_text: string;
    platform: string;
    source_url: string | null;
    date_posted: string | null;
    title: string | null;
  };
}

export async function insertFullEpisode(
  episode: Omit<RetrievalEpisode, "id" | "extracted_at">,
  clues: Array<Omit<RememberedClue, "id" | "episode_id">>,
  attributes: Array<Omit<ForgottenAttribute, "id" | "episode_id">>,
  behaviors: Array<Omit<SearchBehavior, "id" | "episode_id">>,
  failures: Array<Omit<FailureMode, "id" | "episode_id">>,
  workarounds: Array<Omit<Workaround, "id" | "episode_id">>
): Promise<RetrievalEpisode> {
  const supabase = getSupabaseAdminClient();

  // 1. Insert Episode
  const { data: episodeData, error: epError } = await supabase
    .from("retrieval_episodes")
    .insert([episode])
    .select()
    .single();

  if (epError) throw new Error(`Failed to insert episode: ${epError.message}`);
  const episodeId = episodeData.id;

  // 2. Insert Clues
  if (clues.length > 0) {
    const cluesWithId = clues.map((c) => ({ ...c, episode_id: episodeId }));
    const { error } = await supabase.from("remembered_clues").insert(cluesWithId);
    if (error) throw new Error(`Failed to insert remembered clues: ${error.message}`);
  }

  // 3. Insert Forgotten Attributes
  if (attributes.length > 0) {
    const attrsWithId = attributes.map((a) => ({ ...a, episode_id: episodeId }));
    const { error } = await supabase.from("forgotten_attributes").insert(attrsWithId);
    if (error) throw new Error(`Failed to insert forgotten attributes: ${error.message}`);
  }

  // 4. Insert Search Behaviors
  if (behaviors.length > 0) {
    const behaviorsWithId = behaviors.map((b) => ({ ...b, episode_id: episodeId }));
    const { error } = await supabase.from("search_behaviors").insert(behaviorsWithId);
    if (error) throw new Error(`Failed to insert search behaviors: ${error.message}`);
  }

  // 5. Insert Failure Modes
  if (failures.length > 0) {
    const failuresWithId = failures.map((f) => ({ ...f, episode_id: episodeId }));
    const { error } = await supabase.from("failure_modes").insert(failuresWithId);
    if (error) throw new Error(`Failed to insert failure modes: ${error.message}`);
  }

  // 6. Insert Workarounds
  if (workarounds.length > 0) {
    const workaroundsWithId = workarounds.map((w) => ({ ...w, episode_id: episodeId }));
    const { error } = await supabase.from("workarounds").insert(workaroundsWithId);
    if (error) throw new Error(`Failed to insert workarounds: ${error.message}`);
  }

  return episodeData as RetrievalEpisode;
}

export async function getEpisodeById(id: string): Promise<FullEpisodeData | null> {
  const supabase = getSupabaseClient();

  const { data: ep, error: epError } = await supabase
    .from("retrieval_episodes")
    .select(`
      *,
      raw_records(id, raw_text, platform, source_url, date_posted, title),
      remembered_clues(*),
      forgotten_attributes(*),
      search_behaviors(*),
      failure_modes(*),
      workarounds(*)
    `)
    .eq("id", id)
    .single();

  if (epError) {
    if (epError.code === "PGRST116") return null;
    throw new Error(`Failed to fetch episode: ${epError.message}`);
  }

  return {
    episode: {
      id: ep.id,
      record_id: ep.record_id,
      visual_item_type: ep.visual_item_type,
      retrieval_goal: ep.retrieval_goal,
      why_user_needs_item: ep.why_user_needs_item,
      outcome: ep.outcome,
      impact_type: ep.impact_type,
      urgency: ep.urgency,
      frustration_level: ep.frustration_level,
      consequence: ep.consequence,
      rationale_summary: ep.rationale_summary,
      extraction_confidence: ep.extraction_confidence,
      model_version: ep.model_version,
      prompt_version: ep.prompt_version,
      schema_version: ep.schema_version,
      extracted_at: ep.extracted_at,
    },
    remembered_clues: ep.remembered_clues || [],
    forgotten_attributes: ep.forgotten_attributes || [],
    search_behaviors: ep.search_behaviors || [],
    failure_modes: ep.failure_modes || [],
    workarounds: ep.workarounds || [],
    raw_record: ep.raw_records,
  };
}

export async function listEpisodes(filters?: {
  visual_item_type?: string;
  outcome?: string;
  platform?: string;
  limit?: number;
  offset?: number;
}): Promise<{ episodes: RetrievalEpisode[]; total: number }> {
  const supabase = getSupabaseClient();
  let query = supabase.from("retrieval_episodes").select("*, raw_records!inner(platform)", { count: "exact" });

  if (filters?.visual_item_type) {
    query = query.eq("visual_item_type", filters.visual_item_type);
  }
  if (filters?.outcome) {
    query = query.eq("outcome", filters.outcome);
  }
  if (filters?.platform) {
    query = query.eq("raw_records.platform", filters.platform);
  }

  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  query = query.order("extracted_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to list episodes: ${error.message}`);

  return {
    episodes: (data || []) as RetrievalEpisode[],
    total: count || 0,
  };
}
