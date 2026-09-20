import * as React from "react";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)]">
      <div className="w-16 h-16 rounded-full bg-[var(--surface-sunk)] flex items-center justify-center text-[var(--ink-muted)] mb-4">
        <Icon className="h-10 w-10 stroke-[1.5]" />
      </div>
      <h3 className="font-serif text-[19px] font-semibold text-[var(--ink)] mb-2">
        {title}
      </h3>
      <p className="text-[14px] leading-relaxed text-[var(--ink-muted)] max-w-[54ch] mb-6">
        {description}
      </p>

      {actionLabel && actionHref && (
        <Button asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}

      {actionLabel && onAction && !actionHref && (
        <Button onClick={onAction}>{actionLabel}</Button>
      )}
    </div>
  );
}

