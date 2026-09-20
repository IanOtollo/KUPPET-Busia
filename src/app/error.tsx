"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RotateCcw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [refCode, setRefCode] = useState<string>("");

  useEffect(() => {
    // Generate an incident reference code
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRefCode(`ERR-${new Date().getFullYear()}-${randomHex}`);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center p-6">
      <div className="w-full max-w-[480px] text-center">
        <span className="eyebrow block mb-3 text-[var(--danger)]">
          SYSTEM NOTICE
        </span>
        <h1 className="font-serif text-[34px] sm:text-[40px] font-bold leading-[1.15] text-[var(--ink)] tracking-[-0.015em] mb-4">
          Something went wrong on our end.
        </h1>
        <p className="text-[15px] leading-relaxed text-[var(--ink-muted)] mb-4">
          An unexpected system exception occurred while processing your request. Our technical secretariat has been alerted.
        </p>

        {refCode && (
          <div className="p-3 bg-[var(--surface-sunk)] border border-[var(--line)] rounded-[var(--r-md)] mb-6 text-left">
            <span className="text-[11.5px] uppercase tracking-wider text-[var(--ink-muted)] block">
              Quote Reference Code to Branch Office:
            </span>
            <span className="mono-ref text-[15px] font-semibold text-[var(--ink)] block mt-0.5">
              {refCode}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => reset()}>
            <RotateCcw className="h-4 w-4 mr-2" /> Try Again
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/dashboard">
              <Home className="h-4 w-4 mr-2" /> Return to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

