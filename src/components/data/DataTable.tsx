"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: string;
  isMono?: boolean;
  className?: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No records found.",
  onRowClick,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-[14px] text-[var(--ink-muted)] bg-[var(--surface)] border border-[var(--line)] rounded-[var(--r-md)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop & Tablet Table (>=768px) */}
      <div className="hidden md:block overflow-hidden rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-hair)]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="h-[44px] bg-[var(--surface-sunk)] border-b border-[var(--line)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-muted)]",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick && onRowClick(item)}
                className={cn(
                  "h-[56px] transition-colors hover:bg-[var(--canvas)]",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 text-[14.5px] text-[var(--ink-body)]",
                      col.isMono && "mono-ref text-[13px] font-medium text-[var(--ink)]",
                      col.className
                    )}
                  >
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Card View (<768px) — Zero horizontal scroll! */}
      <div className="md:hidden space-y-3">
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            onClick={() => onRowClick && onRowClick(item)}
            className={cn(
              "p-4 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-hair)] space-y-2.5",
              onRowClick && "active:bg-[var(--canvas)] cursor-pointer"
            )}
          >
            {columns.map((col) => (
              <div
                key={col.key}
                className="flex items-center justify-between text-[13.5px] border-b border-[var(--line)] last:border-0 pb-1.5 last:pb-0"
              >
                <span className="text-[11.5px] uppercase font-semibold text-[var(--ink-muted)] tracking-wider">
                  {col.header}
                </span>
                <span
                  className={cn(
                    "text-right text-[var(--ink-body)]",
                    col.isMono && "mono-ref text-[13px] font-medium text-[var(--ink)]"
                  )}
                >
                  {col.render ? col.render(item) : item[col.key]}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

