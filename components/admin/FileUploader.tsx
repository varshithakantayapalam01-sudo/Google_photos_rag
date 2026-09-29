"use client";

import React, { useState } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { CollectionBatch } from "@/types/database";

interface FileUploaderProps {
  batches: CollectionBatch[];
  onImportSuccess?: () => void;
}

export function FileUploader({ batches, onImportSuccess }: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("new");

  // Provenance state
  const [platform, setPlatform] = useState<string>("reddit");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [collectionMethod, setCollectionMethod] = useState<string>("csv_import");
  const [dateStart, setDateStart] = useState<string>("");
  const [dateEnd, setDateEnd] = useState<string>("");
  const [recordsFound, setRecordsFound] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    batch_id: string;
    records_imported: number;
    duplicates_flagged: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select a CSV or JSON file to upload");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    if (selectedBatchId !== "new") {
      formData.append("batch_id", selectedBatchId);
    } else {
      formData.append("platform", platform);
      formData.append("search_query", searchQuery);
      formData.append("collection_method", collectionMethod);
      formData.append("collection_date", new Date().toISOString().split("T")[0]);
      if (dateStart) formData.append("date_range_start", dateStart);
      if (dateEnd) formData.append("date_range_end", dateEnd);
      if (recordsFound) formData.append("records_found", recordsFound);
      if (notes) formData.append("notes", notes);
    }

    try {
      const res = await fetch("/api/admin/records/import", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Import failed");
      }

      setResult(json.data);
      setSelectedFile(null);
      if (onImportSuccess) onImportSuccess();
    } catch (err: any) {
      setError(err.message || "An error occurred during import");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
      <div className="mb-6 border-b border-slate-800 pb-4">
        <h3 className="text-lg font-semibold text-white">Import Data with Collection Provenance</h3>
        <p className="mt-1 text-xs text-slate-400">
          Upload publicly available user feedback (CSV or JSON). Author usernames are automatically stripped.
        </p>
      </div>

      {result && (
        <div className="mb-6 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="h-5 w-5" />
            <span>Import Successful</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div>Records Imported: <strong className="text-white">{result.records_imported}</strong></div>
            <div>Duplicates Flagged: <strong className="text-amber-400">{result.duplicates_flagged}</strong></div>
            <div className="col-span-2 text-slate-400">Batch ID: {result.batch_id}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Batch Selection */}
        <div>
          <label className="block text-xs font-medium text-slate-300">Collection Batch</label>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="new">+ Create New Collection Batch</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                Batch #{b.id.slice(0, 8)} — {b.platform} ({b.collection_date}) {b.search_query ? `"${b.search_query}"` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Provenance Metadata Fields (shown when creating new batch) */}
        {selectedBatchId === "new" && (
          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 space-y-4">
            <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Collection Provenance Metadata
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-400">Source Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="reddit">Reddit (r/googlephotos, etc.)</option>
                  <option value="play_store">Google Play Store Reviews</option>
                  <option value="support_forum">Google Support Community</option>
                  <option value="twitter">X / Twitter</option>
                  <option value="user_interview">User Interview Transcript</option>
                  <option value="other">Other Public Source</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">Collection Method</label>
                <select
                  value={collectionMethod}
                  onChange={(e) => setCollectionMethod(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="csv_import">CSV / JSON Upload</option>
                  <option value="manual">Manual Entry</option>
                  <option value="api_scrape">Public API Scrape</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400">Search Query or Keyword Criteria</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. 'can't find photo', 'vague memory', 'receipt search'"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-400">Date Range Start</label>
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">Date Range End</label>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400">Estimated Records Found</label>
                <input
                  type="number"
                  value={recordsFound}
                  onChange={(e) => setRecordsFound(e.target.value)}
                  placeholder="e.g. 100"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400">Methodology Notes / Sampling Bias Context</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Notes on how this sample was collected and any potential sampling constraints..."
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* File Drag and Drop / Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-300">File to Upload (.csv or .json)</label>
          <div className="mt-1 flex justify-center rounded-lg border-2 border-dashed border-slate-700 px-6 py-8 hover:border-slate-600">
            <div className="text-center">
              <UploadCloud className="mx-auto h-10 w-10 text-slate-400" />
              <div className="mt-3 flex text-xs text-slate-400">
                <label className="relative cursor-pointer rounded-md font-semibold text-blue-400 hover:text-blue-300">
                  <span>Choose a file</span>
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">CSV or JSON format up to 10MB</p>
              {selectedFile && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-blue-500/10 px-3 py-1.5 text-xs text-blue-300">
                  <FileText className="h-4 w-4" />
                  <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !selectedFile}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Importing and Deduplicating Records...</span>
            </>
          ) : (
            <span>Upload & Process Records</span>
          )}
        </button>
      </form>
    </div>
  );
}
