"use client";

import React, { useState } from "react";
import { Search, Loader2, CornerDownLeft, Sparkles } from "lucide-react";

interface QueryInterfaceProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

export function QueryInterface({ onSubmit, isLoading }: QueryInterfaceProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;
    onSubmit(query.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <div className="relative flex items-center rounded-2xl border border-slate-700/80 bg-slate-900/90 shadow-2xl transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 backdrop-blur-md">
        <div className="pl-4 text-slate-400">
          <Search className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask any quantitative, qualitative, or comparative research question..."
          disabled={isLoading}
          className="w-full bg-transparent px-4 py-4 text-sm text-white placeholder-slate-400 focus:outline-none disabled:opacity-50"
        />
        <div className="pr-3 flex items-center gap-2">
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <span>Ask</span>
                <CornerDownLeft className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
      <div className="flex items-center justify-between px-2 text-[11px] text-slate-500">
        <span>Press <kbd className="rounded border border-slate-800 bg-slate-900 px-1 py-0.5 text-slate-400 font-mono">Enter ↵</kbd> to submit</span>
        <span>Rate limit: 10 requests / min</span>
      </div>
    </form>
  );
}
