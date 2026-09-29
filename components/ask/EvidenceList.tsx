import React from "react";
import Link from "next/link";
import type { GroundedEvidenceSnippet } from "@/types/api";
import { Quote, ExternalLink } from "lucide-react";

interface EvidenceListProps {
  evidence: GroundedEvidenceSnippet[];
}

export function EvidenceList({ evidence }: EvidenceListProps) {
  if (!evidence || evidence.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Grounded Verbatim Evidence ({evidence.length} Quotes)
        </h4>
        <span className="text-[11px] text-slate-500">
          Directly traceable to source conversation records
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {evidence.map((snippet, idx) => (
          <div
            key={`${snippet.episode_id}-${idx}`}
            className="flex flex-col justify-between rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 hover:border-slate-700 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 capitalize">
                    {snippet.platform}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800/80 text-slate-400 capitalize">
                    {snippet.visual_item_type?.replace(/_/g, " ")}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                    snippet.evidence_type === "observed"
                      ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                      : snippet.evidence_type === "interpreted"
                      ? "bg-purple-950/40 text-purple-300 border-purple-500/30"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}
                >
                  {snippet.evidence_type}
                </span>
              </div>

              <blockquote className="text-xs text-slate-200 italic leading-relaxed border-l-2 border-slate-700 pl-2.5">
                "{snippet.quote}"
              </blockquote>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
              <span className="font-mono text-slate-500 text-[10px] truncate max-w-[120px]">
                ID: {snippet.episode_id.slice(0, 8)}
              </span>
              <Link
                href={`/evidence/${snippet.episode_id}`}
                className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-medium"
              >
                <span>Inspect in Context</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
