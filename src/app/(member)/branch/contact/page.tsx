import { PageHeader } from "@/components/layout/PageHeader";
import { Clock, Mail, MapPin, Phone } from "lucide-react";

const CONTACT_ITEMS = [
  { icon: MapPin, title: "Secretariat Office", detail: "KUPPET Busia Branch Secretariat, Teachers Plaza, 2nd Floor, Busia Town, Kenya" },
  { icon: Phone, title: "Telephone & Hotlines", detail: "+254 722 000 001 · Office hours support" },
  { icon: Mail, title: "Email Enquiries", detail: "info@kuppetbusia.ke" },
  { icon: Clock, title: "Working Hours", detail: "Monday–Friday: 8:00 AM–5:00 PM" },
];

export default function MemberContactPage() {
  return (
    <div>
      <PageHeader eyebrow="BRANCH HEADQUARTERS" title="Contact the Branch Secretariat" lead="Reach the branch office for consultation, welfare support, and union services." breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Contact Office" }]} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {CONTACT_ITEMS.map(({ icon: Icon, title, detail }) => <div key={title} className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] p-5"><Icon className="mb-3 h-5 w-5 text-[var(--union)]" /><h2 className="font-serif text-lg font-semibold text-[var(--ink)]">{title}</h2><p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">{detail}</p></div>)}
      </div>
    </div>
  );
}
