import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, Award, Users } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col">
      <header className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 h-18 flex items-center justify-between">
          <Button variant="secondary" size="sm" asChild className="shrink-0">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Home
            </Link>
          </Button>
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <Image src="/logo.png" alt="KUPPET Logo" width={52} height={52} className="rounded-[var(--r-md)] bg-white object-contain p-0.5 shrink-0 shadow-sm border border-black/5" />
            <span className="text-[13px] font-semibold tracking-[0.08em] text-[var(--ink)] uppercase truncate">
              KUPPET BUSIA
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-12 md:py-16">
        <div className="max-w-[720px]">
          <span className="eyebrow block mb-2">ABOUT THE BRANCH</span>
          <h1 className="font-serif text-[34px] sm:text-[42px] font-bold leading-[1.15] text-[var(--ink)] mb-6">
            KUPPET Busia County Branch
          </h1>
          <p className="text-[17px] leading-[1.6] text-[var(--ink-body)] mb-8">
            The Kenya Union of Post Primary Education Teachers (KUPPET) Busia County Branch represents secondary school teachers, junior secondary educators, tertiary college tutors, and technical trainers throughout Busia County.
          </p>

          <div className="space-y-6 text-[15px] leading-relaxed text-[var(--ink-body)] border-t border-[var(--line)] pt-8">
            <h2 className="font-serif text-[22px] font-semibold text-[var(--ink)]">
              Our Institutional Mandate
            </h2>
            <p>
              We advocate for fair teacher remuneration, transparent Teacher Service Commission (TSC) postings, equitable promotional appraisals, teacher professional development, and legal protection in labor disputes.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 rounded-[var(--r-md)] bg-[var(--surface)] border border-[var(--line)]">
                <Shield className="h-5 w-5 text-[var(--union)] mb-2" />
                <h4 className="font-semibold text-[15px] mb-1">Teacher Welfare</h4>
                <p className="text-[13px] text-[var(--ink-muted)]">
                  Immediate bereavement assistance and mutual distress interventions.
                </p>
              </div>
              <div className="p-4 rounded-[var(--r-md)] bg-[var(--surface)] border border-[var(--line)]">
                <Award className="h-5 w-5 text-[var(--union)] mb-2" />
                <h4 className="font-semibold text-[15px] mb-1">Labor Rights</h4>
                <p className="text-[13px] text-[var(--ink-muted)]">
                  Legal representation before TSC tribunals and labor dispute arbitration.
                </p>
              </div>
              <div className="p-4 rounded-[var(--r-md)] bg-[var(--surface)] border border-[var(--line)]">
                <Users className="h-5 w-5 text-[var(--union)] mb-2" />
                <h4 className="font-semibold text-[15px] mb-1">Community Asset</h4>
                <p className="text-[13px] text-[var(--ink-muted)]">
                  Branch 62-passenger bus service for educational excursions and member events.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

