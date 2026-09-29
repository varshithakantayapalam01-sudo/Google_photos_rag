/**
 * Retrieval Episodes and Child entities database queries
 */

import { getSupabaseAdminClient, getSupabaseClient, isSupabaseConfigured } from "../client";
import {
  RetrievalEpisode,
  RememberedClue,
  ForgottenAttribute,
  SearchBehavior,
  FailureMode,
  Workaround,
} from "@/types/database";
import { MOCK_EPISODES } from "../mock-data";

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
  if (!isSupabaseConfigured()) {
    const ep = MOCK_EPISODES.find((e) => e.id === id) || MOCK_EPISODES[0];
    return {
      episode: ep,
      remembered_clues: [
        {
          id: "clue-1",
          episode_id: ep.id,
          clue_category: "visual_feature",
          clue_description: ep.retrieval_goal,
          evidence_quote: ep.retrieval_goal,
          source_record_id: ep.record_id,
          char_start: 0,
          char_end: ep.retrieval_goal.length,
          span_status: "matched",
          evidence_type: "observed",
          confidence: 0.95,
        },
      ],
      forgotten_attributes: [
        {
          id: "forg-1",
          episode_id: ep.id,
          attribute_category: "exact_date",
          description: "Exact calendar date",
          evidence_quote: "forgot when it was taken",
          source_record_id: ep.record_id,
          char_start: 0,
          char_end: 20,
          span_status: "matched",
          evidence_type: "observed",
          confidence: 0.95,
        },
      ],
      search_behaviors: [
        {
          id: "sb-1",
          episode_id: ep.id,
          behavior_type: "initial_query",
          description: "vague memory search",
          sequence_order: 1,
          evidence_quote: "vague memory search",
          source_record_id: ep.record_id,
          char_start: 0,
          char_end: 10,
          span_status: "matched",
        },
      ],
      failure_modes: [
        {
          id: "fm-1",
          episode_id: ep.id,
          failure_type: "candidate_retrieval",
          failure_priority: "primary",
          description: "Informal terms did not match index",
          evidence_quote: "nothing came up in search",
          source_record_id: ep.record_id,
          char_start: 0,
          char_end: 20,
          span_status: "matched",
          rationale_summary: "vocabulary gap between user and index",
          confidence: 0.95,
        },
      ],
      workarounds: [
        {
          id: "wa-1",
          episode_id: ep.id,
          workaround_type: "manual_scroll",
          description: "Manually scrolled through photo timeline",
          evidence_quote: "scrolled for 40 minutes",
          source_record_id: ep.record_id,
          char_start: 0,
          char_end: 20,
          span_status: "matched",
          led_to_success: false,
        },
      ],
      raw_record: {
        id: ep.record_id,
        raw_text: `User discussion post describing retrieval issue: "${ep.retrieval_goal}". Outcome: ${ep.outcome}. Reason: ${ep.rationale_summary}.`,
        platform: "Reddit",
        source_url: "https://reddit.com/r/googlephotos",
        date_posted: ep.extracted_at,
        title: ep.retrieval_goal,
      },
    };
  }

  try {
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
  } catch {
    const ep = MOCK_EPISODES.find((e) => e.id === id) || MOCK_EPISODES[0];
    return {
      episode: ep,
      remembered_clues: [],
      forgotten_attributes: [],
      search_behaviors: [],
      failure_modes: [],
      workarounds: [],
      raw_record: {
        id: ep.record_id,
        raw_text: ep.retrieval_goal,
        platform: "Reddit",
        source_url: null,
        date_posted: ep.extracted_at,
        title: ep.retrieval_goal,
      },
    };
  }
}

export async function listEpisodes(filters?: {
  visual_item_type?: string;
  outcome?: string;
  platform?: string;
  limit?: number;
  offset?: number;
}): Promise<{ episodes: RetrievalEpisode[]; total: number }> {
  if (!isSupabaseConfigured()) {
    let filtered = [...MOCK_EPISODES];
    if (filters?.visual_item_type) {
      filtered = filtered.filter((e) => e.visual_item_type === filters.visual_item_type);
    }
    if (filters?.outcome) {
      filtered = filtered.filter((e) => e.outcome === filters.outcome);
    }
    return { episodes: filtered, total: filtered.length };
  }

  try {
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
    if (error || !data || data.length === 0) {
      let filtered = [...MOCK_EPISODES];
      if (filters?.visual_item_type) {
        filtered = filtered.filter((e) => e.visual_item_type === filters.visual_item_type);
      }
      if (filters?.outcome) {
        filtered = filtered.filter((e) => e.outcome === filters.outcome);
      }
      return { episodes: filtered, total: filtered.length };
    }

    return {
      episodes: (data || []) as RetrievalEpisode[],
      total: count || data.length,
    };
  } catch {
    return { episodes: MOCK_EPISODES, total: MOCK_EPISODES.length };
  }
}
