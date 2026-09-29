"use client";

import React, { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { QueryInterface } from "@/components/ask/QueryInterface";
import { SuggestedQuestions } from "@/components/ask/SuggestedQuestions";
import { AnswerCard } from "@/components/ask/AnswerCard";
import { LoadingState } from "@/components/shared/LoadingState";
import { Search, Sparkles, AlertCircle } from "lucide-react";
import type { AskQueryResponse } from "@/types/api";

export default function AskResearchPage() {
  const [currentQuery, setCurrentQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AskQueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (queryText: string) => {
    setCurrentQuery(queryText);
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: queryText }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to process research inquiry");
      }

      setResponse(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* Hero Section */}
        <div className="text-center space-y-3 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 text-blue-400">
            <Sparkles className="h-3.5 w-3.5 text-blue-400" />
            <span>Hybrid RAG + Deterministic SQL Analytics</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ask the Research
          </h1>
          <p className="max-w-xl mx-auto text-sm text-slate-400 leading-relaxed">
            Query the behavioral evidence base. The engine automatically classifies questions to execute deterministic full-dataset SQL or semantic vector retrieval with citation verification.
          </p>
        </div>

        {/* Input Form */}
        <QueryInterface onSubmit={handleSearch} isLoading={isLoading} />

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <div className="font-semibold">Query Processing Notice</div>
              <p className="mt-0.5 text-xs text-rose-400/90">{error}</p>
            </div>
          </div>
        )}

        {/* Loading Spinner / Skeleton */}
        {isLoading && (
          <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/50">
            <LoadingState message={`Executing hybrid search for "${currentQuery}"...`} rows={4} />
          </div>
        )}

        {/* Active Response Display */}
        {!isLoading && response && (
          <div className="space-y-6">
            <AnswerCard data={response} />
          </div>
        )}

        {/* Suggested Questions Catalog */}
        <SuggestedQuestions onSelect={(q) => handleSearch(q)} />
      </div>
    </PageContainer>
  );
}
