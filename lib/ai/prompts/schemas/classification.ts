/**
 * Classification Output Schema
 */

import { z } from "zod";

export const CLASSIFIER_SCHEMA_VERSION = "1.0";

export const SingleClassificationResultSchema = z.object({
  record_id: z.string(),
  is_relevant: z.boolean(),
  confidence: z.number().min(0).max(1),
  classification_basis: z.string().min(5).max(1000),
  retrieval_target: z.string().nullable(),
  evidence_of_vague_memory: z.string().nullable(),
});

export const BatchClassificationResponseSchema = z.object({
  classifications: z.array(SingleClassificationResultSchema),
});

export type SingleClassificationResult = z.infer<typeof SingleClassificationResultSchema>;
export type BatchClassificationResponse = z.infer<typeof BatchClassificationResponseSchema>;
