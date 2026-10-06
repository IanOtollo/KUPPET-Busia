"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Phone, Mail, Clock } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function ContactPage() {
  const officials = useQuery(api.officials.listActive);

  const executiveSecretary = officials?.find((o) => o.position === "Executive Secretary");
  const harassmentContact = officials?.find((o) => o.canHandleHarassment && o.phone);

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
            <Image src="/logo.png" alt="KUPPET Logo" width={112} height={56} className="h-14 w-auto object-contain shrink-0" priority />
            <span className="text-[14.5px] font-semibold tracking-[0.08em] text-[var(--ink)] uppercase truncate">
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
              <p className="text-[15.5px] text-[var(--ink-muted)] leading-relaxed">
                KUPPET Busia Branch Secretariat<br />
                Teachers Plaza, 2nd Floor<br />
                Off Kisumu-Busia Highway<br />
                Busia Town, Kenya
              </p>
            </div>

            <div className="p-5 rounded-[var(--r-lg)] bg-[var(--surface)] border border-[var(--line)]">
              <Phone className="h-5 w-5 text-[var(--union)] mb-3" />
              <h3 className="font-serif text-[17px] font-semibold mb-1">Telephone & Hotlines</h3>
              <p className="text-[15.5px] text-[var(--ink-muted)] leading-relaxed">
                {executiveSecretary?.phone ? (
                  <>
                    Executive Secretary: <a href={`tel:${executiveSecretary.phone}`} className="text-[var(--union)] font-medium">{executiveSecretary.phone}</a><br />
                  </>
                ) : null}
                {harassmentContact?.phone ? (
                  <>
                    Emergency Harassment: <a href={`tel:${harassmentContact.phone}`} className="text-[var(--danger)] font-medium">{harassmentContact.phone}</a>
                  </>
                ) : null}
                {!executiveSecretary?.phone && !harassmentContact?.phone && (
                  <span className="text-[var(--ink-muted)]">Branch contact numbers are being updated.</span>
                )}
              </p>
            </div>

            <div className="p-5 rounded-[var(--r-lg)] bg-[var(--surface)] border border-[var(--line)]">
              <Mail className="h-5 w-5 text-[var(--union)] mb-3" />
              <h3 className="font-serif text-[17px] font-semibold mb-1">Email Enquiries</h3>
              <p className="text-[15.5px] text-[var(--ink-muted)] leading-relaxed">
                {executiveSecretary?.email ? (
                  <>
                    Executive Desk: <a href={`mailto:${executiveSecretary.email}`} className="text-[var(--union)]">{executiveSecretary.email}</a>
                  </>
                ) : (
                  <span className="text-[var(--ink-muted)]">Branch email contacts are being updated.</span>
                )}
              </p>
            </div>

            <div className="p-5 rounded-[var(--r-lg)] bg-[var(--surface)] border border-[var(--line)]">
              <Clock className="h-5 w-5 text-[var(--union)] mb-3" />
              <h3 className="font-serif text-[17px] font-semibold mb-1">Office Working Hours</h3>
              <p className="text-[15.5px] text-[var(--ink-muted)] leading-relaxed">
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
