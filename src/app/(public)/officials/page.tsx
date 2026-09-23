"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { OfficialCard, OfficialProps } from "@/components/modules/OfficialCard";
import { EmptyState } from "@/components/data/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function PublicOfficialsPage() {
  const officials = useQuery(api.officials.listActive);
  const executives = officials?.filter((o: OfficialProps) => o.tier === "executive") || [];
  const standardOfficials = officials?.filter((o: OfficialProps) => o.tier === "official") || [];
  const subcountyReps = officials?.filter((o: OfficialProps) => o.tier === "subcounty") || [];

  return (
    <main className="min-h-screen bg-[var(--canvas)] px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <div className="mx-auto max-w-[1200px]">
        <PageHeader
          eyebrow="BRANCH LEADERSHIP"
          title="Branch Officials & Responsibilities"
          lead="Meet the executive leadership and branch officials serving KUPPET Busia."
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Branch Officials" }]}
        />

        {officials === undefined && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="space-y-4 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] p-6">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        )}

        {officials !== undefined && officials.length === 0 && (
          <EmptyState
            icon={Users}
            title="Officials Directory Updating"
            description="The branch roster is currently being updated for the ongoing constitutional term."
            actionLabel="Return Home"
            actionHref="/"
          />
        )}

        {officials !== undefined && officials.length > 0 && (
          <div className="space-y-12">
            {executives.length > 0 && (
              <OfficialSection title="Executive Committee" color="bg-[var(--brass)]" officials={executives} />
            )}
            {standardOfficials.length > 0 && (
              <OfficialSection title="Branch Officials" color="bg-[var(--union)]" officials={standardOfficials} />
            )}
            {subcountyReps.length > 0 && (
              <OfficialSection title="Sub-County Representatives" color="bg-[var(--brass)]" officials={subcountyReps} />
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function OfficialSection({ title, color, officials }: { title: string; color: string; officials: OfficialProps[] }) {
  return (
    <section>
      <div className="mb-5 flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <h2 className="font-serif text-[22px] font-semibold text-[var(--ink)]">{title}</h2>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {officials.map((official) => <OfficialCard key={official._id} official={official} />)}
      </div>
    </section>
  );
}
