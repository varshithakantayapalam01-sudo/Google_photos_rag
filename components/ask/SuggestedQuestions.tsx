import React from "react";
import { Sparkles, BarChart2, BookOpen, Shuffle } from "lucide-react";

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
}

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
  const categories = [
    {
      title: "Quantitative Queries (SQL Analytics)",
      icon: <BarChart2 className="h-4 w-4 text-blue-400" />,
      questions: [
        "How many episodes involve screenshot retrieval?",
        "What is the most frequent retrieval failure mode?",
        "What percentage of retrieval episodes end in failure or abandonment?",
      ],
    },
    {
      title: "Qualitative Queries (Semantic Retrieval)",
      icon: <BookOpen className="h-4 w-4 text-purple-400" />,
      questions: [
        "What do users remember when searching for travel or family photos?",
        "How do users describe their manual scroll workaround experience?",
        "Why do users resort to keyword stuffing when searching?",
      ],
    },
    {
      title: "Mixed Queries (SQL + Semantic Evidence)",
      icon: <Shuffle className="h-4 w-4 text-amber-400" />,
      questions: [
        "Compare failure rates for screenshots vs receipts and explain why users fail.",
        "How often are location clues used and what causes search failures?",
      ],
    },
  ];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <Sparkles className="h-4 w-4 text-amber-400" />
        Suggested Research Inquiries
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {categories.map((cat, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              {cat.icon}
              <span>{cat.title}</span>
            </div>
            <div className="space-y-1.5">
              {cat.questions.map((q, qIdx) => (
                <button
                  key={qIdx}
                  onClick={() => onSelect(q)}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/40 text-xs text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800/50 transition-all leading-snug"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
