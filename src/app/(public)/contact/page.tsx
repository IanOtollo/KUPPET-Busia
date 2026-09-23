import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Phone, Mail, Clock } from "lucide-react";

export default function ContactPage() {
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
            <Image src="/logo.png" alt="KUPPET Logo" width={84} height={56} className="h-14 w-auto object-contain shrink-0" priority />
            <span className="text-[13px] font-semibold tracking-[0.08em] text-[var(--ink)] uppercase truncate">
              KUPPET BUSIA
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 py-12 md:py-16">
        <div className="max-w-[720px]">
          <span className="eyebrow block mb-2">BRANCH HEADQUARTERS</span>
          <h1 className="font-serif text-[34px] sm:text-[42px] font-bold leading-[1.15] text-[var(--ink)] mb-6">
            Contact the Branch Secretariat
          </h1>
          <p className="text-[17px] leading-[1.6] text-[var(--ink-body)] mb-8">
            The branch office is located in Busia town and provides daily consultation, legal defense, and welfare coordination for all accredited members.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 border-t border-[var(--line)] pt-8">
            <div className="p-5 rounded-[var(--r-lg)] bg-[var(--surface)] border border-[var(--line)]">
              <MapPin className="h-5 w-5 text-[var(--union)] mb-3" />
              <h3 className="font-serif text-[17px] font-semibold mb-1">Secretariat Office</h3>
              <p className="text-[14px] text-[var(--ink-muted)] leading-relaxed">
                KUPPET Busia Branch Secretariat<br />
                Teachers Plaza, 2nd Floor<br />
                Off Kisumu-Busia Highway<br />
                Busia Town, Kenya
              </p>
            </div>

            <div className="p-5 rounded-[var(--r-lg)] bg-[var(--surface)] border border-[var(--line)]">
              <Phone className="h-5 w-5 text-[var(--union)] mb-3" />
              <h3 className="font-serif text-[17px] font-semibold mb-1">Telephone & Hotlines</h3>
              <p className="text-[14px] text-[var(--ink-muted)] leading-relaxed">
                Office: <a href="tel:+254722000001" className="text-[var(--union)] font-medium">+254 722 000 001</a><br />
                Executive Secretary: <a href="tel:+254722000004" className="text-[var(--union)] font-medium">+254 722 000 004</a><br />
                Emergency Harassment: <a href="tel:+254722000007" className="text-[var(--danger)] font-medium">+254 722 000 007</a>
              </p>
            </div>

            <div className="p-5 rounded-[var(--r-lg)] bg-[var(--surface)] border border-[var(--line)]">
              <Mail className="h-5 w-5 text-[var(--union)] mb-3" />
              <h3 className="font-serif text-[17px] font-semibold mb-1">Email Enquiries</h3>
              <p className="text-[14px] text-[var(--ink-muted)] leading-relaxed">
                General Secretariat: <a href="mailto:info@kuppetbusia.ke" className="text-[var(--union)]">info@kuppetbusia.ke</a><br />
                Executive Desk: <a href="mailto:execsec@kuppetbusia.ke" className="text-[var(--union)]">execsec@kuppetbusia.ke</a>
              </p>
            </div>

            <div className="p-5 rounded-[var(--r-lg)] bg-[var(--surface)] border border-[var(--line)]">
              <Clock className="h-5 w-5 text-[var(--union)] mb-3" />
              <h3 className="font-serif text-[17px] font-semibold mb-1">Office Working Hours</h3>
              <p className="text-[14px] text-[var(--ink-muted)] leading-relaxed">
                Monday – Friday: 8:00 AM – 5:00 PM<br />
                Saturday: 9:00 AM – 1:00 PM (Emergency Desk)<br />
                Sundays & Public Holidays: Closed
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

