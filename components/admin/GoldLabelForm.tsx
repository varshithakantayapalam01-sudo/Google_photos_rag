"use client";

import React, { useState } from "react";
import { Plus, Trash2, Save, X, Layers, AlertCircle } from "lucide-react";
import { VISUAL_ITEM_TYPES, CLUE_CATEGORIES, FORGOTTEN_ATTRIBUTE_CATEGORIES, FAILURE_TYPES, RETRIEVAL_OUTCOMES } from "@/lib/utils/constants";
import { DatasetSplit } from "@/types/database";

interface GoldLabelFormProps {
  rawRecord: { id: string; raw_text: string; platform: string; title?: string | null };
  initialData?: any;
  onSave: () => void;
  onCancel: () => void;
}

export function GoldLabelForm({ rawRecord, initialData, onSave, onCancel }: GoldLabelFormProps) {
  const [isRelevant, setIsRelevant] = useState<boolean>(initialData?.is_relevant ?? true);
  const [split, setSplit] = useState<DatasetSplit>(initialData?.dataset_split ?? "development");
  const [notes, setNotes] = useState<string>(initialData?.labeller_notes ?? "");
  const [episodes, setEpisodes] = useState<any[]>(
    initialData?.gold_episode_labels?.length > 0
      ? initialData.gold_episode_labels
      : [
          {
            episode_index: 1,
            episode_description: "",
            visual_item_type: "photo",
            remembered_clues: [{ clue_category: "visual_feature", clue_description: "" }],
            forgotten_attributes: [{ attribute_category: "exact_date", description: "" }],
            primary_failure_mode: "candidate_retrieval",
            outcome: "failure",
            notes: "",
          },
        ]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddEpisode = () => {
    setEpisodes((prev) => [
      ...prev,
      {
        episode_index: prev.length + 1,
        episode_description: "",
        visual_item_type: "photo",
        remembered_clues: [{ clue_category: "visual_feature", clue_description: "" }],
        forgotten_attributes: [{ attribute_category: "exact_date", description: "" }],
        primary_failure_mode: "candidate_retrieval",
        outcome: "failure",
        notes: "",
      },
    ]);
  };

  const handleRemoveEpisode = (index: number) => {
    setEpisodes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEpisodeChange = (index: number, field: string, value: any) => {
    setEpisodes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleAddClue = (epIndex: number) => {
    setEpisodes((prev) => {
      const updated = [...prev];
      updated[epIndex].remembered_clues = [
        ...(updated[epIndex].remembered_clues || []),
        { clue_category: "visual_feature", clue_description: "" },
      ];
      return updated;
    });
  };

  const handleClueChange = (epIndex: number, clueIndex: number, field: string, value: string) => {
    setEpisodes((prev) => {
      const updated = [...prev];
      const clues = [...updated[epIndex].remembered_clues];
      clues[clueIndex] = { ...clues[clueIndex], [field]: value };
      updated[epIndex].remembered_clues = clues;
      return updated;
    });
  };

  const handleRemoveClue = (epIndex: number, clueIndex: number) => {
    setEpisodes((prev) => {
      const updated = [...prev];
      updated[epIndex].remembered_clues = updated[epIndex].remembered_clues.filter((_: any, i: number) => i !== clueIndex);
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/gold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record_id: rawRecord.id,
          is_relevant: isRelevant,
          dataset_split: split,
          labeller_notes: notes,
          episodes: isRelevant ? episodes : [],
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to save gold record");
      }

      onSave();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl">
      <div className="flex items-start justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-semibold text-white">
            {initialData ? "Edit Gold Dataset Annotation" : "Add Gold Dataset Annotation"}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Define ground-truth human annotations for AI precision/recall and multi-episode validation.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Raw Record Preview */}
      <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5 text-xs">
        <div className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
          Source Text ({rawRecord.platform})
        </div>
        <p className="mt-1 text-slate-200 line-clamp-4 italic">&ldquo;{rawRecord.raw_text}&rdquo;</p>
      </div>

      {/* Split and Relevance */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-300">Dataset Split</label>
          <select
            value={split}
            onChange={(e) => setSplit(e.target.value as DatasetSplit)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
          >
            <option value="development">Development Split (Prompt Tuning & Calibration)</option>
            <option value="holdout">Holdout Validation Split (Unbiased Benchmark)</option>
          </select>
        </div>

        <div className="flex items-center gap-3 pt-5">
          <input
            type="checkbox"
            id="is_relevant"
            checked={isRelevant}
            onChange={(e) => setIsRelevant(e.target.checked)}
            className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="is_relevant" className="text-xs font-medium text-slate-200">
            Record contains vague-memory retrieval episode(s)
          </label>
        </div>
      </div>

      {/* Labeller Notes */}
      <div>
        <label className="block text-xs font-medium text-slate-300">Labeller Notes</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Brief notes on why this record was classified this way..."
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Episodes List */}
      {isRelevant && (
        <div className="space-y-4 border-t border-slate-800 pt-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Expected Retrieval Episodes ({episodes.length})
            </h4>
            <button
              type="button"
              onClick={handleAddEpisode}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Episode
            </button>
          </div>

          {episodes.map((ep, epIdx) => (
            <div key={epIdx} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-400">Episode #{epIdx + 1}</span>
                {episodes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveEpisode(epIdx)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-400">Retrieval Goal / Description</label>
                  <input
                    type="text"
                    required
                    value={ep.episode_description}
                    onChange={(e) => handleEpisodeChange(epIdx, "episode_description", e.target.value)}
                    placeholder="e.g. Find photo of dog in yellow raincoat"
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400">Visual Item Type</label>
                  <select
                    value={ep.visual_item_type}
                    onChange={(e) => handleEpisodeChange(epIdx, "visual_item_type", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                  >
                    {VISUAL_ITEM_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Clues */}
              <div className="border-t border-slate-800/80 pt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-400">Remembered Clues</span>
                  <button
                    type="button"
                    onClick={() => handleAddClue(epIdx)}
                    className="text-[11px] text-blue-400 hover:underline"
                  >
                    + Add Clue
                  </button>
                </div>
                {(ep.remembered_clues || []).map((clue: any, clueIdx: number) => (
                  <div key={clueIdx} className="flex gap-2 items-center">
                    <select
                      value={clue.clue_category}
                      onChange={(e) => handleClueChange(epIdx, clueIdx, "clue_category", e.target.value)}
                      className="w-1/3 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                    >
                      {CLUE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={clue.clue_description}
                      onChange={(e) => handleClueChange(epIdx, clueIdx, "clue_description", e.target.value)}
                      placeholder="Clue description..."
                      className="flex-1 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveClue(epIdx, clueIdx)}
                      className="text-slate-500 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-slate-800/80 pt-2 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] text-slate-400">Primary Failure Mode</label>
                  <select
                    value={ep.primary_failure_mode}
                    onChange={(e) => handleEpisodeChange(epIdx, "primary_failure_mode", e.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                  >
                    {FAILURE_TYPES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400">Outcome</label>
                  <select
                    value={ep.outcome}
                    onChange={(e) => handleEpisodeChange(epIdx, "outcome", e.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-white"
                  >
                    {RETRIEVAL_OUTCOMES.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {isSubmitting ? "Saving..." : "Save Gold Annotation"}
        </button>
      </div>
    </form>
  );
}
