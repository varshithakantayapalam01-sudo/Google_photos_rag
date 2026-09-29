import React from "react";

interface SynthesisSectionProps {
  title: string;
  badge: string;
  badgeColor?: string;
  description: string;
  children: React.ReactNode;
}

export function SynthesisSection({
  title,
  badge,
  badgeColor = "border-blue-500/30 bg-blue-950/40 text-blue-400",
  description,
  children,
}: SynthesisSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
          <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${badgeColor}`}>
            {badge}
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed -mt-2">{description}</p>
      <div className="space-y-4 pt-1">{children}</div>
    </section>
  );
}
