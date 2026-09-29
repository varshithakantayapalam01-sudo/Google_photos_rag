/**
 * Gold Dataset Management (Phase 5)
 * CRUD operations and dataset seeding for Development (30–35) and Holdout (~15) splits.
 */

import { getSupabaseAdminClient } from "@/lib/db/client";
import { GoldRecord, GoldEpisodeLabel, DatasetSplit } from "@/types/database";

export interface GoldEpisodeInput {
  episode_index: number;
  episode_description: string;
  visual_item_type: string;
  remembered_clues: Array<{
    clue_category: string;
    clue_description: string;
    evidence_quote?: string;
  }>;
  forgotten_attributes: Array<{
    attribute_category: string;
    description: string;
    evidence_quote?: string;
  }>;
  primary_failure_mode?: string;
  outcome?: string;
  notes?: string;
}

export interface CreateGoldRecordInput {
  record_id: string;
  is_relevant: boolean;
  dataset_split: DatasetSplit;
  expected_episode_count?: number;
  labeller_notes?: string;
  episodes?: GoldEpisodeInput[];
}

/**
 * Creates or updates a gold record and its expected episode labels
 */
export async function saveGoldRecord(input: CreateGoldRecordInput): Promise<GoldRecord> {
  const supabase = getSupabaseAdminClient();
  const episodeCount = input.episodes ? input.episodes.length : (input.expected_episode_count || (input.is_relevant ? 1 : 0));

  // 1. Upsert gold_record
  const { data: recordData, error: recordError } = await supabase
    .from("gold_records")
    .upsert(
      {
        record_id: input.record_id,
        is_relevant: input.is_relevant,
        dataset_split: input.dataset_split,
        expected_episode_count: episodeCount,
        labeller_notes: input.labeller_notes || null,
        labelled_at: new Date().toISOString(),
      },
      { onConflict: "record_id" }
    )
    .select()
    .single();

  if (recordError) throw new Error(`Failed to save gold record: ${recordError.message}`);
  const goldRecordId = recordData.id;

  // 2. Refresh episode labels
  if (input.episodes && input.episodes.length > 0) {
    // Delete existing episode labels for this gold record
    await supabase.from("gold_episode_labels").delete().eq("gold_record_id", goldRecordId);

    const labelsToInsert = input.episodes.map((ep, idx) => ({
      gold_record_id: goldRecordId,
      episode_index: ep.episode_index ?? idx + 1,
      episode_description: ep.episode_description,
      visual_item_type: ep.visual_item_type,
      remembered_clues: ep.remembered_clues || [],
      forgotten_attributes: ep.forgotten_attributes || [],
      primary_failure_mode: ep.primary_failure_mode || null,
      outcome: ep.outcome || null,
      notes: ep.notes || null,
    }));

    const { error: labelsError } = await supabase.from("gold_episode_labels").insert(labelsToInsert);
    if (labelsError) throw new Error(`Failed to save gold episode labels: ${labelsError.message}`);
  }

  return recordData as GoldRecord;
}

/**
 * Lists all gold records with raw record context and expected episode labels
 */
export async function listGoldRecords(split?: DatasetSplit) {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("gold_records")
    .select(`
      *,
      raw_records(id, raw_text, platform, title, date_posted),
      gold_episode_labels(*)
    `)
    .order("labelled_at", { ascending: false });

  if (split) {
    query = query.eq("dataset_split", split);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list gold records: ${error.message}`);
  return data || [];
}

/**
 * Gets a specific gold record by ID
 */
export async function getGoldRecordById(id: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("gold_records")
    .select(`
      *,
      raw_records(id, raw_text, platform, title, date_posted),
      gold_episode_labels(*)
    `)
    .eq("id", id)
    .single();

  if (error) throw new Error(`Failed to fetch gold record: ${error.message}`);
  return data;
}

/**
 * Deletes a gold record
 */
export async function deleteGoldRecord(id: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("gold_records").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete gold record: ${error.message}`);
}
