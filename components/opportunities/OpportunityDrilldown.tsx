"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { Opportunity } from "@/types/database";

interface SupportingEpisode {
  id: string;
  retrieval_goal: string;
  visual_item_type: string;
  outcome: string;
  platform: string;
}

interface OpportunityDrilldownProps {
  opportunity: Opportunity;
}

export function OpportunityDrilldown({ opportunity }: OpportunityDrilldownProps) {
  const [episodes, setEpisodes] = useState<SupportingEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchSupportingEpisodes() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/app/api/analytics/opportunities?id=${opportunity.id}`.replace("/app", ""));
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || "Failed to load supporting episodes");
        }
        if (isMounted) {
          setEpisodes(data.data?.supporting_episodes || []);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (opportunity.id) {
      fetchSupportingEpisodes();
    }

    return () => {
      isMounted = false;
    };
  }, [opportunity.id]);

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case "success":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
            Success
          </span>
        );
      case "failure":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-950/60 text-rose-400 border border-rose-500/30">
            Failure
          </span>
        );
      case "abandoned":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-950/60 text-amber-400 border border-amber-500/30">
            Abandoned
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-400">
            {outcome || "Unknown"}
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white">
            Supporting Evidence Traceability ({episodes.length} Episodes)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Every opportunity is grounded in DISTINCT retrieval episodes. Trace any finding directly to highlighted source text quotes.
          </p>
        </div>
      </div>

      {loading && (
        <div className="py-8 text-center text-sm text-slate-400">
          Loading supporting episodes...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-800 text-sm text-rose-300">
          {error}
        </div>
      )}

      {!loading && !error && episodes.length === 0 && (
        <div className="py-8 text-center text-sm text-slate-500">
          No linked supporting episodes found for this opportunity.
        </div>
      )}

      {!loading && !error && episodes.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Episode / Goal</th>
                <th className="py-3 px-3 font-semibold">Visual Item Type</th>
                <th className="py-3 px-3 font-semibold">Platform</th>
                <th className="py-3 px-3 font-semibold text-center">Outcome</th>
                <th className="py-3 px-4 font-semibold text-right">Trace Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {episodes.map((ep) => (
                <tr key={ep.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 text-slate-200 font-medium max-w-sm">
                    <div className="truncate font-semibold text-white">
                      {ep.retrieval_goal || "Unspecified retrieval goal"}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      ID: {ep.id}
                    </div>
                  </td>
                  <td className="py-3 px-3 capitalize">
                    {ep.visual_item_type?.replace(/_/g, " ") || "—"}
                  </td>
                  <td className="py-3 px-3 capitalize text-slate-400">
                    {ep.platform || "—"}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {getOutcomeBadge(ep.outcome)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/evidence/${ep.id}`}
                      className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 border border-blue-500/30 transition-colors"
                    >
                      View Evidence Quote →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
