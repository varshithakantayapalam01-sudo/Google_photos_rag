/**
 * Ingestion Pipeline: Parse CSV/JSON, sanitize author fields, link to collection batches, and insert records
 */

import { normalizeText, sanitizeRawRecordData } from "@/lib/utils/helpers";
import { deduplicateBatch } from "./dedup";
import { createCollectionBatch, updateCollectionBatchCounts } from "@/lib/db/queries/batches";
import { insertRawRecords } from "@/lib/db/queries/records";
import { getSupabaseAdminClient } from "@/lib/db/client";
import { CollectionBatch, RawRecord } from "@/types/database";

export interface ParsedRawItem {
  platform: string;
  raw_text: string;
  source_url?: string;
  date_posted?: string;
  title?: string;
  thread_context?: string;
  metadata?: Record<string, unknown>;
}

export interface IngestionInput {
  batchId?: string;
  provenance: {
    platform: string;
    search_query?: string;
    collection_date?: string;
    collection_method: string;
    language?: string;
    date_range_start?: string;
    date_range_end?: string;
    records_found?: number;
    notes?: string;
  };
  rawItems: ParsedRawItem[];
}

export interface IngestionResult {
  batch: CollectionBatch;
  total_submitted: number;
  records_imported: number;
  duplicates_flagged: number;
  records: RawRecord[];
}

/**
 * Robust CSV parser that correctly handles commas, quotes, and newlines inside quoted fields
 */
export function parseCSV(csvContent: string): ParsedRawItem[] {
  const lines: string[] = [];
  let currentLine = "";
  let insideQuotes = false;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];
    if (char === '"') {
      insideQuotes = !insideQuotes;
      currentLine += char;
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (currentLine.trim()) {
        lines.push(currentLine);
      }
      currentLine = "";
      if (char === "\r" && csvContent[i + 1] === "\n") {
        i++; // skip \n in CRLF
      }
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) {
    lines.push(currentLine);
  }

  if (lines.length < 2) return [];

  // Parse header
  const parseLine = (line: string): string[] => {
    const fields: string[] = [];
    let field = "";
    let inQuote = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuote && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuote = !inQuote;
        }
      } else if (c === "," && !inQuote) {
        fields.push(field.trim());
        field = "";
      } else {
        field += c;
      }
    }
    fields.push(field.trim());
    return fields;
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/['"]+/g, "").trim());

  const textColIndex = headers.findIndex((h) =>
    ["raw_text", "text", "content", "body", "post", "review", "description"].includes(h)
  );
  const platformColIndex = headers.findIndex((h) => ["platform", "source", "site"].includes(h));
  const urlColIndex = headers.findIndex((h) => ["source_url", "url", "link", "permalink"].includes(h));
  const dateColIndex = headers.findIndex((h) => ["date_posted", "date", "created_utc", "timestamp"].includes(h));
  const titleColIndex = headers.findIndex((h) => ["title", "subject", "headline"].includes(h));
  const contextColIndex = headers.findIndex((h) => ["thread_context", "context", "parent"].includes(h));

  const items: ParsedRawItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const rawText = textColIndex !== -1 ? cols[textColIndex] : cols[0];
    if (!rawText || !rawText.trim()) continue;

    const platform = platformColIndex !== -1 && cols[platformColIndex] ? cols[platformColIndex] : "reddit";
    const sourceUrl = urlColIndex !== -1 ? cols[urlColIndex] : undefined;
    const datePosted = dateColIndex !== -1 ? cols[dateColIndex] : undefined;
    const title = titleColIndex !== -1 ? cols[titleColIndex] : undefined;
    const threadContext = contextColIndex !== -1 ? cols[contextColIndex] : undefined;

    // Collect extra columns as metadata (ensuring author/username are stripped)
    const extraMetadata: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      if (
        ![textColIndex, platformColIndex, urlColIndex, dateColIndex, titleColIndex, contextColIndex].includes(idx) &&
        !["author", "username", "user", "author_name"].includes(h)
      ) {
        if (cols[idx]) {
          extraMetadata[h] = cols[idx];
        }
      }
    });

    items.push({
      platform: platform.trim(),
      raw_text: rawText.trim(),
      source_url: sourceUrl || undefined,
      date_posted: datePosted || undefined,
      title: title || undefined,
      thread_context: threadContext || undefined,
      metadata: extraMetadata,
    });
  }

  return items;
}

