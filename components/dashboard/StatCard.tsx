import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  accentColor?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  subtitle,
  icon,
  trend,
  accentColor = "var(--chart-blue)",
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`rounded-xl border p-5 transition-all duration-200 hover:shadow-lg ${className}`}
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-card)",
      }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div
            className="text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--text-muted)" }}
          >
            {label}
          </div>
          <div
            className="mt-1.5 text-2xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
          {subtitle && (
            <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {subtitle}
            </div>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1 text-xs">
              <span
                style={{
                  color: trend.value >= 0 ? "var(--status-matched)" : "var(--status-not-found)",
                }}
              >
                {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span style={{ color: "var(--text-muted)" }}>{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: `${accentColor}15`,
              color: accentColor,
            }}
          >
            {icon}
          </div>
        )}
      </div>
      {/* Accent line */}
      <div
        className="mt-4 h-0.5 w-full rounded-full"
        style={{
          background: `linear-gradient(90deg, ${accentColor}, transparent)`,
          opacity: 0.5,
        }}
      />
    </div>
  );
}
