"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminGuard } from "@/components/layout/AdminGuard";
import {
  Layers,
  Upload,
  Database,
  Cpu,
  CheckCircle2,
  AlertOctagon,
  ArrowLeft,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin", label: "Overview", icon: Layers },
    { href: "/admin/import", label: "Data Import", icon: Upload },
    { href: "/admin/batches", label: "Batches", icon: Database },
    { href: "/admin/pipeline", label: "Pipeline", icon: Cpu },
    { href: "/admin/gold", label: "Gold Dataset", icon: CheckCircle2 },
    { href: "/admin/quality", label: "Quality Flags", icon: AlertOctagon },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Admin Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Public Dashboard</span>
            </Link>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[11px] font-bold text-blue-400">
                ADMIN CONSOLE
              </span>
              <span className="text-sm font-semibold text-white">Discovery Engine</span>
            </div>
          </div>
        </div>

        {/* Sub-nav Tabs */}
        <div className="mx-auto flex max-w-7xl space-x-1 overflow-x-auto px-4 sm:px-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <AdminGuard>{children}</AdminGuard>
      </main>
    </div>
  );
}
