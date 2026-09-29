"use client";

import React, { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { SynthesisSection } from "@/components/synthesis/SynthesisSection";
import { FindingCard } from "@/components/synthesis/FindingCard";
import { HypothesisCard } from "@/components/synthesis/HypothesisCard";
import { ValidationQuestionCard } from "@/components/synthesis/ValidationQuestionCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { Sparkles, Layers, BookOpen, AlertCircle, ArrowUpRight } from "lucide-react";
import type { ResearchSynthesisResponse } from "@/types/api";

export default function ResearchSynthesisPage() {
  const [data, setData] = useState<ResearchSynthesisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSynthesis() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/analytics/synthesis");
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to load research synthesis");
        }
        setData(json.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadSynthesis();
  }, []);

  return (
    <PageContainer>
      <div className="max-w-5xl mx-auto space-y-10 pb-16">
        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-purple-500/20 text-purple-400">
            <Sparkles className="h-3.5 w-3.5 text-purple-400" />
            <span>Product Strategy & Behavioral Synthesis</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Research Synthesis
          </h1>
          <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
            The core strategic findings structured into three distinct epistemic tiers: what is empirically observed across multiple platforms, what we hypothesize regarding cognitive root causes, and the primary interview questions to validate in upcoming user studies.
          </p>
        </div>

        {/* Loading / Error States */}
        {loading && <LoadingState message="Synthesizing behavioral insights across dataset..." rows={5} />}

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <div className="font-semibold">Error Loading Synthesis</div>
              <p className="mt-0.5 text-xs text-rose-400/90">{error}</p>
            </div>
          </div>
        )}

        {/* Synthesis Content */}
        {!loading && !error && data && (
          <div className="space-y-12">
            {/* Section 1: What We Know */}
            <SynthesisSection
              title="1. What We Know"
              badge="Empirically Grounded Findings"
              badgeColor="border-emerald-500/40 bg-emerald-950/50 text-emerald-300"
              description="High-confidence findings supported by ≥5 distinct episodes across ≥3 independent platforms, with verified quotes and low outcome ambiguity."
            >
              <div className="grid grid-cols-1 gap-4">
                {data.what_we_know.map((item) => (
                  <FindingCard key={item.id} insight={item} />
                ))}
              </div>
            </SynthesisSection>

            {/* Section 2: What We Think */}
            <SynthesisSection
              title="2. What We Think"
              badge="Root-Cause Hypotheses"
              badgeColor="border-purple-500/40 bg-purple-950/50 text-purple-300"
              description="Behavioral interpretations and cognitive models explaining why search failures occur, requiring qualitative calibration before feature committing."
            >
              <div className="grid grid-cols-1 gap-4">
                {data.what_we_think.map((item) => (
                  <HypothesisCard key={item.id} insight={item} />
                ))}
              </div>
            </SynthesisSection>

            {/* Section 3: What We Need to Validate */}
            <SynthesisSection
              title="3. What We Need to Validate"
              badge="Primary Research Interview Guide (5–6 Users)"
              badgeColor="border-blue-500/40 bg-blue-950/50 text-blue-300"
              description="Critical user research questions designed to resolve key assumptions in 1-on-1 qualitative interviews with users experiencing photo retrieval pain."
            >
              <div className="grid grid-cols-1 gap-4">
                {data.what_to_validate.map((q: any, idx) => (
                  <ValidationQuestionCard key={q.id || idx} question={q} index={idx} />
                ))}
              </div>
            </SynthesisSection>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
