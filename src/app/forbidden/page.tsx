import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] flex items-center justify-center p-6 relative">
      <Link
        href="/"
        className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-1.5 text-[13px] font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Home
      </Link>
      <div className="w-full max-w-[480px] text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--warning-soft)] text-[var(--warning)] flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <span className="eyebrow block mb-2">ACCESS RESTRICTED — 403</span>
        <h1 className="font-serif text-[32px] sm:text-[38px] font-bold leading-[1.2] text-[var(--ink)] mb-4">
          You don't have access to this area.
        </h1>
        <p className="text-[15px] leading-relaxed text-[var(--ink-muted)] mb-8">
          This portal section requires administrative or delegated branch official privileges. Your current role does not have authorization to view this resource.
        </p>

        <div className="flex justify-center gap-4">
          <Button asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" /> Return to Member Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

