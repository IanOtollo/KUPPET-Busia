import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Shield, HeartHandshake, Bus, Users, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--canvas)]">
      {/* Header */}
      <header className="border-b border-[var(--line)] bg-[var(--surface)] sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 h-18 flex items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Image src="/logo.png" alt="KUPPET Logo" width={84} height={56} className="h-14 w-auto object-contain shrink-0" priority />
            <div className="min-w-0">
              <span className="block truncate text-[11px] font-semibold tracking-[0.04em] text-[var(--ink)] uppercase sm:text-[13px] sm:tracking-[0.08em]">
                KUPPET BUSIA
              </span>
              <span className="block text-[10px] text-[var(--ink-muted)] sm:text-[11.5px]">
                Branch Portal
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/officials">Branch Officials</Link>
            </Button>
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
                Report bereavement cases, raise workplace concerns confidentially, book the union bus, and reach your branch leadership — all in one place.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="lg" asChild>
                  <Link href="/login" className="flex items-center gap-2">
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

        {/* Feature pillars */}
        <section className="py-16 bg-[var(--surface)]">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--canvas)]">
                <div className="w-10 h-10 rounded-[var(--r-md)] bg-[var(--union-soft)] text-[var(--union)] flex items-center justify-center mb-4">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-2">
                  Bereavement Welfare
                </h3>
                <p className="text-[14px] leading-relaxed text-[var(--ink-muted)]">
                  Welfare claims for the loss of a parent, spouse, or child.
                </p>
              </div>

              <div className="p-6 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--canvas)]">
                <div className="w-10 h-10 rounded-[var(--r-md)] bg-[var(--union-soft)] text-[var(--union)] flex items-center justify-center mb-4">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-2">
                  Safe Harassment Reporting
                </h3>
                <p className="text-[14px] leading-relaxed text-[var(--ink-muted)]">
                  Confidential reporting with optional anonymity.
                </p>
              </div>

              <div className="p-6 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--canvas)]">
                <div className="w-10 h-10 rounded-[var(--r-md)] bg-[var(--union-soft)] text-[var(--union)] flex items-center justify-center mb-4">
                  <Bus className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-2">
                  Union Bus Booking
                </h3>
                <p className="text-[14px] leading-relaxed text-[var(--ink-muted)]">
                  Reserve the union bus with live availability.
                </p>
              </div>

              <div className="p-6 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--canvas)]">
                <div className="w-10 h-10 rounded-[var(--r-md)] bg-[var(--union-soft)] text-[var(--union)] flex items-center justify-center mb-4">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-2">
                  Branch Leadership
                </h3>
                <p className="text-[14px] leading-relaxed text-[var(--ink-muted)]">
                  Contact details for your branch executive leaders.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--line)] bg-[var(--surface-sunk)] py-10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[13px] text-[var(--ink-muted)]">
          <p>© 2026 KUPPET Busia Branch. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/about" className="hover:text-[var(--ink)]">About Branch</Link>
            <Link href="/privacy" className="hover:text-[var(--ink)]">Privacy Policy</Link>
            <Link href="/contact" className="hover:text-[var(--ink)]">Contact Office</Link>
            <Link href="/admin-login" className="hover:text-[var(--ink)] font-medium text-[var(--union)]">Admin Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

