import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center p-6 relative">
      <Link
        href="/"
        className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-1.5 text-[13px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Link>
      <div className="w-full max-w-[480px] text-center">
        <span className="eyebrow block mb-3">ERROR 404</span>
        <h1 className="font-serif text-[36px] sm:text-[44px] font-bold leading-[1.15] text-[var(--ink)] tracking-[-0.015em] mb-4">
          This page could not be found.
        </h1>
        <p className="text-[16px] leading-relaxed text-[var(--ink-muted)] mb-8">
          The link you followed may be expired or the address was mistyped.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
            </Link>
          </Button>
        </div>

        <div className="pt-6 border-t border-[var(--line)]">
          <p className="text-[12.5px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold mb-3">
            Helpful Portals
          </p>
          <div className="flex justify-center gap-6 text-[14px] text-[var(--union)]">
            <Link href="/bereavement" className="hover:underline">
              Bereavement Cases
            </Link>
            <Link href="/bus" className="hover:underline">
              Bus Reservation
            </Link>
            <Link href="/officials" className="hover:underline">
              Branch Officials
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

