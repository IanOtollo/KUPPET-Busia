import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--r-md)] bg-[var(--surface-sunk)]",
        className
      )}
      style={{
        animationDuration: "1.4s",
      }}
      {...props}
    />
  );
}

export { Skeleton };

