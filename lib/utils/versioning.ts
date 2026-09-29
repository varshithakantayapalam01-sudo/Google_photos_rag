/**
 * Version tracking helpers for AI models, prompt templates, and output schemas
 */

import {
  DEFAULT_CLASSIFIER_PROMPT_VERSION,
  DEFAULT_CLASSIFIER_SCHEMA_VERSION,
  DEFAULT_EXTRACTOR_PROMPT_VERSION,
  DEFAULT_EXTRACTOR_SCHEMA_VERSION,
  DEFAULT_QUERY_PLANNER_PROMPT_VERSION,
  DEFAULT_QUERY_PLANNER_SCHEMA_VERSION,
  DEFAULT_ANSWER_PROMPT_VERSION,
  DEFAULT_ANSWER_SCHEMA_VERSION,
  DEFAULT_SYNTHESIS_PROMPT_VERSION,
  DEFAULT_SYNTHESIS_SCHEMA_VERSION,
} from "./constants";

export interface PipelineVersionInfo {
  model_version: string;
  prompt_version: string;
  schema_version: string;
}

export function getClassificationVersions(): PipelineVersionInfo {
  return {
    model_version: process.env.GEMINI_MODEL_CLASSIFICATION || "gemini-3.5-flash-lite",
    prompt_version: DEFAULT_CLASSIFIER_PROMPT_VERSION,
    schema_version: DEFAULT_CLASSIFIER_SCHEMA_VERSION,
  };
}

export function getExtractionVersions(): PipelineVersionInfo {
  return {
    model_version: process.env.GEMINI_MODEL_EXTRACTION || "gemini-3.8-flash",
    prompt_version: DEFAULT_EXTRACTOR_PROMPT_VERSION,
    schema_version: DEFAULT_EXTRACTOR_SCHEMA_VERSION,
  };
}

export function getQueryPlannerVersions(): PipelineVersionInfo {
  return {
    model_version: process.env.GEMINI_MODEL_EXTRACTION || "gemini-3.8-flash",
    prompt_version: DEFAULT_QUERY_PLANNER_PROMPT_VERSION,
    schema_version: DEFAULT_QUERY_PLANNER_SCHEMA_VERSION,
  };
}

export function getAnswerGenerationVersions(): PipelineVersionInfo {
  return {
    model_version: process.env.GEMINI_MODEL_SYNTHESIS || "gemini-3.8-flash",
    prompt_version: DEFAULT_ANSWER_PROMPT_VERSION,
    schema_version: DEFAULT_ANSWER_SCHEMA_VERSION,
  };
}

export function getSynthesisVersions(): PipelineVersionInfo {
  return {
    model_version: process.env.GEMINI_MODEL_SYNTHESIS || "gemini-3.8-flash",
    prompt_version: DEFAULT_SYNTHESIS_PROMPT_VERSION,
    schema_version: DEFAULT_SYNTHESIS_SCHEMA_VERSION,
  };
}
