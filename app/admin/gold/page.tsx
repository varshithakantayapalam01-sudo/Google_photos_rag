"use client";

import React, { useState, useEffect } from "react";
import { AdminGuard } from "@/components/layout/AdminGuard";
import { GoldLabelForm } from "@/components/admin/GoldLabelForm";
import { ValidationResults } from "@/components/admin/ValidationResults";
import { EvaluationResult } from "@/lib/validation/evaluate";
import {
  ShieldCheck,
  Plus,
  Play,
  Sparkles,
  Database,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Edit2,
  Trash2,
} from "lucide-react";

export default function GoldAdminPage() {
  const [goldRecords, setGoldRecords] = useState<any[]>([]);
  const [activeSplit, setActiveSplit] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [validationResults, setValidationResults] = useState<EvaluationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchGoldRecords = async () => {
    setIsLoading(true);
    try {
      const url = activeSplit === "all" ? "/api/admin/gold" : `/api/admin/gold?split=${activeSplit}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setGoldRecords(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoldRecords();
  }, [activeSplit]);

  const handleSeedDataset = async () => {
    setIsSeeding(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/gold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed" }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage(json.message);
        fetchGoldRecords();
      }
    } catch (err: any) {
      setMessage(`Seeding error: ${err.message}`);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleRunValidation = async () => {
    setIsValidating(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/gold/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success) {
        setValidationResults(json.data);
      }
    } catch (err: any) {
      setMessage(`Validation error: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Are you sure you want to delete this gold record annotation?")) return;
    try {
      const res = await fetch(`/api/admin/gold/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchGoldRecords();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <ShieldCheck className="h-7 w-7 text-emerald-400" />
              Gold Dataset Validation
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Curate multi-episode human ground-truth records across Development and Holdout splits to benchmark AI pipeline precision & recall.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleSeedDataset}
              disabled={isSeeding}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              <Database className="h-4 w-4 text-blue-400" />
              {isSeeding ? "Seeding..." : "Seed Benchmark (45 Records)"}
            </button>

            <button
              onClick={handleRunValidation}
              disabled={isValidating || goldRecords.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500 disabled:opacity-50"
            >
              <Play className="h-4 w-4 fill-current" />
              {isValidating ? "Evaluating Benchmark..." : "Run Validation Suite"}
            </button>
          </div>
        </div>

        {message && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3.5 text-xs text-blue-300">
            {message}
          </div>
        )}

        {/* Validation Results (if executed) */}
        {validationResults && (
          <ValidationResults
            results={validationResults}
            onRerun={handleRunValidation}
            isLoading={isValidating}
          />
        )}

        {/* Edit Modal / Form */}
        {editingRecord && (
          <GoldLabelForm
            rawRecord={{
              id: editingRecord.record_id || editingRecord.id,
              raw_text: editingRecord.raw_records?.raw_text || editingRecord.raw_text,
              platform: editingRecord.raw_records?.platform || editingRecord.platform,
              title: editingRecord.raw_records?.title || editingRecord.title,
            }}
            initialData={editingRecord}
            onSave={() => {
              setEditingRecord(null);
              fetchGoldRecords();
            }}
            onCancel={() => setEditingRecord(null)}
          />
        )}

        {/* Gold Records Table */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 shadow">
          {/* Table Controls */}
          <div className="flex flex-col justify-between gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-300">Filter Split:</span>
              <div className="flex rounded-lg border border-slate-800 bg-slate-950 p-0.5 text-xs">
                {["all", "development", "holdout"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setActiveSplit(s)}
                    className={`rounded-md px-2.5 py-1 text-xs capitalize font-medium transition ${
                      activeSplit === s
                        ? "bg-slate-800 text-white shadow"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-slate-400">
              Showing <strong className="text-white">{goldRecords.length}</strong> gold records
            </span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading gold records...</div>
          ) : goldRecords.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 space-y-3">
              <p>No gold dataset records found in this split.</p>
              <button
                onClick={handleSeedDataset}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
              >
                <Database className="h-3.5 w-3.5" />
                Seed Curated 45-Record Benchmark
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Split</th>
                    <th className="py-3 px-4">Ground Truth</th>
                    <th className="py-3 px-4">Episodes</th>
                    <th className="py-3 px-4">Platform & Source Text</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {goldRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            record.dataset_split === "holdout"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {record.dataset_split}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {record.is_relevant ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Relevant
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                            <XCircle className="h-3.5 w-3.5" />
                            Irrelevant
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-300">
                          {record.gold_episode_labels?.length ?? record.expected_episode_count} ep
                        </span>
                      </td>

                      <td className="py-3 px-4 max-w-md">
                        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                          {record.raw_records?.platform || "web"}
                        </div>
                        <p className="line-clamp-2 text-slate-300 mt-0.5 italic">
                          &ldquo;{record.raw_records?.raw_text}&rdquo;
                        </p>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingRecord(record)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                            title="Edit Annotation"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
