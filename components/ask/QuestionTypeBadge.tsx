import React from "react";
import type { QuestionType } from "@/types/domain";
import { BarChart2, BookOpen, Shuffle } from "lucide-react";

interface QuestionTypeBadgeProps {
  type: QuestionType;
}

export function QuestionTypeBadge({ type }: QuestionTypeBadgeProps) {
  switch (type) {
    case "quantitative":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-950/80 text-blue-300 border border-blue-500/40">
          <BarChart2 className="h-3.5 w-3.5 text-blue-400" />
          Quantitative (SQL Analytics)
        </span>
      );
    case "qualitative":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-950/80 text-purple-300 border border-purple-500/40">
          <BookOpen className="h-3.5 w-3.5 text-purple-400" />
          Qualitative (Semantic Retrieval)
        </span>
      );
    case "mixed":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/40">
          <Shuffle className="h-3.5 w-3.5 text-amber-400" />
          Mixed (SQL + Semantic)
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400">
          {type}
        </span>
      );
  }
}
