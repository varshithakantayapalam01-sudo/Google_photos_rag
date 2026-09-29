/**
 * Structured Episode Extraction Prompt (Stage 3)
 */

import {
  VISUAL_ITEM_TYPES,
  CLUE_CATEGORIES,
  FORGOTTEN_ATTRIBUTE_CATEGORIES,
  FAILURE_TYPES,
  WORKAROUND_TYPES,
  RETRIEVAL_OUTCOMES,
} from "@/lib/utils/constants";

export const EXTRACTOR_PROMPT_VERSION = "1.0";

export const buildExtractorPrompt = buildEpisodeExtractionPrompt;

export function buildEpisodeExtractionPrompt(rawText: string, platform: string, title?: string | null): string {


  return `You are an expert behavioral researcher extracting structured retrieval episodes from user conversations about finding vaguely remembered visual items in Google Photos.

TAXONOMIES:
- Visual Item Types: ${VISUAL_ITEM_TYPES.join(", ")}
- Clue Categories: ${CLUE_CATEGORIES.join(", ")}
- Forgotten Categories: ${FORGOTTEN_ATTRIBUTE_CATEGORIES.join(", ")}
- Failure Types: ${FAILURE_TYPES.join(", ")}
- Failure Priority: earliest, primary, secondary
- Workaround Types: ${WORKAROUND_TYPES.join(", ")}
- Outcomes: ${RETRIEVAL_OUTCOMES.join(", ")}
- Evidence Types: observed (directly stated), interpreted (strong logical inference from text), hypothesized (plausible assumption)

CRITICAL EXTRACTION RULES:
1. Extract ALL distinct retrieval episodes present in the text (a single post may contain multiple separate retrieval attempts).
2. For EVERY extracted clue, forgotten attribute, search behavior, failure mode, and workaround:
   - Provide the EXACT verbatim quote copied directly from the user's text into "evidence_quote".
   - Assign "evidence_type" (observed / interpreted / hypothesized).
   - Assign "confidence" (0.0 to 1.0).
3. DO NOT generate character start or end positions — application code calculates character spans deterministically.
4. Never invent quotes, numbers, or actions not supported by the source text.
5. Provide a concise, evidence-grounded "rationale_summary" for each episode explaining your extraction decisions (do not output private chain-of-thought).

SOURCE POST:
Platform: ${platform}
${title ? `Title: ${title}\n` : ""}
Raw Text:
"""
${rawText}
"""

OUTPUT FORMAT (JSON):
{
  "episodes": [
    {
      "visual_item_type": "photo",
      "retrieval_goal": "Find a picture of red bridge at sunset with friends",
      "why_user_needs_item": "Wanted to post on social media for friend's birthday",
      "outcome": "failure",
      "impact_type": "emotional",
      "urgency": "medium",
      "frustration_level": "high",
      "consequence": "Could not find photo before the birthday ended",
      "rationale_summary": "User searched for bridge sunset, Google Photos returned Florida photos, user scrolled for an hour and gave up.",
      "extraction_confidence": 0.95,
      "remembered_clues": [
        {
          "clue_category": "visual_feature",
          "clue_description": "Red suspension bridge with orange sunset",
          "evidence_quote": "it was the big red bridge with an orange sunset",
          "evidence_type": "observed",
          "confidence": 0.98
        }
      ],
      "forgotten_attributes": [
        {
          "attribute_category": "exact_date",
          "description": "Forgot whether the trip took place in 2018 or 2019",
          "evidence_quote": "can't remember if it was 2018 or 2019",
          "evidence_type": "observed",
          "confidence": 0.95
        }
      ],
      "search_behaviors": [
        {
          "behavior_type": "initial_query",
          "description": "Typed sunset bridge into search bar",
          "sequence_order": 1,
          "evidence_quote": "I typed sunset bridge"
        }
      ],
      "failure_modes": [
        {
          "failure_type": "candidate_retrieval",
          "failure_priority": "primary",
          "description": "App returned unrelated Florida sunset photos instead of the bridge",
          "evidence_quote": "it only showed random sunsets from Florida",
          "rationale_summary": "Candidate retrieval failed to surface the relevant photo.",
          "confidence": 0.92
        }
      ],
      "workarounds": [
        {
          "workaround_type": "manual_scroll",
          "description": "Scrolled back 5 years through library timeline",
          "evidence_quote": "ended up scrolling for an hour",
          "led_to_success": false
        }
      ]
    }
  ]
}`;
}
