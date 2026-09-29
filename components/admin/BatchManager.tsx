"use client";

import React, { useState } from "react";
import { Plus, Database, Calendar, Tag, Search, CheckCircle, RefreshCw } from "lucide-react";
import { CollectionBatch } from "@/types/database";

interface BatchManagerProps {
  batches: CollectionBatch[];
  onRefresh?: () => void;
}

export function BatchManager({ batches, onRefresh }: BatchManagerProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [platform, setPlatform] = useState("reddit");
  const [searchQuery, setSearchQuery] = useState("");
  const [collectionMethod, setCollectionMethod] = useState("csv_import");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          search_query: searchQuery || null,
          collection_method: collectionMethod,
          collection_date: new Date().toISOString().split("T")[0],
          date_range_start: dateStart || null,
          date_range_end: dateEnd || null,
          notes: notes || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create batch");
      }

      setShowCreateModal(false);
      setSearchQuery("");
      setNotes("");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-semibold text-white">Collection Batches & Sampling Provenance</h3>
          <p className="text-xs text-slate-400">
            Track provenance and sampling methodology across all data sources to reduce selection bias.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow hover:bg-blue-500"
          >
            <Plus className="h-4 w-4" />
            New Batch
          </button>
        </div>
      </div>

      {/* Batch Cards / Table */}
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Batch ID / Platform</th>
                <th className="px-4 py-3">Search Query & Notes</th>
                <th className="px-4 py-3">Collection Date</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3 text-right">Imported</th>
                <th className="px-4 py-3 text-right">Relevant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-sans">
                    No collection batches found. Create a batch or upload data to get started.
                  </td>
                </tr>
              ) : (
                batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-blue-400">
                          {b.platform}
                        </span>
                        <span className="font-mono text-xs text-slate-400">#{b.id.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <div className="font-medium text-white">{b.search_query ? `"${b.search_query}"` : "General / All"}</div>
                      {b.notes && <div className="text-[11px] text-slate-400 line-clamp-1">{b.notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{b.collection_date}</td>
                    <td className="px-4 py-3 text-slate-300 font-sans capitalize">{b.collection_method.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white">{b.records_imported}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-400">{b.relevant_records}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Creating New Batch */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h4 className="text-base font-bold text-white">Create Collection Batch</h4>
            <p className="mt-1 text-xs text-slate-400">
              Establish provenance record before importing user posts.
            </p>

            {error && (
              <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateBatch} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="reddit">Reddit</option>
                    <option value="play_store">Play Store</option>
                    <option value="support_forum">Support Community</option>
                    <option value="twitter">X / Twitter</option>
                    <option value="user_interview">User Interview</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Collection Method</label>
                  <select
                    value={collectionMethod}
                    onChange={(e) => setCollectionMethod(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="csv_import">CSV / JSON Upload</option>
                    <option value="manual">Manual Entry</option>
                    <option value="api_scrape">Public API Scrape</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Search Query / Sampling Criteria</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. 'can't find screenshot from last week'"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300">Date Range Start</label>
                  <input
                    type="date"
                    value={dateStart}
                    onChange={(e) => setDateStart(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300">Date Range End</label>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={(e) => setDateEnd(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300">Notes / Sampling Constraints</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Additional context on sampling method..."
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
