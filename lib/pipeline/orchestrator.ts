/**
 * Pipeline Orchestrator: Manages execution flow and stage coordination
 */

import { updateStageStatus, PipelineStage } from "./status";
import { processIngestion, IngestionInput, IngestionResult } from "./ingest";
import { runRelevanceClassification, ClassificationRunOptions, ClassificationRunSummary } from "@/lib/ai/classifier";

export async function runIngestionStage(input: IngestionInput): Promise<IngestionResult> {
  updateStageStatus("ingest", {
    state: "running",
    started_at: new Date().toISOString(),
    total_items: input.rawItems.length,
    processed_items: 0,
    failed_items: 0,
  });

  try {
    const result = await processIngestion(input);
    updateStageStatus("ingest", {
      state: "completed",
      completed_at: new Date().toISOString(),
      processed_items: result.records_imported,
      failed_items: 0,
    });
    return result;
  } catch (err: any) {
    updateStageStatus("ingest", {
      state: "failed",
      completed_at: new Date().toISOString(),
      error_message: err.message,
    });
    throw err;
  }
}

export async function runClassificationStage(
  options: ClassificationRunOptions = {}
): Promise<ClassificationRunSummary> {
  updateStageStatus("classify", {
    state: "running",
    started_at: new Date().toISOString(),
    total_items: options.limit || 100,
    processed_items: 0,
    failed_items: 0,
  });

  try {
    const summary = await runRelevanceClassification(options);
    updateStageStatus("classify", {
      state: "completed",
      completed_at: new Date().toISOString(),
      processed_items: summary.total_processed,
      failed_items: summary.errors_count,
    });
    return summary;
  } catch (err: any) {
    updateStageStatus("classify", {
      state: "failed",
      completed_at: new Date().toISOString(),
      error_message: err.message,
    });
    throw err;
  }
}

import { runEpisodeExtraction, ExtractionRunOptions, ExtractionRunSummary } from "@/lib/ai/extractor";

export async function runExtractionStage(
  options: ExtractionRunOptions = {}
): Promise<ExtractionRunSummary> {
  updateStageStatus("extract", {
    state: "running",
    started_at: new Date().toISOString(),
    total_items: options.limit || 50,
    processed_items: 0,
    failed_items: 0,
  });

  try {
    const summary = await runEpisodeExtraction(options);
    updateStageStatus("extract", {
      state: "completed",
      completed_at: new Date().toISOString(),
      processed_items: summary.total_records_processed,
      failed_items: summary.errors_count,
    });
    return summary;
  } catch (err: any) {
    updateStageStatus("extract", {
      state: "failed",
      completed_at: new Date().toISOString(),
      error_message: err.message,
    });
    throw err;
  }
}

import { generateOpportunities, OpportunityGenerationResult } from "@/lib/analysis/opportunities";

export async function runAnalysisStage(): Promise<OpportunityGenerationResult> {
  updateStageStatus("analyze", {
    state: "running",
    started_at: new Date().toISOString(),
    total_items: 0,
    processed_items: 0,
    failed_items: 0,
  });

  try {
    const result = await generateOpportunities();
    updateStageStatus("analyze", {
      state: "completed",
      completed_at: new Date().toISOString(),
      processed_items: result.opportunities_generated,
      failed_items: result.errors.length,
    });
    return result;
  } catch (err: any) {
    updateStageStatus("analyze", {
      state: "failed",
      completed_at: new Date().toISOString(),
      error_message: err.message,
    });
    throw err;
  }
}
