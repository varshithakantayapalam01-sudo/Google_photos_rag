"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Brain,
  AlertTriangle,
  FileSearch,
  ChevronLeft,
  ChevronRight,
  Search,
  Layers,
  Lightbulb,
  MessageSquare,
  BookOpen,
  ShieldAlert,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  description: string;
}

const navItems: NavItem[] = [
  {
    label: "Overview",
    href: "/",
    icon: <BarChart3 className="h-4.5 w-4.5" />,
    description: "Dataset statistics & distributions",
  },
  {
    label: "Memory & Behaviour",
    href: "/memory",
    icon: <Brain className="h-4.5 w-4.5" />,
    description: "Clues, forgotten attributes, workarounds",
  },
  {
    label: "Failure Explorer",
    href: "/failures",
    icon: <AlertTriangle className="h-4.5 w-4.5" />,
    description: "Failure modes & flow analysis",
  },
  {
    label: "Evidence Explorer",
    href: "/evidence",
    icon: <FileSearch className="h-4.5 w-4.5" />,
    description: "Filterable episodes with span highlights",
  },
  {
    label: "Opportunities",
    href: "/opportunities",
    icon: <Lightbulb className="h-4.5 w-4.5" />,
    description: "Pattern discovery & measurable dimensions",
  },
  {
    label: "Ask the Research",
    href: "/ask",
    icon: <MessageSquare className="h-4.5 w-4.5" />,
    description: "Hybrid RAG + SQL analytics query engine",
  },
  {
    label: "Research Synthesis",
    href: "/synthesis",
    icon: <BookOpen className="h-4.5 w-4.5" />,
    description: "What We Know, Think & Need to Validate",
  },
  {
    label: "Limitations & Bias",
    href: "/limitations",
    icon: <ShieldAlert className="h-4.5 w-4.5" />,
    description: "Dataset bias & epistemic boundaries",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r transition-all duration-300 ease-in-out ${
        collapsed ? "w-[68px]" : "w-[260px]"
      }`}
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-secondary)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 border-b px-4 py-4"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #6366f1)",
          }}
        >
          <Search className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div
              className="text-sm font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Discovery Engine
            </div>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              Google Photos Research
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {!collapsed && (
          <div
            className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            Research Views
          </div>
        )}
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                collapsed ? "justify-center" : ""
              }`}
              style={{
                background: active
                  ? "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.1))"
                  : "transparent",
                color: active ? "var(--text-accent)" : "var(--text-secondary)",
                borderLeft: active ? "2px solid var(--chart-blue)" : "2px solid transparent",
              }}
              title={collapsed ? item.label : undefined}
            >
              <span
                className="shrink-0 transition-colors"
                style={{
                  color: active ? "var(--chart-blue)" : "var(--text-muted)",
                }}
              >
                {item.icon}
              </span>
              {!collapsed && (
                <div className="min-w-0">
                  <div>{item.label}</div>
                  <div
                    className="truncate text-[10px] font-normal"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.description}
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Version & Collapse */}
      <div
        className="border-t px-3 py-3"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        {!collapsed && (
          <div className="mb-2 flex items-center gap-2 px-2">
            <Layers className="h-3 w-3" style={{ color: "var(--text-muted)" }} />
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              Pipeline v2.1 (FINAL)
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg py-2 text-xs transition-colors hover:bg-white/5"
          style={{ color: "var(--text-muted)" }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-1" />
              Collapse
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
