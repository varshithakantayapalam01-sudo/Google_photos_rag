/**
 * Pipeline Stage and Status tracking
 */

export type PipelineStage = "ingest" | "classify" | "extract" | "embed" | "analyze" | "validate";
export type StageState = "idle" | "running" | "completed" | "failed";

export interface PipelineStageStatus {
  stage: PipelineStage;
  state: StageState;
  total_items: number;
  processed_items: number;
  failed_items: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export interface PipelineStatus {
  active_stage: PipelineStage | null;
  overall_state: StageState;
  stages: Record<PipelineStage, PipelineStageStatus>;
}

// In-memory runtime status tracker (for single-instance prototype state)
const globalPipelineStatus: PipelineStatus = {
  active_stage: null,
  overall_state: "idle",
  stages: {
    ingest: { stage: "ingest", state: "idle", total_items: 0, processed_items: 0, failed_items: 0 },
    classify: { stage: "classify", state: "idle", total_items: 0, processed_items: 0, failed_items: 0 },
    extract: { stage: "extract", state: "idle", total_items: 0, processed_items: 0, failed_items: 0 },
    embed: { stage: "embed", state: "idle", total_items: 0, processed_items: 0, failed_items: 0 },
    analyze: { stage: "analyze", state: "idle", total_items: 0, processed_items: 0, failed_items: 0 },
    validate: { stage: "validate", state: "idle", total_items: 0, processed_items: 0, failed_items: 0 },
  },
};

export function getPipelineStatus(): PipelineStatus {
  return JSON.parse(JSON.stringify(globalPipelineStatus));
}

export function updateStageStatus(
  stage: PipelineStage,
  updates: Partial<PipelineStageStatus>
): void {
  const current = globalPipelineStatus.stages[stage];
  globalPipelineStatus.stages[stage] = { ...current, ...updates };

  if (updates.state === "running") {
    globalPipelineStatus.active_stage = stage;
    globalPipelineStatus.overall_state = "running";
  } else if (updates.state === "completed") {
    if (globalPipelineStatus.active_stage === stage) {
      globalPipelineStatus.active_stage = null;
      globalPipelineStatus.overall_state = "idle";
    }
  } else if (updates.state === "failed") {
    globalPipelineStatus.overall_state = "failed";
  }
}
