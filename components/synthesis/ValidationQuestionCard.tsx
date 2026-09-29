import React from "react";
import type { ValidationQuestion } from "@/lib/analysis/synthesis";
import { HelpCircle, Target, ArrowRight, UserCheck } from "lucide-react";

interface ValidationQuestionCardProps {
  question: ValidationQuestion;
  index: number;
}

export function ValidationQuestionCard({ question, index }: ValidationQuestionCardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-lg hover:border-slate-700 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-950/80 border border-blue-500/40 text-blue-400 font-bold text-xs shrink-0 mt-0.5">
          #{index + 1}
        </div>
        <div className="space-y-1">
          <h4 className="text-base font-bold text-white tracking-tight leading-snug">
            "{question.question}"
          </h4>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        <div className="p-3.5 rounded-lg bg-slate-950/50 border border-slate-800 space-y-1.5">
          <div className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5" />
            Why This Matters
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {question.why_it_matters}
          </p>
        </div>

        <div className="p-3.5 rounded-lg bg-slate-950/50 border border-slate-800 space-y-1.5">
          <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5" />
            Suggested Interview Approach
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {question.suggested_interview_approach}
          </p>
        </div>
      </div>
    </div>
  );
}
