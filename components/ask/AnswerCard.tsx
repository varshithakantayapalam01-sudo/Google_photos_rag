"use client";

import React from "react";
import type { AskQueryResponse } from "@/types/api";
import { QuestionTypeBadge } from "./QuestionTypeBadge";
import { QuantitativeResult } from "./QuantitativeResult";
import { EvidenceList } from "./EvidenceList";
import {
  ShieldCheck,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
} from "lucide-react";

interface AnswerCardProps {
  data: AskQueryResponse;
}

export function AnswerCard({ data }: AnswerCardProps) {
  const getStrengthBadge = (strength: string) => {
    switch (strength) {
      case "strong":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Strong Evidence
          </span>
        );
      case "moderate":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Moderate Evidence
          </span>
        );
      case "weak":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-500/40">
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            Weak Evidence
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400">
            {strength || "Insufficient"}
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/90 backdrop-blur-md p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <QuestionTypeBadge type={data.question_type} />
            {getStrengthBadge(data.evidence_strength)}
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight mt-3">
            {data.question}
          </h3>
        </div>
      </div>

      {/* 6-Factor Evidence Strength Transparency Bar */}
      {data.evidence_strength_factors && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] font-medium uppercase">Episodes</span>
            <span className="font-bold text-white font-mono">
              {data.evidence_strength_factors.supporting_episodes_count} distinct
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] font-medium uppercase">Platforms</span>
            <span className="font-bold text-white font-mono">
              {data.evidence_strength_factors.independent_platforms_count} independent
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] font-medium uppercase">Observed %</span>
            <span className="font-bold text-emerald-400 font-mono">
              {data.evidence_strength_factors.observed_evidence_percentage}%
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] font-medium uppercase">Contradictions</span>
            <span className={`font-bold font-mono ${data.evidence_strength_factors.has_contradictory_evidence ? "text-amber-400" : "text-slate-300"}`}>
              {data.evidence_strength_factors.has_contradictory_evidence ? "Detected" : "None"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] font-medium uppercase">Unknown Out.</span>
            <span className="font-bold text-slate-300 font-mono">
              {data.evidence_strength_factors.unknown_outcome_percentage}%
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] font-medium uppercase">Pipeline F1</span>
            <span className="font-bold text-blue-400 font-mono">
              {data.evidence_strength_factors.pipeline_validation_f1}
            </span>
          </div>
        </div>
      )}

      {/* Quantitative Deterministic Block */}
      {data.quantitative_summary && (
        <QuantitativeResult summary={data.quantitative_summary} />
      )}

      {/* Answer Markdown Body */}
      <div className="prose prose-invert max-w-none text-sm leading-relaxed text-slate-200 bg-slate-800/30 p-5 rounded-xl border border-slate-800/80">
        <div className="whitespace-pre-wrap">{data.answer_markdown}</div>
      </div>

      {/* Contradictory Findings Alert */}
      {data.contradictory_findings && data.contradictory_findings.length > 0 && (
        <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-500/40 text-xs text-amber-300 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Contradictory Evidence Identified
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-amber-300/90 pl-1">
            {data.contradictory_findings.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Grounded Evidence Quotes */}
      {data.supporting_evidence && data.supporting_evidence.length > 0 && (
        <EvidenceList evidence={data.supporting_evidence} />
      )}

      {/* Research Limitations Notice */}
      {data.limitations_note && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-slate-800/40 border border-slate-800 text-xs text-slate-400">
          <Info className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-300">Methodological Note: </span>
            {data.limitations_note}
          </div>
        </div>
      )}
    </div>
  );
}
