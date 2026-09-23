"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { OfficialCard, OfficialProps } from "@/components/modules/OfficialCard";
import { EmptyState } from "@/components/data/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

export default function MemberOfficialsPage() {
  const officials = useQuery(api.officials.listActive);
  const executives = officials?.filter((official: OfficialProps) => official.tier === "executive") ?? [];
  const branchOfficials = officials?.filter((official: OfficialProps) => official.tier === "official") ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="BRANCH LEADERSHIP"
        title="Branch Officials & Responsibilities"
        lead="Meet the officials serving KUPPET Busia and view their mandates and contact details."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Branch Officials" }]}
      />
      {officials === undefined && <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-72" />)}</div>}
      {officials?.length === 0 && <EmptyState icon={Users} title="Officials Directory Updating" description="The branch leadership directory is being updated." />}
      {officials && officials.length > 0 && (
        <div className="space-y-10">
          <OfficialSection title="Executive Committee" officials={executives} />
          <OfficialSection title="Branch Officials" officials={branchOfficials} />
        </div>
      )}
    </div>
  );
}

function OfficialSection({ title, officials }: { title: string; officials: OfficialProps[] }) {
  if (officials.length === 0) return null;
  return <section><h2 className="mb-5 font-serif text-[22px] font-semibold text-[var(--ink)]">{title}</h2><div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">{officials.map((official) => <OfficialCard key={official._id} official={official} />)}</div></section>;
}
