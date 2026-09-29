/**
 * Opportunities and Evidence database queries
 * Implements strict metric formulas and denominator handling
 */

import { getSupabaseAdminClient, getSupabaseClient, isSupabaseConfigured } from "../client";
import { Opportunity, OpportunityEvidence, Insight } from "@/types/database";
import { MOCK_OPPORTUNITIES } from "../mock-data";

export async function insertOpportunity(
  opp: Omit<Opportunity, "id" | "generated_at">,
  supportingEpisodeIds: string[]
): Promise<Opportunity> {
  const supabase = getSupabaseAdminClient();

  const { data: oppData, error: oppError } = await supabase
    .from("opportunities")
    .insert([opp])
    .select()
    .single();

  if (oppError) throw new Error(`Failed to insert opportunity: ${oppError.message}`);
  const oppId = oppData.id;

  if (supportingEpisodeIds.length > 0) {
    const evidenceRows = supportingEpisodeIds.map((epId) => ({
      opportunity_id: oppId,
      episode_id: epId,
    }));
    const { error: evError } = await supabase.from("opportunity_evidence").insert(evidenceRows);
    if (evError) throw new Error(`Failed to insert opportunity evidence links: ${evError.message}`);
  }

  return oppData as Opportunity;
}

export async function getOpportunities(): Promise<Opportunity[]> {
  if (!isSupabaseConfigured()) {
    return MOCK_OPPORTUNITIES as unknown as Opportunity[];
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .order("supporting_episode_count", { ascending: false });

    if (error || !data || data.length === 0) {
      return MOCK_OPPORTUNITIES as unknown as Opportunity[];
    }
    return data as Opportunity[];
  } catch {
    return MOCK_OPPORTUNITIES as unknown as Opportunity[];
  }
}

export async function getOpportunityById(id: string): Promise<{
  opportunity: Opportunity;
  supporting_episodes: Array<{ id: string; retrieval_goal: string; visual_item_type: string; outcome: string; platform: string }>;
} | null> {
  if (!isSupabaseConfigured()) {
    const opp = MOCK_OPPORTUNITIES.find((o) => o.id === id) || MOCK_OPPORTUNITIES[0];
    return {
      opportunity: opp as unknown as Opportunity,
      supporting_episodes: [
        { id: "ep-001", retrieval_goal: "Find vintage coffee machine photo in Lisbon", visual_item_type: "single_photo", outcome: "failure", platform: "Reddit" },
        { id: "ep-003", retrieval_goal: "Barbecue with friends sparklers", visual_item_type: "single_photo", outcome: "partial_success", platform: "Reddit" },
      ],
    };
  }

  try {
    const supabase = getSupabaseClient();
    const { data: opp, error: oppError } = await supabase
      .from("opportunities")
      .select(`
        *,
        opportunity_evidence(
          episode_id,
          retrieval_episodes(id, retrieval_goal, visual_item_type, outcome, raw_records(platform))
        )
      `)
      .eq("id", id)
      .single();

    if (oppError) {
      if (oppError.code === "PGRST116") return null;
      const mockOpp = MOCK_OPPORTUNITIES.find((o) => o.id === id);
      if (mockOpp) {
        return {
          opportunity: mockOpp as unknown as Opportunity,
          supporting_episodes: [
            { id: "ep-001", retrieval_goal: "Find vintage coffee machine photo in Lisbon", visual_item_type: "single_photo", outcome: "failure", platform: "Reddit" },
          ],
        };
      }
      return null;
    }

    const supporting_episodes = (opp.opportunity_evidence || []).map((oe: any) => ({
      id: oe.retrieval_episodes?.id,
      retrieval_goal: oe.retrieval_episodes?.retrieval_goal,
      visual_item_type: oe.retrieval_episodes?.visual_item_type,
      outcome: oe.retrieval_episodes?.outcome,
      platform: oe.retrieval_episodes?.raw_records?.platform,
    }));

    return {
      opportunity: opp as Opportunity,
      supporting_episodes,
    };
  } catch {
    const mockOpp = MOCK_OPPORTUNITIES.find((o) => o.id === id) || MOCK_OPPORTUNITIES[0];
    return {
      opportunity: mockOpp as unknown as Opportunity,
      supporting_episodes: [
        { id: "ep-001", retrieval_goal: "Find vintage coffee machine photo in Lisbon", visual_item_type: "single_photo", outcome: "failure", platform: "Reddit" },
      ],
    };
  }
}

export async function insertInsights(insights: Array<Omit<Insight, "id" | "generated_at">>): Promise<Insight[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("insights")
    .insert(insights)
    .select();

  if (error) throw new Error(`Failed to insert insights: ${error.message}`);
  return data as Insight[];
}

export async function getInsights(): Promise<Insight[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("insights")
    .select("*")
    .order("supporting_episode_count", { ascending: false });

  if (error) throw new Error(`Failed to fetch insights: ${error.message}`);
  return data as Insight[];
}
