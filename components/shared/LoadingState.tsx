import React from "react";

interface LoadingStateProps {
  message?: string;
  rows?: number;
  className?: string;
}

export function LoadingState({
  message = "Loading data...",
  rows = 4,
  className = "",
}: LoadingStateProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <div
          className="h-2 w-2 rounded-full animate-pulse-soft"
          style={{ background: "var(--chart-blue)" }}
        />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {message}
        </span>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="animate-shimmer rounded-xl"
          style={{
            height: i === 0 ? 100 : 60,
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}

export function LoadingCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded-xl ${className}`}
      style={{ height: 120 }}
    />
  );
}
