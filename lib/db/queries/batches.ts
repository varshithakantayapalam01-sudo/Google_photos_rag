/**
 * Collection Batches database queries
 */

import { getSupabaseAdminClient, getSupabaseClient } from "../client";
import { CollectionBatch } from "@/types/database";

export async function createCollectionBatch(
  batch: Omit<CollectionBatch, "id" | "records_imported" | "relevant_records" | "created_at">
): Promise<CollectionBatch> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("collection_batches")
    .insert([batch])
    .select()
    .single();

  if (error) throw new Error(`Failed to create collection batch: ${error.message}`);
  return data as CollectionBatch;
}

export async function getCollectionBatches(): Promise<CollectionBatch[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("collection_batches")
    .select("*")
    .order("collection_date", { ascending: false });

  if (error) throw new Error(`Failed to fetch collection batches: ${error.message}`);
  return data as CollectionBatch[];
}

export async function getCollectionBatchById(id: string): Promise<CollectionBatch | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("collection_batches")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(`Failed to fetch batch by id: ${error.message}`);
  }
  return data as CollectionBatch;
}

export async function updateCollectionBatchCounts(
  id: string,
  counts: { records_imported?: number; relevant_records?: number }
): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("collection_batches")
    .update(counts)
    .eq("id", id);

  if (error) throw new Error(`Failed to update batch counts: ${error.message}`);
}
