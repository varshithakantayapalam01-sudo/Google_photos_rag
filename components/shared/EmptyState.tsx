import React from "react";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = "No data available",
  message = "There is no data to display at this time. Data will appear here once the pipeline has processed records.",
  icon,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border px-6 py-16 text-center ${className}`}
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-card)",
      }}
    >
      <div
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: "rgba(100, 116, 139, 0.1)" }}
      >
        {icon || (
          <Inbox className="h-6 w-6" style={{ color: "var(--text-muted)" }} />
        )}
      </div>
      <h3
        className="text-sm font-semibold"
        style={{ color: "var(--text-secondary)" }}
      >
        {title}
      </h3>
      <p
        className="mt-1.5 max-w-sm text-xs leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        {message}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
