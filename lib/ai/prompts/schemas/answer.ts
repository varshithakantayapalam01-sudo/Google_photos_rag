import { z } from "zod";

export const GroundedCitationSchema = z.object({
  episode_id: z.string(),
  quote: z.string(),
  claim: z.string().optional(),
});

export const QuantitativeSummarySchema = z.object({
  metric_name: z.string(),
  value: z.union([z.number(), z.string()]),
  numerator: z.number().optional(),
  denominator: z.number().optional(),
  table_data: z.array(z.record(z.unknown())).optional(),
});

export const GroundedAnswerSchema = z.object({
  answer_markdown: z.string(),
  quantitative_summary: QuantitativeSummarySchema.optional(),
  cited_episode_ids: z.array(z.string()).default([]),
  cited_quotes: z.array(GroundedCitationSchema).default([]),
  contradictory_findings: z.array(z.string()).optional(),
  limitations_note: z.string().optional(),
  evidence_strength_rating: z.enum(["strong", "moderate", "weak", "insufficient"]),
});

export type GroundedCitation = z.infer<typeof GroundedCitationSchema>;
export type QuantitativeSummary = z.infer<typeof QuantitativeSummarySchema>;
export type GroundedAnswer = z.infer<typeof GroundedAnswerSchema>;
