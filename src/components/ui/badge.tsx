import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center h-[28px] px-[12px] rounded-[var(--r-full)] text-[13.5px] font-semibold transition-colors select-none",
  {
    variants: {
      variant: {
        default: "bg-[var(--surface-sunk)] text-[var(--ink-body)]",
        info: "bg-[var(--info-soft)] text-[var(--info)]",
        warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
        success: "bg-[var(--success-soft)] text-[var(--success)]",
        danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
        brass: "bg-[var(--brass-soft)] text-[var(--brass)]",
        neutral: "bg-[var(--surface-sunk)] text-[var(--ink-muted)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

