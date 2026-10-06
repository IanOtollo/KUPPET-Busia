import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--canvas)]">
      {/* Header */}
      <header className="border-b border-[var(--line)] bg-[var(--surface)] sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 h-18 flex items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Image src="/logo.png" alt="KUPPET Logo" width={112} height={56} className="h-14 w-auto object-contain shrink-0" priority />
            <div className="min-w-0">
              <span className="block truncate text-[12.5px] font-semibold tracking-[0.04em] text-[var(--ink)] uppercase sm:text-[14.5px] sm:tracking-[0.08em]">
                KUPPET BUSIA
              </span>
              <span className="block text-[12px] text-[var(--ink-muted)] sm:text-[13px]">
                Branch Portal
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Button variant="secondary" size="sm" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button variant="primary" size="sm" className="hidden xs:inline-flex" asChild>
              <Link href="/register">Join Portal</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="py-16 md:py-24 border-b border-[var(--line)]">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
            <div className="max-w-[760px]">
              <span className="eyebrow block mb-3">KENYA UNION OF POST PRIMARY EDUCATION TEACHERS</span>
              <h1 className="font-serif text-[34px] sm:text-[44px] font-bold leading-[1.15] text-[var(--ink)] tracking-[-0.015em] mb-6">
                Serving the secondary & tertiary educators of Busia County.
              </h1>
              <p className="text-[17px] leading-[1.6] text-[var(--ink-body)] mb-8 max-w-[68ch]">
                Manage your membership, track branch announcements, and stay connected with the union — all in one place.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/register" className="flex items-center gap-2">
                    Access Member Portal <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="secondary" size="lg" asChild>
                  <Link href="/officials">Meet Branch Officials</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] bg-[var(--surface-sunk)] py-10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[14.5px] text-[var(--ink-muted)]">
          <p>© 2026 KUPPET Busia Branch. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-[var(--ink)]">About Branch</Link>
            <Link href="/privacy" className="hover:text-[var(--ink)]">Privacy Policy</Link>
            <Link href="/contact" className="hover:text-[var(--ink)]">Contact Office</Link>
            <Link href="/login" className="hover:text-[var(--ink)] font-medium text-[var(--union)]">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

