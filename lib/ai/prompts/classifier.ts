/**
 * Relevance Classification Prompt Template (Stage 2)
 */

export const CLASSIFIER_PROMPT_VERSION = "1.0";

export function buildClassificationPrompt(
  records: Array<{ id: string; raw_text: string; platform: string; title?: string | null }>
): string {
  const recordsJson = JSON.stringify(
    records.map((r) => ({
      record_id: r.id,
      platform: r.platform,
      title: r.title || null,
      raw_text: r.raw_text,
    })),
    null,
    2
  );

  return `You are an expert behavioral researcher classifying user posts for a Google Photos product research study.

OBJECTIVE:
Determine whether each user post is RELEVANT to the study of "how users retrieve vaguely remembered visual items from their photo libraries".

RELEVANCE CRITERIA:
- A post is RELEVANT (is_relevant: true) when it describes an experience where a user is trying to find/locate a specific photo, screenshot, receipt, document, video, or visual item that they remember INCOMPLETELY (e.g., they remember visual features, people, setting, rough time, but forgot exact date, album, filename, or location).
- A post is IRRELEVANT (is_relevant: false) when it primarily discusses:
  * Cloud backup, sync failures, or storage quotas
  * Photo editing, filters, or RAW rendering issues
  * Sharing links, partner sharing, or shared album permissions
  * Account recovery, login, or billing issues
  * Duplicate detection complaints without a retrieval scenario
  * Generic performance complaints or app crashes
  * Casual browsing without a specific target item in mind
  * General search complaints that do NOT involve vague memory

INSTRUCTIONS:
1. Process each record in the provided JSON array.
2. For each record, determine is_relevant (true/false) and assign a confidence score between 0.0 and 1.0.
3. Provide a concise, evidence-grounded classification_basis explaining why the post is relevant or irrelevant.
4. If relevant, extract the retrieval_target (what visual item the user wanted to find) and evidence_of_vague_memory (quotes/clues showing incomplete memory). If irrelevant, set both to null.
5. Return the result strictly in valid JSON matching the following structure:
{
  "classifications": [
    {
      "record_id": "string",
      "is_relevant": true,
      "confidence": 0.95,
      "classification_basis": "User is searching for a concert photo from 2019 but only remembers red stage lighting.",
      "retrieval_target": "concert photo",
      "evidence_of_vague_memory": "remembers red lighting but cannot recall month or album"
    }
  ]
}

RECORDS TO CLASSIFY:
${recordsJson}`;
}
