"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/data/StatusBadge";
import { EmptyState } from "@/components/data/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { formatShortDate } from "@/lib/format";
import { HeartHandshake, Plus, Info, ChevronRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";

export default function BereavementListPage() {
  const cases = useQuery(api.bereavement.listMine);

  const columns: Column<Doc<"bereavementCases">>[] = [
    {
      key: "reference",
      header: "Reference",
      isMono: true,
      className: "w-36",
    },
    {
      key: "deceasedName",
      header: "Deceased & Relationship",
      render: (item) => (
        <div>
          <span className="font-medium text-[var(--ink)] block">
            {item.deceasedName}
          </span>
          <span className="text-[12px] uppercase tracking-wider text-[var(--brass)] font-semibold">
            {item.relationship}
          </span>
        </div>
      ),
    },
    {
      key: "dateOfBereavement",
      header: "Date of Loss",
      render: (item) => formatShortDate(item.dateOfBereavement),
    },
    {
      key: "subCounty",
      header: "Sub-County",
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-24",
      render: (item) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/bereavement/${item._id}`}>
            View <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="MEMBER WELFARE"
        title="Bereavement Welfare Claims"
        lead="File institutional welfare claims and monitor verification, approval, and disbursement by the branch office."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bereavement" },
        ]}
        action={
          <Button asChild>
            <Link href="/bereavement/new">
              <Plus className="h-4 w-4 mr-1.5" /> Report a Bereavement
            </Link>
          </Button>
        }
      />

      {/* Policy Helper Banner */}
      <div className="p-4 rounded-[var(--r-md)] bg-[var(--info-soft)] border border-[var(--info)]/20 mb-6 flex items-start gap-3">
        <Info className="h-5 w-5 text-[var(--info)] shrink-0 mt-0.5" />
        <div className="text-[13.5px] leading-relaxed text-[var(--ink-body)]">
          <p className="font-semibold text-[var(--ink)]">
            Branch Welfare Policy (Sera ya Ustawi wa Tawi):
          </p>
          <p className="text-[var(--ink-muted)] mt-0.5">
            The branch recognises bereavement support for a member's <strong>mother, father, spouse, or child only</strong>. / Tawi hutoa msaada wa msiba kwa mama, baba, mke/mume, au mtoto wa mwanachama pekee.
          </p>
        </div>
      </div>

      {/* Loading state */}
      {cases === undefined && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {cases !== undefined && cases.length === 0 && (
        <EmptyState
          icon={HeartHandshake}
          title="No bereavement cases reported"
          description="Ukipatwa na msiba, wasilisha taarifa hapa ili tawi liweze kusaidia kulingana na kanuni za ustawi wa walimu."
          actionLabel="Report a Bereavement Case"
          actionHref="/bereavement/new"
        />
      )}

      {/* Cases List */}
      {cases !== undefined && cases.length > 0 && (
        <DataTable
          columns={columns}
          data={cases}
          keyExtractor={(item) => item._id}
        />
      )}
    </div>
  );
}

