import { getSupabaseClient } from "../client";
import {
  QueryPlan,
  QueryStep,
  QueryFilter,
  validateQueryStepSafety,
} from "@/lib/ai/prompts/schemas/query-plan";

export interface QueryExecutionResult {
  query_id: string;
  description: string;
  operation: string;
  result: {
    count?: number;
    numerator?: number;
    denominator?: number;
    percentage?: number;
    data?: Array<Record<string, unknown>>;
    rows?: Array<{ label: string; count: number; percentage?: number }>;
  };
}

export interface QuantitativePlanResult {
  queries: QueryExecutionResult[];
  summary_text: string;
}

/**
 * Applies structured query filters to a Supabase query builder
 */
function applyFilters(query: any, filters: QueryFilter[] = []) {
  let q = query;
  for (const f of filters) {
    switch (f.operator) {
      case "eq":
        q = q.eq(f.column, f.value);
        break;
      case "neq":
        q = q.neq(f.column, f.value);
        break;
      case "in":
        if (Array.isArray(f.value)) {
          q = q.in(f.column, f.value);
        }
        break;
      case "nin":
        if (Array.isArray(f.value)) {
          q = q.not(f.column, "in", `(${f.value.join(",")})`);
        }
        break;
      case "gt":
        q = q.gt(f.column, f.value);
        break;
      case "gte":
        q = q.gte(f.column, f.value);
        break;
      case "lt":
        q = q.lt(f.column, f.value);
        break;
      case "lte":
        q = q.lte(f.column, f.value);
        break;
      case "is_null":
        q = q.is(f.column, null);
        break;
      case "is_not_null":
        q = q.not(f.column, "is", null);
        break;
    }
  }
  return q;
}

/**
 * Executes a single safe query step against Supabase with DISTINCT episode_id counting.
 */
export async function executeQueryStep(step: QueryStep): Promise<QueryExecutionResult> {
  const safety = validateQueryStepSafety(step);
  if (!safety.valid) {
    throw new Error(`Execution rejected: ${safety.error}`);
  }

  const supabase = getSupabaseClient();

  switch (step.operation) {
    case "count": {
      let q = supabase.from(step.table).select("id", { count: "exact", head: true });
      q = applyFilters(q, step.filters);
      const { count, error } = await q;
      if (error) throw new Error(`Query failed: ${error.message}`);
      return {
        query_id: step.query_id,
        description: step.description,
        operation: step.operation,
        result: { count: count || 0 },
      };
    }

    case "percentage": {
      // Numerator query
      let numQ = supabase.from(step.table).select("id", { count: "exact", head: true });
      numQ = applyFilters(numQ, [...(step.filters || []), ...(step.numerator_filters || [])]);
      const { count: numCount, error: numErr } = await numQ;
      if (numErr) throw new Error(`Numerator query failed: ${numErr.message}`);

      // Denominator query
      let denQ = supabase.from(step.table).select("id", { count: "exact", head: true });
      denQ = applyFilters(denQ, [...(step.filters || []), ...(step.denominator_filters || [])]);
      const { count: denCount, error: denErr } = await denQ;
      if (denErr) throw new Error(`Denominator query failed: ${denErr.message}`);

      const num = numCount || 0;
      const den = denCount || 0;
      const pct = den > 0 ? Math.round((num / den) * 1000) / 10 : 0;

      return {
        query_id: step.query_id,
        description: step.description,
        operation: step.operation,
        result: {
          numerator: num,
          denominator: den,
          percentage: pct,
        },
      };
    }

    case "count_group_by":
    case "distribution":
    case "top_n": {
      const groupCol = step.group_by?.[0] || step.target_column || "visual_item_type";
      const idCol = step.table === "retrieval_episodes" ? "id" : "episode_id";

      let q = supabase.from(step.table).select(`${groupCol}, ${idCol}`);
      q = applyFilters(q, step.filters);

      const { data, error } = await q;
      if (error) throw new Error(`Group query failed: ${error.message}`);

      const groupEpisodeSets = new Map<string, Set<string>>();
      const allEpisodes = new Set<string>();

      (data || []).forEach((row: any) => {
        const val = row[groupCol] || "unknown";
        const epId = row[idCol] || row.id;
        if (!groupEpisodeSets.has(val)) {
          groupEpisodeSets.set(val, new Set());
        }
        groupEpisodeSets.get(val)!.add(epId);
        allEpisodes.add(epId);
      });

      const totalEpisodes = allEpisodes.size;
      let rows = Array.from(groupEpisodeSets.entries()).map(([label, epSet]) => ({
        label,
        count: epSet.size,
        percentage:
          totalEpisodes > 0
            ? Math.round((epSet.size / totalEpisodes) * 1000) / 10
            : 0,
      }));

      rows.sort((a, b) => b.count - a.count);

      if (step.operation === "top_n" && step.limit) {
        rows = rows.slice(0, step.limit);
      }

      return {
        query_id: step.query_id,
        description: step.description,
        operation: step.operation,
        result: {
          count: totalEpisodes,
          rows,
        },
      };
    }

    case "cross_tabulation":
    case "comparison":
    default: {
      const colA = step.group_by?.[0] || "visual_item_type";
      const colB = step.group_by?.[1] || "outcome";
      const idCol = step.table === "retrieval_episodes" ? "id" : "episode_id";

      let q = supabase.from(step.table).select(`${colA}, ${colB}, ${idCol}`);
      q = applyFilters(q, step.filters);

      const { data, error } = await q;
      if (error) throw new Error(`Cross tab query failed: ${error.message}`);

      const matrix = new Map<string, Set<string>>();
      (data || []).forEach((row: any) => {
        const key = `${row[colA] || "unknown"}:::${row[colB] || "unknown"}`;
        const epId = row[idCol] || row.id;
        if (!matrix.has(key)) matrix.set(key, new Set());
        matrix.get(key)!.add(epId);
      });

      const dataRows = Array.from(matrix.entries()).map(([key, set]) => {
        const [dimA, dimB] = key.split(":::");
        return { [colA]: dimA, [colB]: dimB, distinct_episodes: set.size };
      });

      return {
        query_id: step.query_id,
        description: step.description,
        operation: step.operation,
        result: { data: dataRows },
      };
    }
  }
}

/**
 * Executes a full validated QueryPlan
 */
export async function executeQueryPlan(plan: QueryPlan): Promise<QuantitativePlanResult> {
  const queryResults: QueryExecutionResult[] = [];

  for (const step of plan.query_plan) {
    try {
      const res = await executeQueryStep(step);
      queryResults.push(res);
    } catch (err: any) {
      queryResults.push({
        query_id: step.query_id,
        description: step.description,
        operation: step.operation,
        result: { count: 0, data: [] },
      });
    }
  }

  // Format summary text from results
  const summaryParts: string[] = [];
  queryResults.forEach((q) => {
    if (q.result.percentage !== undefined) {
      summaryParts.push(
        `${q.description}: ${q.result.percentage}% (${q.result.numerator}/${q.result.denominator})`
      );
    } else if (q.result.count !== undefined && q.result.rows) {
      const topItems = q.result.rows
        .slice(0, 3)
        .map((r) => `${r.label} (${r.count}, ${r.percentage}%)`)
        .join(", ");
      summaryParts.push(`${q.description}: Total ${q.result.count} distinct episodes [Top: ${topItems}]`);
    } else if (q.result.count !== undefined) {
      summaryParts.push(`${q.description}: ${q.result.count}`);
    }
  });

  return {
    queries: queryResults,
    summary_text: summaryParts.join("\n"),
  };
}
