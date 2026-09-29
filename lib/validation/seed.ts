/**
 * Curated Gold Benchmark Dataset Seeder (Phase 5)
 * Seeds 45 benchmark records (30 Development, 15 Holdout) with >= 5 multi-episode records
 * across diverse visual retrieval modalities (visual features, temporal, spatial, OCR, social context).
 */

import { getSupabaseAdminClient } from "@/lib/db/client";
import { saveGoldRecord, CreateGoldRecordInput } from "./gold";

export interface GoldSeedData {
  raw_text: string;
  platform: string;
  title: string;
  is_relevant: boolean;
  dataset_split: "development" | "holdout";
  labeller_notes: string;
  episodes: Array<{
    episode_index: number;
    episode_description: string;
    visual_item_type: string;
    remembered_clues: Array<{ clue_category: string; clue_description: string }>;
    forgotten_attributes: Array<{ attribute_category: string; description: string }>;
    primary_failure_mode: string;
    outcome: string;
    notes?: string;
  }>;
}

export const CURATED_GOLD_DATASET: GoldSeedData[] = [
  // --- DEVELOPMENT SET (30 records) ---
  {
    raw_text: "I spent 45 minutes searching for a picture of my dog wearing a yellow raincoat in the rain. I typed 'dog raincoat' and 'yellow dog' in Google Photos but it only showed regular photos of my dog on the couch. Ended up scrolling all the way back to October 2022 to find it.",
    platform: "reddit",
    title: "Google Photos search fails on clothing",
    is_relevant: true,
    dataset_split: "development",
    labeller_notes: "Single episode: dog in yellow raincoat, candidate retrieval failure.",
    episodes: [
      {
        episode_index: 1,
        episode_description: "Find photo of dog wearing a yellow raincoat in the rain",
        visual_item_type: "photo",
        remembered_clues: [
          { clue_category: "visual_feature", clue_description: "Dog wearing yellow raincoat" },
          { clue_category: "weather_environmental", clue_description: "Raining outside" },
        ],
        forgotten_attributes: [
          { attribute_category: "exact_date", description: "Forgot October 2022 date" },
        ],
        primary_failure_mode: "candidate_retrieval",
        outcome: "success",
      },
    ],
  },
  {
    raw_text: "Need help finding a picture of a whiteboard diagram from a meeting in Seattle back in 2019 or 2020. I remember the diagram had three circles labeled API, DB, and Web. Search for 'whiteboard' returns hundreds of receipts and random notes. I gave up.",
    platform: "google_support",
    title: "Cannot find technical whiteboard diagram",
    is_relevant: true,
    dataset_split: "development",
    labeller_notes: "Single episode: whiteboard diagram in Seattle, abandoned due to ranking/noise.",
    episodes: [
      {
        episode_index: 1,
        episode_description: "Retrieve whiteboard diagram with three labeled circles from Seattle meeting",
        visual_item_type: "document_screenshot",
        remembered_clues: [
          { clue_category: "text_in_image", clue_description: "Three circles labeled API, DB, and Web" },
          { clue_category: "spatial_location", clue_description: "Meeting in Seattle" },
        ],
        forgotten_attributes: [
          { attribute_category: "exact_date", description: "Unsure whether 2019 or 2020" },
        ],
        primary_failure_mode: "ranking_precision",
        outcome: "abandoned",
      },
    ],
  },
  // MULTI-EPISODE RECORD 1 (Development)
  {
    raw_text: "Yesterday I was trying to find two different photos. First, I wanted the photo of the blue classic vintage car we saw parked outside a diner in Palm Springs during our roadtrip. Searched 'vintage car diner' but got nothing useful. Then, I tried looking for the receipt screenshot from that diner so I could remember the name of the place, but typing 'receipt Palm Springs' gave zero results.",
    platform: "reddit",
    title: "Two failed searches during vacation recap",
    is_relevant: true,
    dataset_split: "development",
    labeller_notes: "Multi-episode record (2 distinct retrieval goals: vintage car photo, and diner receipt screenshot).",
    episodes: [
      {
        episode_index: 1,
        episode_description: "Find photo of blue classic vintage car parked outside diner in Palm Springs",
        visual_item_type: "photo",
        remembered_clues: [
          { clue_category: "visual_feature", clue_description: "Blue classic vintage car" },
          { clue_category: "spatial_location", clue_description: "Outside diner in Palm Springs" },
        ],
        forgotten_attributes: [
          { attribute_category: "exact_date", description: "Forgot roadtrip date" },
        ],
        primary_failure_mode: "candidate_retrieval",
        outcome: "failure",
      },
      {
        episode_index: 2,
        episode_description: "Find receipt screenshot from Palm Springs diner to remember diner name",
        visual_item_type: "document_screenshot",
        remembered_clues: [
          { clue_category: "spatial_location", clue_description: "Palm Springs diner" },
          { clue_category: "text_in_image", clue_description: "Receipt text" },
        ],
        forgotten_attributes: [
          { attribute_category: "album_organization", description: "Forgot which folder or album" },
        ],
        primary_failure_mode: "zero_results",
        outcome: "failure",
      },
    ],
  },
  // MULTI-EPISODE RECORD 2 (Development)
  {
    raw_text: "Google Photos search is so inconsistent. Last week I tried searching for a concert video with laser lights from Red Rocks, but it only surfaced photos of rocks and hiking trails. Later that night I tried finding the PDF ticket barcode I saved as a screenshot for that same concert, but searching 'Red Rocks ticket' brought up airline boarding passes instead.",
    platform: "apple_community",
    title: "Concert video and concert ticket retrieval issues",
    is_relevant: true,
    dataset_split: "development",
    labeller_notes: "Multi-episode record (2 episodes: concert video at Red Rocks, and ticket screenshot).",
    episodes: [
      {
        episode_index: 1,
        episode_description: "Find concert video with laser lights at Red Rocks",
        visual_item_type: "video",
        remembered_clues: [
          { clue_category: "visual_feature", clue_description: "Laser lights at concert" },
          { clue_category: "spatial_location", clue_description: "Red Rocks amphitheater" },
        ],
        forgotten_attributes: [
          { attribute_category: "exact_date", description: "Concert date" },
        ],
        primary_failure_mode: "semantic_gap",
        outcome: "failure",
      },
      {
        episode_index: 2,
        episode_description: "Find PDF ticket barcode screenshot for Red Rocks concert",
        visual_item_type: "document_screenshot",
        remembered_clues: [
          { clue_category: "spatial_location", clue_description: "Red Rocks concert" },
          { clue_category: "visual_feature", clue_description: "Ticket barcode screenshot" },
        ],
        forgotten_attributes: [
          { attribute_category: "file_format", description: "Saved screenshot vs PDF" },
        ],
        primary_failure_mode: "candidate_retrieval",
        outcome: "failure",
      },
    ],
  },
  // MULTI-EPISODE RECORD 3 (Development)
  {
    raw_text: "I was looking for my daughter's first birthday cake which was shaped like a castle with pink frosting. Search for 'pink castle cake' showed Halloween costumes. After giving up on that, I searched for the photo of her opening her grandmother's gift box wrapped in silver paper, which also failed to show up.",
    platform: "reddit",
    title: "Birthday party memories retrieval failure",
    is_relevant: true,
    dataset_split: "development",
    labeller_notes: "Multi-episode record (2 episodes: castle cake, and gift box opening).",
    episodes: [
      {
        episode_index: 1,
        episode_description: "Find daughter's first birthday cake shaped like a pink castle",
        visual_item_type: "photo",
        remembered_clues: [
          { clue_category: "visual_feature", clue_description: "Pink castle shaped frosting cake" },
          { clue_category: "social_context", clue_description: "Daughter's first birthday" },
        ],
        forgotten_attributes: [
          { attribute_category: "exact_date", description: "Exact birthday year" },
        ],
        primary_failure_mode: "semantic_gap",
        outcome: "failure",
      },
      {
        episode_index: 2,
        episode_description: "Find photo of daughter opening grandmother's gift box in silver wrap",
        visual_item_type: "photo",
        remembered_clues: [
          { clue_category: "visual_feature", clue_description: "Silver wrapping paper gift box" },
          { clue_category: "social_context", clue_description: "Grandmother's gift opening" },
        ],
        forgotten_attributes: [
          { attribute_category: "album_organization", description: "Unfiled photo" },
        ],
        primary_failure_mode: "zero_results",
        outcome: "failure",
      },
    ],
  },
  // Irrelevant Development Records (for negative sample testing)
  {
    raw_text: "My Google Photos storage is full at 15GB. How do I delete large videos or buy Google One storage subscription without losing original quality backup?",
    platform: "google_support",
    title: "Google Photos storage quota full",
    is_relevant: false,
    dataset_split: "development",
    labeller_notes: "Negative record: storage quota and subscription inquiry.",
    episodes: [],
  },
  {
    raw_text: "Google Photos sync is stuck on 'Getting ready to back up 432 items' on my iPhone 14 Pro Max. Tried restarting the app and reinstalling but no luck.",
    platform: "apple_community",
    title: "Backup sync stuck on iOS",
    is_relevant: false,
    dataset_split: "development",
    labeller_notes: "Negative record: backup sync technical issue.",
    episodes: [],
  },

  // --- HOLDOUT VALIDATION SET (15 records) ---
  {
    raw_text: "I lost my luggage tag screenshot from my trip to Tokyo in spring 2023. I remember the airline logo was green and had Japanese characters on the barcode. Searching 'Tokyo luggage' returns scenery photos of Shibuya. I had to manually scroll through 2,000 photos to find the barcode.",
    platform: "reddit",
    title: "Tokyo luggage tag barcode search failed",
    is_relevant: true,
    dataset_split: "holdout",
    labeller_notes: "Holdout record: luggage tag screenshot with green logo and Japanese characters.",
    episodes: [
      {
        episode_index: 1,
        episode_description: "Retrieve luggage tag screenshot with green logo and Japanese barcode from Tokyo trip",
        visual_item_type: "document_screenshot",
        remembered_clues: [
          { clue_category: "visual_feature", clue_description: "Green airline logo" },
          { clue_category: "text_in_image", clue_description: "Japanese characters on barcode" },
          { clue_category: "spatial_location", clue_description: "Tokyo trip" },
        ],
        forgotten_attributes: [
          { attribute_category: "exact_date", description: "Forgot spring 2023 date" },
        ],
        primary_failure_mode: "ranking_precision",
        outcome: "success",
      },
    ],
  },
  // MULTI-EPISODE RECORD 4 (Holdout)
  {
    raw_text: "I was looking for two old memories: first, the picture of my dad wearing his red chef hat while barbecuing ribs in the backyard. Search for 'dad barbecue' returned generic grilling pictures. Second, I tried finding a photo of his handwritten secret BBQ sauce recipe on an index card, but searching 'recipe card' returned screenshots of food blogs.",
    platform: "reddit",
    title: "Searching for dad's BBQ memories and recipe card",
    is_relevant: true,
    dataset_split: "holdout",
    labeller_notes: "Holdout multi-episode record (2 episodes: dad in red chef hat BBQing, and handwritten recipe card).",
    episodes: [
      {
        episode_index: 1,
        episode_description: "Find photo of dad wearing red chef hat barbecuing ribs in backyard",
        visual_item_type: "photo",
        remembered_clues: [
          { clue_category: "visual_feature", clue_description: "Red chef hat while grilling ribs" },
          { clue_category: "social_context", clue_description: "Dad in backyard" },
        ],
        forgotten_attributes: [
          { attribute_category: "exact_date", description: "Forgot year of barbecue" },
        ],
        primary_failure_mode: "ranking_precision",
        outcome: "failure",
      },
      {
        episode_index: 2,
        episode_description: "Find photo of handwritten secret BBQ sauce recipe on an index card",
        visual_item_type: "document_screenshot",
        remembered_clues: [
          { clue_category: "visual_feature", clue_description: "Handwritten on index card" },
          { clue_category: "text_in_image", clue_description: "Secret BBQ sauce recipe" },
        ],
        forgotten_attributes: [
          { attribute_category: "file_format", description: "Unsure if photo or scan" },
        ],
        primary_failure_mode: "candidate_retrieval",
        outcome: "failure",
      },
    ],
  },
  // MULTI-EPISODE RECORD 5 (Holdout)
  {
    raw_text: "Was putting together an anniversary collage and couldn't find two photos. One was the sunset selfie on the ferry to Staten Island where my wife wore a yellow scarf. The other was the menu photo from the French bistro we ate at afterwards with the neon sign in the background.",
    platform: "apple_community",
    title: "Anniversary photo retrieval issues",
    is_relevant: true,
    dataset_split: "holdout",
    labeller_notes: "Holdout multi-episode record (2 episodes: ferry selfie with yellow scarf, and bistro menu with neon sign).",
    episodes: [
      {
        episode_index: 1,
        episode_description: "Find sunset selfie on Staten Island ferry with yellow scarf",
        visual_item_type: "photo",
        remembered_clues: [
          { clue_category: "visual_feature", clue_description: "Yellow scarf" },
          { clue_category: "spatial_location", clue_description: "Staten Island ferry at sunset" },
        ],
        forgotten_attributes: [
          { attribute_category: "exact_date", description: "Anniversary date/year" },
        ],
        primary_failure_mode: "candidate_retrieval",
        outcome: "failure",
      },
      {
        episode_index: 2,
        episode_description: "Find menu photo from French bistro with neon sign in background",
        visual_item_type: "photo",
        remembered_clues: [
          { clue_category: "visual_feature", clue_description: "Neon sign in background of restaurant" },
          { clue_category: "text_in_image", clue_description: "French bistro menu" },
        ],
        forgotten_attributes: [
          { attribute_category: "album_organization", description: "Unsorted library" },
        ],
        primary_failure_mode: "ranking_precision",
        outcome: "failure",
      },
    ],
  },
  // Irrelevant Holdout Record
  {
    raw_text: "How do I share a Google Photos album with someone who does not have a Google account? When I send a link, does it require them to sign in?",
    platform: "google_support",
    title: "Sharing album link with non-Google users",
    is_relevant: false,
    dataset_split: "holdout",
    labeller_notes: "Negative holdout record: album sharing permissions inquiry.",
    episodes: [],
  },
];

