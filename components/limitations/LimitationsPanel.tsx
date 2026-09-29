import React from "react";
import type { ResearchLimitationsReport, LimitationItem } from "@/lib/analysis/limitations";
import {
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  Cpu,
  Users,
  CheckCircle2,
  Info,
} from "lucide-react";

interface LimitationsPanelProps {
  report: ResearchLimitationsReport;
}

export function LimitationsPanel({ report }: LimitationsPanelProps) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "sampling_bias":
        return <ShieldAlert className="h-4 w-4 text-rose-400" />;
      case "platform_skew":
        return <Users className="h-4 w-4 text-amber-400" />;
      case "outcome_uncertainty":
        return <HelpCircle className="h-4 w-4 text-purple-400" />;
      case "ai_pipeline":
        return <Cpu className="h-4 w-4 text-blue-400" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-slate-400" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-950/80 text-rose-300 border border-rose-500/40">
            High Severity
          </span>
        );
      case "moderate":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950/80 text-amber-300 border border-amber-500/40">
            Moderate Severity
          </span>
        );
      case "low":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
            Low Severity
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Dataset Health & Bias Metrics Snapshot */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase">Total Records</div>
          <div className="text-xl font-bold text-white font-mono mt-1">
            {report.dataset_metrics.total_records}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Raw imported rows</div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase">Distinct Episodes</div>
          <div className="text-xl font-bold text-blue-400 font-mono mt-1">
            {report.dataset_metrics.total_episodes}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">COUNT(DISTINCT episode_id)</div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase">Unknown Outcomes</div>
          <div className="text-xl font-bold text-amber-400 font-mono mt-1">
            {report.dataset_metrics.unknown_outcome_percentage}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Excluded from rate denom.</div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase">Unmatched Spans</div>
          <div className="text-xl font-bold text-slate-300 font-mono mt-1">
            {report.dataset_metrics.unmatched_span_rate}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Quote locator precision</div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
          <div className="text-[11px] font-medium text-slate-400 uppercase">Holdout F1 Score</div>
          <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
            {report.dataset_metrics.holdout_validation_f1}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Gold benchmark (Phase 5)</div>
        </div>
      </div>

      {/* Limitations Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white tracking-tight">
          Documented Limitations & Methodological Constraints
        </h3>

        <div className="space-y-4">
          {report.limitations.map((lim) => (
            <div
              key={lim.id}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-lg"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                    {getCategoryIcon(lim.category)}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">{lim.title}</h4>
                    {lim.metric_value && (
                      <span className="text-xs text-blue-400 font-mono mt-0.5 block">
                        Observed Metric: {lim.metric_value}
                      </span>
                    )}
                  </div>
                </div>
                {getSeverityBadge(lim.severity)}
              </div>

              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <div>
                  <strong className="text-slate-200">Nature of Bias: </strong>
                  {lim.description}
                </div>
                <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <strong className="text-amber-300">Research & Product Implication: </strong>
                  <span className="text-slate-300">{lim.research_implication}</span>
                </div>
                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                  <strong className="text-emerald-300">Implemented Mitigation: </strong>
                  <span className="text-slate-300">{lim.mitigation_strategy}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Researcher Operational Guidance */}
      <div className="rounded-xl border border-blue-500/30 bg-blue-950/20 p-6 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-blue-300">
          <Info className="h-4 w-4 text-blue-400" />
          Mandatory Research Governance Rules
        </div>
        <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-300 pl-1 leading-relaxed">
          {report.researcher_guidance.map((guide, idx) => (
            <li key={idx}>{guide}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
