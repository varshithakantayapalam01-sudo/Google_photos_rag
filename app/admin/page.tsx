"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Upload, Database, Cpu, CheckCircle2, AlertTriangle, ArrowRight, Shield } from "lucide-react";
import { CollectionBatch } from "@/types/database";

export default function AdminOverviewPage() {
  const [batches, setBatches] = useState<CollectionBatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/batches")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setBatches(json.data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const totalImported = batches.reduce((acc, b) => acc + (b.records_imported || 0), 0);
  const totalRelevant = batches.reduce((acc, b) => acc + (b.relevant_records || 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Admin Console Overview</h2>
        <p className="mt-1 text-xs text-slate-400">
          Manage data collection batches, trigger pipeline processing stages, and review AI quality benchmarks.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Batches</span>
            <Database className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{loading ? "..." : batches.length}</div>
          <div className="mt-1 text-[11px] text-slate-500">Across all platforms</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Records Imported</span>
            <Upload className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{loading ? "..." : totalImported}</div>
          <div className="mt-1 text-[11px] text-slate-500">Exact & near-deduped</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 shadow">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium uppercase tracking-wider">Classified Relevant</span>
            <CheckCircle2 className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{loading ? "..." : totalRelevant}</div>
          <div className="mt-1 text-[11px] text-slate-500">Vague-memory retrieval scenarios</div>
        </div>
      </div>

      {/* Quick Action Navigation Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/admin/import"
          className="group rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-blue-500/50 hover:bg-slate-850"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-blue-500/10 p-3 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition">
              <Upload className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-blue-400 transition" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-white">Import Data (CSV / JSON)</h3>
          <p className="mt-1 text-xs text-slate-400">
            Upload public user posts with collection provenance metadata and automated deduplication.
          </p>
        </Link>

        <Link
          href="/admin/batches"
          className="group rounded-xl border border-slate-800 bg-slate-900 p-6 transition hover:border-blue-500/50 hover:bg-slate-850"
        >
          <div className="flex items-center justify-between">
            <div className="rounded-lg bg-emerald-500/10 p-3 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition">
              <Database className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-emerald-400 transition" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-white">Collection Batches Manager</h3>
          <p className="mt-1 text-xs text-slate-400">
            View and manage data sampling provenance records, platform origins, and date bounds.
          </p>
        </Link>
      </div>
    </div>
  );
}