/**
 * Parses JSON content (array of records or object containing array)
 */
export function parseJSON(jsonContent: string): ParsedRawItem[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonContent);
  } catch (err: any) {
    throw new Error(`Invalid JSON content: ${err.message}`);
  }

  let recordArray: any[] = [];
  if (Array.isArray(parsed)) {
    recordArray = parsed;
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, any>;
    if (Array.isArray(obj.records)) {
      recordArray = obj.records;
    } else if (Array.isArray(obj.data)) {
      recordArray = obj.data;
    } else {
      recordArray = [obj];
    }
  }

  const results: ParsedRawItem[] = [];
  for (const item of recordArray) {
    if (!item || typeof item !== "object") continue;
    const sanitized = sanitizeRawRecordData(item as Record<string, unknown>);
    const rawText = (sanitized.raw_text || sanitized.text || sanitized.content || sanitized.body || "") as string;
    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      continue;
    }

    results.push({
      platform: String(sanitized.platform || "reddit").trim(),
      raw_text: rawText.trim(),
      source_url: sanitized.source_url ? String(sanitized.source_url) : undefined,
      date_posted: sanitized.date_posted ? String(sanitized.date_posted) : undefined,
      title: sanitized.title ? String(sanitized.title) : undefined,
      thread_context: sanitized.thread_context ? String(sanitized.thread_context) : undefined,
      metadata: (sanitized.metadata as Record<string, unknown>) || {},
    });
  }

  return results;
}

/**
 * Executes the full ingestion workflow: batch creation, normalization, deduplication, and DB insertion
 */
export async function processIngestion(input: IngestionInput): Promise<IngestionResult> {
  const supabase = getSupabaseAdminClient();

  // 1. Get or Create Collection Batch
  let batch: CollectionBatch;
  if (input.batchId) {
    const { data: existingBatch, error } = await supabase
      .from("collection_batches")
      .select("*")
      .eq("id", input.batchId)
      .single();
    if (error || !existingBatch) throw new Error(`Collection batch ${input.batchId} not found`);
    batch = existingBatch as CollectionBatch;
  } else {
    batch = await createCollectionBatch({
      platform: input.provenance.platform || "reddit",
      search_query: input.provenance.search_query || null,
      collection_date: input.provenance.collection_date || new Date().toISOString().split("T")[0],
      collection_method: input.provenance.collection_method || "csv_import",
      language: input.provenance.language || "en",
      date_range_start: input.provenance.date_range_start || null,
      date_range_end: input.provenance.date_range_end || null,
      records_found: input.provenance.records_found || input.rawItems.length,
      notes: input.provenance.notes || null,
    });
  }

  // 2. Fetch existing records for cross-dataset deduplication
  const { data: existingRecords } = await supabase
    .from("raw_records")
    .select("id, text_hash, raw_text")
    .limit(1000);

  // 3. Deduplicate
  const deduplicated = deduplicateBatch(input.rawItems, existingRecords || []);

  // 4. Attach batch_id
  const recordsToInsert = deduplicated.map((rec) => ({
    ...rec,
    batch_id: batch.id,
  }));

  // 5. Insert into raw_records
  const insertedRecords = await insertRawRecords(recordsToInsert);

  // 6. Update batch counts
  const duplicateCount = insertedRecords.filter((r) => r.is_duplicate).length;
  const newImportedCount = batch.records_imported + insertedRecords.length;
  await updateCollectionBatchCounts(batch.id, { records_imported: newImportedCount });

  return {
    batch: { ...batch, records_imported: newImportedCount },
    total_submitted: input.rawItems.length,
    records_imported: insertedRecords.length,
    duplicates_flagged: duplicateCount,
    records: insertedRecords,
  };
}
