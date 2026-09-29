import { getGeminiClient, getSynthesisModelName } from "../client";
import {
  QueryPlan,
  QueryPlanSchema,
  AllowedTables,
  AllowedOperations,
  validateQueryStepSafety,
} from "./schemas/query-plan";

export const QUERY_PLANNER_PROMPT_VERSION = "1.0";

export function buildQueryPlannerPrompt(question: string, aspects: string[] = []): string {
  return `You are a SQL Query Planner for a Google Photos behavioral research database.
Your job is to translate a user research question into a safe, structured query plan.

CRITICAL SAFETY RULES:
1. NEVER output raw SQL strings.
2. Only use the allowed tables: ${AllowedTables.join(", ")}
3. Only use the allowed operations: ${AllowedOperations.join(", ")}
4. Allowed tables and columns:
   - retrieval_episodes: id, record_id, visual_item_type, outcome, frustration_level, impact_type, search_attempt_count
   - remembered_clues: id, episode_id, clue_category, clue_value, evidence_type
   - forgotten_attributes: id, episode_id, attribute_category, evidence_type
   - search_behaviors: id, episode_id, behavior_type
   - failure_modes: id, episode_id, failure_type, priority
   - workarounds: id, episode_id, workaround_type
   - raw_records: id, platform, date_posted

TAXONOMY VALUES:
- visual_item_type: photo, screenshot, receipt, document, video, meme, ticket, chat_image, artwork, other
- outcome: success, partial_success, failure, abandoned, unknown
- failure_type: expression, interpretation, candidate_retrieval, recognition, refinement, other
- workaround_type: manual_scroll, browse_by_date, browse_by_person, browse_by_location, check_albums, search_other_app, check_messages, ask_person, search_cloud_folders, google_search, give_up, other

USER QUESTION:
"${question}"

QUANTITATIVE ASPECTS TO SATISFY:
${aspects.map((a) => `- ${a}`).join("\n") || "- Compute relevant dataset metrics"}

OUTPUT JSON FORMAT:
{
  "query_plan": [
    {
      "query_id": "q1",
      "description": "Short explanation of what this query measures",
      "table": "retrieval_episodes",
      "operation": "count" | "count_group_by" | "percentage" | "distribution" | "cross_tabulation" | "top_n" | "comparison",
      "group_by": ["column_name"],
      "target_column": "column_name",
      "filters": [
        { "column": "column_name", "operator": "eq" | "neq" | "in" | "nin" | "gt" | "gte" | "lt" | "lte", "value": "..." }
      ],
      "joins": ["table_name"],
      "limit": 10
    }
  ],
  "reasoning": "Brief explanation of query strategy"
}`;
}

export function generateDefaultQueryPlan(question: string): QueryPlan {
  const q = question.toLowerCase();

  if (q.includes("screenshot")) {
    return {
      query_plan: [
        {
          query_id: "q1",
          description: "Count total screenshot retrieval episodes",
          table: "retrieval_episodes",
          operation: "count",
          filters: [{ column: "visual_item_type", operator: "eq", value: "screenshot" }],
          joins: [],
        },
        {
          query_id: "q2",
          description: "Failure rate for screenshot retrieval",
          table: "retrieval_episodes",
          operation: "percentage",
          filters: [{ column: "visual_item_type", operator: "eq", value: "screenshot" }],
          numerator_filters: [{ column: "outcome", operator: "in", value: ["failure", "abandoned"] }],
          denominator_filters: [{ column: "outcome", operator: "neq", value: "unknown" }],
          joins: [],
        },
      ],
      reasoning: "Compute screenshot volume and outcome failure rate",
    };
  }

  if (q.includes("failure") || q.includes("fail")) {
    return {
      query_plan: [
        {
          query_id: "q1",
          description: "Distribution of failure modes across episodes",
          table: "failure_modes",
          operation: "count_group_by",
          group_by: ["failure_type"],
          filters: [],
          joins: [],
        },
      ],
      reasoning: "Aggregate failure mode counts across the dataset",
    };
  }

  if (q.includes("clue") || q.includes("remember")) {
    return {
      query_plan: [
        {
          query_id: "q1",
          description: "Distribution of remembered clue categories",
          table: "remembered_clues",
          operation: "count_group_by",
          group_by: ["clue_category"],
          filters: [],
          joins: [],
        },
      ],
      reasoning: "Aggregate clue category counts",
    };
  }

  // Default: overall episode breakdown by item type and outcome
  return {
    query_plan: [
      {
        query_id: "q1",
        description: "Distribution of visual item types",
        table: "retrieval_episodes",
        operation: "distribution",
        target_column: "visual_item_type",
        filters: [],
        joins: [],
      },
      {
        query_id: "q2",
        description: "Distribution of retrieval outcomes",
        table: "retrieval_episodes",
        operation: "distribution",
        target_column: "outcome",
        filters: [],
        joins: [],
      },
    ],
    reasoning: "Standard dataset-level summary statistics",
  };
}

export async function generateQueryPlan(question: string, aspects: string[] = []): Promise<QueryPlan> {
  try {
    const gemini = getGeminiClient();
    const modelName = getSynthesisModelName();
    const prompt = buildQueryPlannerPrompt(question, aspects);

    const response = await gemini.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    });

    const text = response.text || "";
    const parsed = JSON.parse(text);
    const validated = QueryPlanSchema.parse(parsed);

    // Validate safety of all steps
    for (const step of validated.query_plan) {
      const safety = validateQueryStepSafety(step);
      if (!safety.valid) {
        throw new Error(`Unsafe query step: ${safety.error}`);
      }
    }

    return validated;
  } catch (err) {
    console.warn("LLM query planner fallback to default plan:", err);
    return generateDefaultQueryPlan(question);
  }
}
