import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-[44px] w-full rounded-[var(--r-md)] border bg-[var(--surface)] px-[14px] py-2 text-[15px] text-[var(--ink-body)] placeholder:text-[var(--ink-muted)] shadow-[var(--shadow-hair)] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:bg-[var(--surface-sunk)] disabled:opacity-60",
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
Input.displayName = "Input";

export { Input };

