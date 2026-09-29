import { describe, it, expect } from "vitest";
import { generateResearchSynthesis } from "@/lib/analysis/synthesis";
import { computeResearchLimitations } from "@/lib/analysis/limitations";

describe("Phase 9 — Research Synthesis Epistemic Tiers", () => {
  it("structures synthesis into three distinct sections", async () => {
    const synthesis = await generateResearchSynthesis();

    expect(synthesis).toHaveProperty("what_we_know");
    expect(synthesis).toHaveProperty("what_we_think");
    expect(synthesis).toHaveProperty("what_to_validate");

    expect(Array.isArray(synthesis.what_we_know)).toBe(true);
    expect(Array.isArray(synthesis.what_we_think)).toBe(true);
    expect(Array.isArray(synthesis.what_to_validate)).toBe(true);
  });

  it("ensures 'what_we_know' findings have strong evidence and platform diversity", async () => {
    const synthesis = await generateResearchSynthesis();

    expect(synthesis.what_we_know.length).toBeGreaterThanOrEqual(2);

    for (const finding of synthesis.what_we_know) {
      expect(finding.insight_type).toBe("what_we_know");
      expect(finding.evidence_strength).toBe("strong");
      expect(finding.supporting_episode_count).toBeGreaterThanOrEqual(5);
      expect(finding.source_diversity).toBeGreaterThanOrEqual(3);
      expect(finding.insight_statement.length).toBeGreaterThan(20);
      expect(finding.representative_snippets.length).toBeGreaterThan(0);
    }
  });

  it("ensures 'what_we_think' contains behavioral hypotheses with nuances", async () => {
    const synthesis = await generateResearchSynthesis();

    expect(synthesis.what_we_think.length).toBeGreaterThanOrEqual(2);

    for (const hypothesis of synthesis.what_we_think) {
      expect(hypothesis.insight_type).toBe("what_we_think");
      expect(hypothesis.insight_statement.length).toBeGreaterThan(20);
      expect(["strong", "moderate", "weak"]).toContain(hypothesis.evidence_strength);
    }
  });

  it("ensures 'what_to_validate' provides 5 primary research interview questions with methodologies", async () => {
    const synthesis = await generateResearchSynthesis();

    expect(synthesis.what_to_validate.length).toBe(5);

    for (const q of synthesis.what_to_validate) {
      expect(q.id).toBeDefined();
      expect(q.question).toBeDefined();
      expect(q.why_it_matters.length).toBeGreaterThan(15);
      expect(q.suggested_interview_approach.length).toBeGreaterThan(15);
      expect(q.related_insights.length).toBeGreaterThan(0);
    }
  });
});

describe("Phase 9 — Research Limitations & Dataset Bias Metrics", () => {
  it("computes dataset health and sampling bias metrics accurately", async () => {
    const report = await computeResearchLimitations();

    expect(report).toHaveProperty("generated_at");
    expect(report).toHaveProperty("dataset_metrics");
    expect(report).toHaveProperty("limitations");
    expect(report).toHaveProperty("researcher_guidance");

    expect(report.dataset_metrics).toHaveProperty("total_records");
    expect(report.dataset_metrics).toHaveProperty("total_episodes");
    expect(report.dataset_metrics).toHaveProperty("unknown_outcome_percentage");
    expect(report.dataset_metrics).toHaveProperty("holdout_validation_f1");

    expect(report.limitations.length).toBeGreaterThanOrEqual(4);
    expect(report.researcher_guidance.length).toBeGreaterThanOrEqual(3);
  });

  it("documents sampling bias and platform skew with explicit mitigations", async () => {
    const report = await computeResearchLimitations();

    const samplingBias = report.limitations.find((l) => l.category === "sampling_bias");
    expect(samplingBias).toBeDefined();
    expect(samplingBias?.severity).toBe("high");
    expect(samplingBias?.mitigation_strategy.length).toBeGreaterThan(20);

    const platformSkew = report.limitations.find((l) => l.category === "platform_skew");
    expect(platformSkew).toBeDefined();
    expect(platformSkew?.research_implication.length).toBeGreaterThan(20);
  });
});
