"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { OfficialCard, OfficialProps } from "@/components/modules/OfficialCard";
import { EmptyState } from "@/components/data/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function MemberOfficialsPage() {
  const officials = useQuery(api.officials.listActive);

  const executives =
    officials?.filter((o: OfficialProps) => o.tier === "executive") || [];
  const standardOfficials =
    officials?.filter((o: OfficialProps) => o.tier === "official") || [];
  const subcountyReps =
    officials?.filter((o: OfficialProps) => o.tier === "subcounty") || [];

  return (
    <div>
      <PageHeader
        eyebrow="BRANCH LEADERSHIP"
        title="Branch Officials & Responsibilities"
        lead="Meet the executive leadership and sub-county representatives serving KUPPET Busia. Reach out directly to the official responsible for your welfare portfolio."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Branch Officials" },
        ]}
      />

      {/* Loading State */}
      {officials === undefined && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="p-6 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] space-y-4"
            >
              <Skeleton className="w-16 h-16 rounded-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {officials !== undefined && officials.length === 0 && (
        <EmptyState
          icon={Users}
          title="Officials Directory Updating"
          description="The branch roster is currently being updated for the ongoing constitutional term. Viongozi wataorodheshwa punde."
          actionLabel="Return to Dashboard"
          actionHref="/dashboard"
        />
      )}

      {/* Officials Listed by Tier */}
      {officials !== undefined && officials.length > 0 && (
        <div className="space-y-12">
          {executives.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--brass)]" />
                <h2 className="font-serif text-[22px] font-semibold text-[var(--ink)]">
                  Executive Committee
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {executives.map((official: OfficialProps) => (
                  <OfficialCard key={official._id} official={official} />
                ))}
              </div>
            </section>
          )}

          {standardOfficials.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--union)]" />
                <h2 className="font-serif text-[22px] font-semibold text-[var(--ink)]">
                  Branch Officials
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {standardOfficials.map((official: OfficialProps) => (
                  <OfficialCard key={official._id} official={official} />
                ))}
              </div>
            </section>
          )}

          {subcountyReps.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--brass)]" />
                <h2 className="font-serif text-[22px] font-semibold text-[var(--ink)]">
                  Sub-County Representatives
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {subcountyReps.map((official: OfficialProps) => (
                  <OfficialCard key={official._id} official={official} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

