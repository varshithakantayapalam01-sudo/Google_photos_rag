"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { ValidationBadge } from "@/components/dashboard/ValidationBadge";

interface BreadcrumbSegment {
  label: string;
  href: string;
}

function getBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  const crumbs: BreadcrumbSegment[] = [{ label: "Dashboard", href: "/" }];

  if (pathname === "/") return crumbs;

  const segments = pathname.split("/").filter(Boolean);
  const labelMap: Record<string, string> = {
    memory: "Memory & Behaviour",
    failures: "Failure Explorer",
    evidence: "Evidence Explorer",
  };

  let path = "";
  for (const segment of segments) {
    path += `/${segment}`;
    crumbs.push({
      label: labelMap[segment] || decodeURIComponent(segment),
      href: path,
    });
  }

  return crumbs;
}

export function Header() {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);
  const pageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard";

  return (
    <header
      className="sticky top-0 z-30 border-b backdrop-blur-md"
      style={{
        borderColor: "var(--border-subtle)",
        background: "rgba(10, 15, 30, 0.85)",
      }}
    >
      <div className="flex items-center justify-between px-6 py-3">
        <div className="min-w-0">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-xs" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <React.Fragment key={crumb.href}>
                {i > 0 && (
                  <ChevronRight
                    className="h-3 w-3 shrink-0"
                    style={{ color: "var(--text-muted)" }}
                  />
                )}
                {i < breadcrumbs.length - 1 ? (
                  <Link
                    href={crumb.href}
                    className="truncate transition-colors hover:underline"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="truncate font-medium" style={{ color: "var(--text-secondary)" }}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
          {/* Page title */}
          <h1
            className="mt-0.5 text-lg font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            {pageTitle}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <ValidationBadge />
        </div>
      </div>
    </header>
  );
}
