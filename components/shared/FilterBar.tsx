"use client";

import React from "react";
import { Filter } from "lucide-react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

interface FilterBarProps {
  filters: FilterGroup[];
  onReset?: () => void;
  className?: string;
}

function formatLabel(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function FilterBar({ filters, onReset, className = "" }: FilterBarProps) {
  const hasActiveFilters = filters.some((f) => f.value !== "");

  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${className}`}
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-card)",
      }}
    >
      <div
        className="flex items-center gap-1.5 text-xs font-medium"
        style={{ color: "var(--text-muted)" }}
      >
        <Filter className="h-3.5 w-3.5" />
        <span>Filters</span>
      </div>

      {filters.map((filter) => (
        <div key={filter.id} className="flex items-center gap-1.5">
          <label
            htmlFor={`filter-${filter.id}`}
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {filter.label}:
          </label>
          <select
            id={`filter-${filter.id}`}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="rounded-md border px-2 py-1 text-xs outline-none transition-colors focus:ring-1"
            style={{
              borderColor: "var(--border-default)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
            }}
          >
            <option value="">All</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {formatLabel(opt.label)}
              </option>
            ))}
          </select>
        </div>
      ))}

      {hasActiveFilters && onReset && (
        <button
          onClick={onReset}
          className="ml-auto rounded-md px-2 py-1 text-xs transition-colors hover:bg-white/5"
          style={{ color: "var(--text-accent)" }}
        >
          Reset
        </button>
      )}
    </div>
  );
}
