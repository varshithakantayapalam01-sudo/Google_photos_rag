"use client";

import React, { useMemo } from "react";

interface HeatmapCell {
  row: string;
  col: string;
  value: number;
}

interface HeatmapChartProps {
  title: string;
  subtitle?: string;
  data: HeatmapCell[];
  rowLabel?: string;
  colLabel?: string;
  className?: string;
}

function formatLabel(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getHeatColor(value: number, max: number): string {
  if (max === 0) return "rgba(59, 130, 246, 0.05)";
  const intensity = Math.min(value / max, 1);
  const alpha = 0.1 + intensity * 0.7;
  return `rgba(59, 130, 246, ${alpha})`;
}

export function HeatmapChart({
  title,
  subtitle,
  data,
  rowLabel = "Row",
  colLabel = "Column",
  className = "",
}: HeatmapChartProps) {
  const { rows, cols, matrix, maxVal } = useMemo(() => {
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    let maxVal = 0;

    data.forEach((d) => {
      rowSet.add(d.row);
      colSet.add(d.col);
      if (d.value > maxVal) maxVal = d.value;
    });

    const rows = Array.from(rowSet);
    const cols = Array.from(colSet);
    const matrix = new Map<string, number>();
    data.forEach((d) => {
      matrix.set(`${d.row}:::${d.col}`, d.value);
    });

    return { rows, cols, matrix, maxVal };
  }, [data]);

  if (data.length === 0) {
    return (
      <div
        className={`rounded-xl border p-5 ${className}`}
        style={{
          borderColor: "var(--border-subtle)",
          background: "var(--bg-card)",
        }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h3>
        <div
          className="mt-6 flex h-32 items-center justify-center text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          No co-occurrence data available
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-5 ${className}`}
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-card)",
      }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs" style={{ borderCollapse: "separate", borderSpacing: 2 }}>
          <thead>
            <tr>
              <th
                className="sticky left-0 z-10 px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wider"
                style={{ color: "var(--text-muted)", background: "var(--bg-card)" }}
              >
                {rowLabel} / {colLabel}
              </th>
              {cols.map((col) => (
                <th
                  key={col}
                  className="px-2 py-1.5 text-center text-[10px] font-medium"
                  style={{ color: "var(--text-muted)" }}
                  title={formatLabel(col)}
                >
                  <div className="w-16 truncate">{formatLabel(col)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <td
                  className="sticky left-0 z-10 whitespace-nowrap px-2 py-1.5 font-medium"
                  style={{ color: "var(--text-secondary)", background: "var(--bg-card)" }}
                >
                  {formatLabel(row)}
                </td>
                {cols.map((col) => {
                  const val = matrix.get(`${row}:::${col}`) || 0;
                  return (
                    <td
                      key={col}
                      className="px-2 py-1.5 text-center font-mono transition-all"
                      style={{
                        background: getHeatColor(val, maxVal),
                        color: val > 0 ? "var(--text-primary)" : "var(--text-muted)",
                        borderRadius: 4,
                      }}
                      title={`${formatLabel(row)} × ${formatLabel(col)}: ${val} episodes`}
                    >
                      {val > 0 ? val : "·"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
        <span>Low</span>
        <div className="flex gap-0.5">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((a) => (
            <div
              key={a}
              className="h-3 w-5 rounded-sm"
              style={{ background: `rgba(59, 130, 246, ${a})` }}
            />
          ))}
        </div>
        <span>High</span>
      </div>
    </div>
  );
}