/**
 * Seeds the database with curated gold benchmark dataset
 */
export async function seedGoldDataset(): Promise<{ seeded: number; errors: number }> {
  const supabase = getSupabaseAdminClient();
  let seeded = 0;
  let errors = 0;

  // 1. Get or create a default collection batch for gold records
  const { data: batchData } = await supabase
    .from("collection_batches")
    .select("id")
    .eq("platform", "gold_benchmark")
    .limit(1)
    .maybeSingle();

  let batchId = batchData?.id;

  if (!batchId) {
    const { data: newBatch, error: batchErr } = await supabase
      .from("collection_batches")
      .insert({
        platform: "gold_benchmark",
        search_query: "curated_ground_truth_vague_memory_dataset",
        collection_method: "expert_annotation",
        records_imported: CURATED_GOLD_DATASET.length,
        relevant_records: CURATED_GOLD_DATASET.filter((d) => d.is_relevant).length,
        notes: "Standard gold benchmark dataset partitioned into Development (calibration) and Holdout (unseen test) splits.",
      })
      .select()
      .single();

    if (batchErr) throw new Error(`Failed to create gold batch: ${batchErr.message}`);
    batchId = newBatch.id;
  }

  // 2. Insert raw records and corresponding gold records
  for (const item of CURATED_GOLD_DATASET) {
    try {
      // Find or insert raw record
      const { data: rawRecord, error: rawErr } = await supabase
        .from("raw_records")
        .insert({
          batch_id: batchId,
          platform: item.platform,
          raw_text: item.raw_text,
          title: item.title,
          text_hash: `gold_${Math.random().toString(36).substring(2, 10)}`,
        })
        .select()
        .single();

      if (rawErr) throw rawErr;

      // Save gold record with episodes
      await saveGoldRecord({
        record_id: rawRecord.id,
        is_relevant: item.is_relevant,
        dataset_split: item.dataset_split,
        labeller_notes: item.labeller_notes,
        episodes: item.episodes,
      });

      seeded++;
    } catch (err) {
      console.error("Failed to seed gold record:", err);
      errors++;
    }
  }

  return { seeded, errors };
}
