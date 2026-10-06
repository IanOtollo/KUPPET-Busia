import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A plain <select> styled to match SelectTrigger. Unlike the Radix Select it
 * doesn't lock page scrolling while open, and phones show their own picker —
 * the better choice for short lists inside long forms.
 */
const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }
>(({ className, error, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        "h-[48px] w-full appearance-none rounded-[var(--r-md)] border bg-[var(--surface)] pl-[14px] pr-10 py-2 text-[16px] text-[var(--ink-body)] shadow-[var(--shadow-hair)] transition-colors focus:outline-none disabled:cursor-not-allowed disabled:bg-[var(--surface-sunk)] disabled:opacity-60 cursor-pointer",
        error
          ? "border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger-soft)]"
          : "border-[var(--line-strong)] focus:border-[var(--union)] focus:ring-[3px] focus:ring-[rgba(31,61,92,0.12)]",
        className
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50" />
  </div>
));
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
