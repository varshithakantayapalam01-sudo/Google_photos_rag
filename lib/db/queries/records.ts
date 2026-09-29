/**
 * Raw Records and Relevance Classification database queries
 */

import { getSupabaseAdminClient, getSupabaseClient } from "../client";
import { RawRecord, RelevanceClassification } from "@/types/database";

export async function insertRawRecords(
  records: Array<Omit<RawRecord, "id" | "imported_at">>
): Promise<RawRecord[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("raw_records")
    .insert(records)
    .select();

  if (error) throw new Error(`Failed to insert raw records: ${error.message}`);
  return data as RawRecord[];
}

export async function findDuplicateRecordByHash(textHash: string): Promise<RawRecord | null> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("raw_records")
    .select("*")
    .eq("text_hash", textHash)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to search duplicate hash: ${error.message}`);
  return data as RawRecord | null;
}

export async function getUnclassifiedRecords(limit = 50): Promise<RawRecord[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("raw_records")
    .select(`
      *,
      relevance_classifications(id)
    `)
    .eq("is_duplicate", false)
    .is("relevance_classifications", null)
    .limit(limit);

  if (error) throw new Error(`Failed to fetch unclassified records: ${error.message}`);
  return data as RawRecord[];
}

export async function insertRelevanceClassification(
  classification: Omit<RelevanceClassification, "id" | "classified_at">
): Promise<RelevanceClassification> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("relevance_classifications")
    .insert([classification])
    .select()
    .single();

  if (error) throw new Error(`Failed to insert relevance classification: ${error.message}`);
  return data as RelevanceClassification;
}

export async function getRawRecordById(id: string): Promise<RawRecord | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("raw_records")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch raw record: ${error.message}`);
  }
  return data as RawRecord;
}
