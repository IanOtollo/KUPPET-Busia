import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  eyebrow: string;
  title: string;
  lead?: string;
  breadcrumbs?: BreadcrumbItem[];
  action?: React.ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  lead,
  breadcrumbs,
  action,
}: PageHeaderProps) {
  return (
    <div className="mb-8">
      {/* Breadcrumbs if provided */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumbs"
          className="flex items-center gap-1.5 text-[12.5px] text-[var(--ink-muted)] mb-2"
        >
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="h-3.5 w-3.5 opacity-50 shrink-0" />}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="hover:text-[var(--ink)] hover:underline"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? "text-[var(--ink)] font-medium" : ""}>
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Eyebrow */}
      <span className="eyebrow block mb-2">{eyebrow}</span>

      {/* Title & Action Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="font-serif text-[28px] sm:text-[34px] font-bold leading-[1.15] text-[var(--ink)] tracking-[-0.015em]">
          {title}
        </h1>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* Lead description */}
      {lead && (
        <p className="text-[16px] sm:text-[17px] leading-[1.6] text-[var(--ink-muted)] max-w-[68ch] mt-2">
          {lead}
        </p>
      )}

      {/* Hairline Divider Rule */}
      <div className="h-px bg-[var(--line)] w-full mt-6" />
    </div>
  );
}

