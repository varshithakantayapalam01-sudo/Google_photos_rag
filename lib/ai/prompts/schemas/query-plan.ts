import { z } from "zod";

export const AllowedTables = [
  "retrieval_episodes",
  "remembered_clues",
  "forgotten_attributes",
  "search_behaviors",
  "failure_modes",
  "workarounds",
  "raw_records",
] as const;

export const AllowedOperations = [
  "count",
  "count_group_by",
  "percentage",
  "distribution",
  "cross_tabulation",
  "top_n",
  "comparison",
] as const;

export const AllowedColumns: Record<string, string[]> = {
  retrieval_episodes: [
    "id",
    "record_id",
    "visual_item_type",
    "outcome",
    "frustration_level",
    "impact_type",
    "search_attempt_count",
  ],
  remembered_clues: ["id", "episode_id", "clue_category", "clue_value", "evidence_type"],
  forgotten_attributes: ["id", "episode_id", "attribute_category", "evidence_type"],
  search_behaviors: ["id", "episode_id", "behavior_type"],
  failure_modes: ["id", "episode_id", "failure_type", "priority"],
  workarounds: ["id", "episode_id", "workaround_type"],
  raw_records: ["id", "platform", "date_posted"],
};

export const QueryFilterSchema = z.object({
  column: z.string(),
  operator: z.enum(["eq", "neq", "in", "nin", "gt", "gte", "lt", "lte", "is_null", "is_not_null"]),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]).optional(),
});

export const QueryStepSchema = z.object({
  query_id: z.string(),
  description: z.string(),
  table: z.enum(AllowedTables),
  operation: z.enum(AllowedOperations),
  group_by: z.array(z.string()).optional(),
  target_column: z.string().optional(),
  filters: z.array(QueryFilterSchema).optional().default([]),
  joins: z.array(z.enum(AllowedTables)).optional().default([]),
  limit: z.number().int().positive().max(100).optional(),
  numerator_filters: z.array(QueryFilterSchema).optional(),
  denominator_filters: z.array(QueryFilterSchema).optional(),
});

export const QueryPlanSchema = z.object({
  query_plan: z.array(QueryStepSchema).min(1).max(5),
  reasoning: z.string().optional(),
});

export type QueryFilter = z.infer<typeof QueryFilterSchema>;
export type QueryStep = z.infer<typeof QueryStepSchema>;
export type QueryPlan = z.infer<typeof QueryPlanSchema>;

/**
 * Validates whether a query step conforms to strict table and column allowlists.
 */
export function validateQueryStepSafety(step: QueryStep): { valid: boolean; error?: string } {
  if (!AllowedTables.includes(step.table)) {
    return { valid: false, error: `Unauthorized table: ${step.table}` };
  }

  const allowedColsForTable = AllowedColumns[step.table] || [];

  if (step.target_column && !allowedColsForTable.includes(step.target_column)) {
    return { valid: false, error: `Unauthorized column: ${step.target_column} for table ${step.table}` };
  }

  if (step.group_by) {
    for (const col of step.group_by) {
      if (!allowedColsForTable.includes(col)) {
        return { valid: false, error: `Unauthorized group_by column: ${col} for table ${step.table}` };
      }
    }
  }

  if (step.filters) {
    for (const filter of step.filters) {
      if (!allowedColsForTable.includes(filter.column)) {
        // Also check if filter column exists in allowed joins
        const foundInJoin = step.joins.some(
          (j) => AllowedColumns[j] && AllowedColumns[j].includes(filter.column)
        );
        if (!foundInJoin) {
          return { valid: false, error: `Unauthorized filter column: ${filter.column}` };
        }
      }
    }
  }

  return { valid: true };
}
