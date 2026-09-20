import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col">
      <header className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 h-18 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[var(--r-md)] bg-[var(--union)] flex items-center justify-center text-white font-serif font-bold text-lg">
              K
            </div>
            <span className="text-[13px] font-semibold tracking-[0.08em] text-[var(--ink)] uppercase">
              KUPPET BUSIA
            </span>
          </Link>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Home
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-12 md:py-16">
        <div className="max-w-[760px] space-y-6">
          <span className="eyebrow block mb-2">LEGAL COMPLIANCE</span>
          <h1 className="font-serif text-[34px] sm:text-[42px] font-bold leading-[1.15] text-[var(--ink)] mb-4">
            Data Protection & Privacy Policy
          </h1>
          <p className="text-[15px] leading-relaxed text-[var(--ink-muted)]">
            Last updated: September 2026. Conforming to the <strong>Kenya Data Protection Act, 2019</strong>.
          </p>

          <div className="space-y-6 text-[15px] leading-relaxed text-[var(--ink-body)] border-t border-[var(--line)] pt-6">
            <section className="space-y-2">
              <h2 className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                1. Data Controller and Principles
              </h2>
              <p>
                KUPPET Busia Branch acts as a Data Controller and Data Processor for member records collected via this portal. We collect and process personal data exclusively for verified trade union administration, welfare disbursement, and workplace safety representation.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                2. Information We Collect
              </h2>
              <p>
                We limit collection strictly to information required for membership verification and welfare claims:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-[14.5px]">
                <li>Official full name and National Identity Card number</li>
                <li>Teachers Service Commission (TSC) registration number</li>
                <li>Contact phone number and institutional email address</li>
                <li>Current school/institution of deployment and sub-county within Busia</li>
                <li>Designation and optional welfare statistical indicators</li>
                <li>Bereavement claims: documentation limited to spouse, children, and parents</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                3. Harassment Reports Confidentiality
              </h2>
              <p>
                Under Section 15 of our branch charter and statutory regulations, harassment reports are categorized as highly confidential. Reports marked anonymous strip all identity attributes from our database. Access to report narratives is restricted to designated branch grievance officers.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-serif text-[20px] font-semibold text-[var(--ink)]">
                4. Your Rights under the Act
              </h2>
              <p>
                You have the right to inspect your profile records, correct inaccurate information, and request audit summaries of actions taken regarding your welfare claims. You may exercise these rights directly through your Member Profile or by contacting the Data Protection Officer at the secretariat.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

