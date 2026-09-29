"use client";

import React, { useState } from "react";
import type { Opportunity } from "@/types/database";

interface OpportunityComparisonTableProps {
  opportunities: Opportunity[];
  selectedId?: string | null;
  onSelectOpportunity?: (opportunity: Opportunity) => void;
}

export function OpportunityComparisonTable({
  opportunities,
  selectedId,
  onSelectOpportunity,
}: OpportunityComparisonTableProps) {
  const [sortField, setSortField] = useState<keyof Opportunity>("supporting_episode_count");
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (field: keyof Opportunity) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortedOpps = [...opportunities].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;

    if (typeof valA === "string") {
      valA = (valA as string).toLowerCase();
      valB = (valB as string).toLowerCase();
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const getStrengthBadge = (strength: string) => {
    switch (strength) {
      case "strong":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/30">
            Strong
          </span>
        );
      case "moderate":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-500/30">
            Moderate
          </span>
        );
      case "weak":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-500/30">
            Weak
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400">
            {strength || "N/A"}
          </span>
        );
    }
  };

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/60 backdrop-blur">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="bg-slate-800/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
          <tr>
            <th
              className="py-3.5 px-4 font-semibold cursor-pointer hover:text-white"
              onClick={() => handleSort("title")}
            >
              Opportunity / Scenario
            </th>
            <th
              className="py-3.5 px-3 font-semibold text-center cursor-pointer hover:text-white"
              onClick={() => handleSort("evidence_strength")}
            >
              Evidence Strength
            </th>
            <th
              className="py-3.5 px-3 font-semibold text-right cursor-pointer hover:text-white"
              onClick={() => handleSort("supporting_episode_count")}
            >
              Episodes
            </th>
            <th
              className="py-3.5 px-3 font-semibold text-right cursor-pointer hover:text-white"
              onClick={() => handleSort("dataset_percentage")}
            >
              Dataset %
            </th>
            <th
              className="py-3.5 px-3 font-semibold text-right cursor-pointer hover:text-white"
              onClick={() => handleSort("failure_rate")}
            >
              Failure Rate
            </th>
            <th
              className="py-3.5 px-3 font-semibold text-right cursor-pointer hover:text-white"
              onClick={() => handleSort("abandonment_rate")}
            >
              Abandonment
            </th>
            <th
              className="py-3.5 px-3 font-semibold text-right cursor-pointer hover:text-white"
              onClick={() => handleSort("multi_attempt_rate")}
            >
              Multi-Attempt
            </th>
            <th
              className="py-3.5 px-3 font-semibold text-right cursor-pointer hover:text-white"
              onClick={() => handleSort("workaround_rate")}
            >
              Workaround
            </th>
            <th
              className="py-3.5 px-3 font-semibold text-right cursor-pointer hover:text-white"
              onClick={() => handleSort("manual_scroll_rate")}
            >
              Manual Scroll
            </th>
            <th className="py-3.5 px-3 font-semibold text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {sortedOpps.map((opp) => {
            const isSelected = selectedId === opp.id;
            return (
              <tr
                key={opp.id}
                onClick={() => onSelectOpportunity?.(opp)}
                className={`transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-blue-950/40 border-l-4 border-l-blue-500"
                    : "hover:bg-slate-800/40"
                }`}
              >
                <td className="py-4 px-4 font-medium text-slate-100 max-w-xs">
                  <div className="font-semibold text-white truncate">{opp.title}</div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">
                    {opp.retrieval_scenario}
                  </div>
                </td>
                <td className="py-4 px-3 text-center">
                  {getStrengthBadge(opp.evidence_strength)}
                </td>
                <td className="py-4 px-3 text-right font-mono">
                  <span className="font-semibold text-white">
                    {opp.supporting_episode_count}
                  </span>
                  <span className="text-xs text-slate-500 block">
                    {opp.source_diversity} {opp.source_diversity === 1 ? "platform" : "platforms"}
                  </span>
                </td>
                <td className="py-4 px-3 text-right font-mono">
                  <span className="font-semibold text-blue-400">
                    {opp.dataset_percentage}%
                  </span>
                  <span className="text-xs text-slate-500 block">
                    of {opp.total_relevant_episodes}
                  </span>
                </td>
                <td className="py-4 px-3 text-right font-mono">
                  {opp.failure_rate !== null ? (
                    <>
                      <span className="font-semibold text-rose-400">{opp.failure_rate}%</span>
                      <span className="text-xs text-slate-500 block">
                        n = {opp.failure_rate_denominator}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="py-4 px-3 text-right font-mono">
                  {opp.abandonment_rate !== null ? (
                    <>
                      <span className="font-semibold text-amber-400">{opp.abandonment_rate}%</span>
                      <span className="text-xs text-slate-500 block">
                        n = {opp.abandonment_rate_denominator}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="py-4 px-3 text-right font-mono">
                  {opp.multi_attempt_rate !== null ? (
                    <>
                      <span className="font-semibold text-purple-400">{opp.multi_attempt_rate}%</span>
                      <span className="text-xs text-slate-500 block">
                        n = {opp.multi_attempt_denominator}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="py-4 px-3 text-right font-mono">
                  {opp.workaround_rate !== null ? (
                    <>
                      <span className="font-semibold text-emerald-400">{opp.workaround_rate}%</span>
                      <span className="text-xs text-slate-500 block">
                        n = {opp.supporting_episode_count}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="py-4 px-3 text-right font-mono">
                  {opp.manual_scroll_rate !== null ? (
                    <>
                      <span className="font-semibold text-cyan-400">{opp.manual_scroll_rate}%</span>
                      <span className="text-xs text-slate-500 block">
                        n = {opp.supporting_episode_count}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>
                <td className="py-4 px-3 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectOpportunity?.(opp);
                    }}
                    className="px-2.5 py-1 text-xs font-medium rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 transition-colors border border-blue-500/30"
                  >
                    Drilldown
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
