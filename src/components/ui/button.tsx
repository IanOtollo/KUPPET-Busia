import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-[15px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--union)] focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-45 active:translate-y-[1px] cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--union)] text-white hover:bg-[var(--union-hover)] rounded-[var(--r-md)] border-0",
        secondary:
          "bg-[var(--surface)] text-[var(--ink)] border border-[var(--line-strong)] hover:bg-[var(--surface-sunk)] rounded-[var(--r-md)]",
        ghost:
          "bg-transparent text-[var(--ink-body)] hover:bg-[var(--surface-sunk)] rounded-[var(--r-md)] border-0",
        destructive:
          "bg-[var(--danger)] text-white hover:opacity-90 rounded-[var(--r-md)] border-0",
        link: "text-[var(--union)] underline-offset-[3px] hover:underline p-0 h-auto border-0 cursor-pointer font-medium",
      },
      size: {
        default: "h-[44px] px-5",
        sm: "h-[40px] px-3 text-[13.5px]",
        lg: "h-[48px] px-6 text-[16px]",
        icon: "h-[40px] w-[40px] p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
        <span>{loading ? loadingText || "Please wait…" : children}</span>
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

