"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

const CHART_COLORS = [
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#f43f5e",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#ec4899",
  "#a855f7",
  "#22d3ee",
  "#84cc16",
  "#e879f9",
  "#fb923c",
  "#34d399",
];

interface DistributionItem {
  label: string;
  value: number;
  percentage?: number;
}

interface DistributionChartProps {
  title: string;
  subtitle?: string;
  data: DistributionItem[];
  type?: "bar" | "horizontal-bar" | "pie";
  height?: number;
  showPercentage?: boolean;
  className?: string;
}

function formatLabel(str: string): string {
  return str
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DistributionChart({
  title,
  subtitle,
  data,
  type = "bar",
  height = 300,
  showPercentage = true,
  className = "",
}: DistributionChartProps) {
  const formattedData = data.map((d) => ({
    name: formatLabel(d.label),
    value: d.value,
    percentage: d.percentage,
    rawLabel: d.label,
  }));

  return (
    <div
      className={`rounded-xl border p-5 ${className}`}
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-card)",
      }}
    >
      <div className="mb-4">
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </h3>
        {subtitle && (
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>

      {data.length === 0 ? (
        <div
          className="flex items-center justify-center text-xs"
          style={{ height, color: "var(--text-muted)" }}
        >
          No data available
        </div>
      ) : type === "pie" ? (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={formattedData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={height / 3}
              innerRadius={height / 5}
              strokeWidth={2}
              stroke="var(--bg-card)"
              label={({ name, percentage }) =>
                showPercentage && percentage != null
                  ? `${name} (${percentage}%)`
                  : name
              }
              labelLine={{ stroke: "var(--text-muted)", strokeWidth: 1 }}
            >
              {formattedData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                value.toLocaleString(),
                name,
              ]}
            />
            <Legend
              wrapperStyle={{
                fontSize: "11px",
                color: "var(--text-secondary)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : type === "horizontal-bar" ? (
        <ResponsiveContainer width="100%" height={Math.max(height, formattedData.length * 36)}>
          <BarChart
            data={formattedData}
            layout="vertical"
            margin={{ left: 100, right: 20, top: 5, bottom: 5 }}
          >
            <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
              width={95}
            />
            <Tooltip
              formatter={(value: number, _: string, entry: any) => {
                const pct = entry?.payload?.percentage;
                return [
                  pct != null
                    ? `${value.toLocaleString()} (${pct}%)`
                    : value.toLocaleString(),
                  "Episodes",
                ];
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {formattedData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={formattedData} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
            <XAxis
              dataKey="name"
              tick={{ fill: "var(--text-muted)", fontSize: 10 }}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
            <Tooltip
              formatter={(value: number, _: string, entry: any) => {
                const pct = entry?.payload?.percentage;
                return [
                  pct != null
                    ? `${value.toLocaleString()} (${pct}%)`
                    : value.toLocaleString(),
                  "Episodes",
                ];
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {formattedData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
