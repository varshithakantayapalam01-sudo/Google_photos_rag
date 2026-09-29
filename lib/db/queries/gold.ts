/**
 * Gold Dataset and Validation Run database queries
 * Supports Development vs Holdout dataset splits and multi-episode labels
 */

import { getSupabaseAdminClient, getSupabaseClient } from "../client";
import {
  GoldRecord,
  GoldEpisodeLabel,
  GoldEpisodeMatch,
  ValidationRun,
} from "@/types/database";

export async function insertGoldRecordWithEpisodes(
  goldRecord: Omit<GoldRecord, "id" | "labelled_at">,
  episodes: Array<Omit<GoldEpisodeLabel, "id" | "gold_record_id">>
): Promise<GoldRecord> {
  const supabase = getSupabaseAdminClient();

  const { data: recordData, error: recordError } = await supabase
    .from("gold_records")
    .insert([goldRecord])
    .select()
    .single();

  if (recordError) throw new Error(`Failed to insert gold record: ${recordError.message}`);
  const goldRecordId = recordData.id;

  if (episodes.length > 0) {
    const episodesWithId = episodes.map((ep) => ({
      ...ep,
      gold_record_id: goldRecordId,
    }));
    const { error: epError } = await supabase.from("gold_episode_labels").insert(episodesWithId);
    if (epError) throw new Error(`Failed to insert gold episode labels: ${epError.message}`);
  }

  return recordData as GoldRecord;
}

export async function getGoldRecords(): Promise<
  Array<GoldRecord & { raw_records: { raw_text: string; platform: string }; gold_episode_labels: GoldEpisodeLabel[] }>
> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("gold_records")
    .select(`
      *,
      raw_records(raw_text, platform),
      gold_episode_labels(*)
    `)
    .order("labelled_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch gold records: ${error.message}`);
  return (data || []) as any;
}

export async function insertValidationRun(
  run: Omit<ValidationRun, "id" | "run_date">,
  matches: Array<Omit<GoldEpisodeMatch, "id" | "validation_run_id">>
): Promise<ValidationRun> {
  const supabase = getSupabaseAdminClient();

  const { data: runData, error: runError } = await supabase
    .from("validation_runs")
    .insert([run])
    .select()
    .single();

  if (runError) throw new Error(`Failed to record validation run: ${runError.message}`);
  const runId = runData.id;

  if (matches.length > 0) {
    const matchesWithId = matches.map((m) => ({
      ...m,
      validation_run_id: runId,
    }));
    const { error: matchError } = await supabase.from("gold_episode_matches").insert(matchesWithId);
    if (matchError) throw new Error(`Failed to insert gold episode matches: ${matchError.message}`);
  }

  return runData as ValidationRun;
}

export async function getLatestValidationRun(): Promise<ValidationRun | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("validation_runs")
    .select("*")
    .order("run_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch latest validation run: ${error.message}`);
  return data as ValidationRun | null;
}
