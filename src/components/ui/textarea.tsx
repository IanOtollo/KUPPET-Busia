import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[120px] w-full resize-y rounded-[var(--r-md)] border bg-[var(--surface)] px-[14px] py-3 text-[15px] text-[var(--ink-body)] placeholder:text-[var(--ink-muted)] shadow-[var(--shadow-hair)] transition-colors disabled:cursor-not-allowed disabled:bg-[var(--surface-sunk)] disabled:opacity-60",
          error
            ? "border-[var(--danger)] focus-visible:border-[var(--danger)] focus-visible:ring-2 focus-visible:ring-[var(--danger-soft)]"
            : "border-[var(--line-strong)] focus-visible:border-[var(--union)] focus-visible:ring-[3px] focus-visible:ring-[rgba(31,61,92,0.12)]",
          "focus-visible:outline-none",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };

