"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/data/StatusBadge";
import { EmptyState } from "@/components/data/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { formatShortDate } from "@/lib/format";
import { Shield, Plus, Lock, Search, ChevronRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";

export default function HarassmentListPage() {
  const reports = useQuery(api.harassment.listMine);
  const [lookupRef, setLookupRef] = useState("");
  const [searchedRef, setSearchedRef] = useState<string | null>(null);

  const trackingResult = useQuery(
    api.harassment.getByReference,
    searchedRef ? { reference: searchedRef } : "skip"
  );

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupRef.trim()) return;
    setSearchedRef(lookupRef.trim().toUpperCase());
  };

  const columns: Column<any>[] = [
    {
      key: "reference",
      header: "Reference",
      isMono: true,
      className: "w-36",
    },
    {
      key: "category",
      header: "Category & Institution",
      render: (item) => (
        <div>
          <span className="font-semibold text-[var(--ink)] block">
            {item.category}
          </span>
          <span className="text-[12px] text-[var(--ink-muted)]">
            {item.school} • {item.subCounty}
          </span>
        </div>
      ),
    },
    {
      key: "occurredAt",
      header: "Incident Date",
      render: (item) => formatShortDate(item.occurredAt),
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
          <Link href={`/harassment/${item.reference}`}>
            Track <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="SAFE REPORTING"
        title="Harassment & Workplace Protection"
        lead="Confidential reporting portal for intimidation, sexual harassment, or unfair victimisation. Handled exclusively by designated branch grievance officers."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Harassment Protection" },
        ]}
        action={
          <Button asChild>
            <Link href="/harassment/new">
              <Plus className="h-4 w-4 mr-1.5" /> File Confidential Report
            </Link>
          </Button>
        }
      />

      {/* Confidentiality Commitment Banner */}
      <div className="p-4 rounded-[var(--r-md)] bg-[var(--brass-soft)] border border-[var(--brass)]/30 mb-8 flex items-start gap-3.5">
        <Lock className="h-5 w-5 text-[var(--brass)] shrink-0 mt-0.5" />
        <div className="text-[14px] leading-relaxed text-[var(--ink-body)]">
          <strong className="font-semibold text-[var(--ink)]">Strict Confidentiality Guarantee:</strong>{" "}
          Your safety is protected under Section 15 of branch governance. You may submit reports anonymously. Anonymous cases can be tracked anytime using your unique reference code below.
        </div>
      </div>

      {/* Anonymous Reference Lookup Box */}
      <div className="p-5 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] mb-8 shadow-[var(--shadow-hair)]">
        <h3 className="font-serif text-[17px] font-semibold text-[var(--ink)] mb-2">
          Track Anonymous Report by Reference Code
        </h3>
        <p className="text-[13.5px] text-[var(--ink-muted)] mb-4">
          If you submitted an anonymous report, enter your reference code (e.g. <code>HAR-2026-0012</code>) to check the investigation status.
        </p>

        <form onSubmit={handleLookup} className="flex gap-3 max-w-[500px]">
          <Input
            placeholder="HAR-YYYY-NNNN"
            value={lookupRef}
            onChange={(e) => setLookupRef(e.target.value)}
            className="mono-ref"
          />
          <Button type="submit">
            <Search className="h-4 w-4 mr-1.5" /> Track Status
          </Button>
        </form>

        {trackingResult && (
          <div className="mt-4 p-4 rounded-[var(--r-md)] bg-[var(--surface-sunk)] border border-[var(--line)] text-[14px] space-y-2">
            <div className="flex items-center justify-between">
              <span className="mono-ref font-bold text-[var(--union)]">{trackingResult.reference}</span>
              <StatusBadge status={trackingResult.status} />
            </div>
            <div><strong>Category:</strong> {trackingResult.category}</div>
            <div><strong>Sub-County:</strong> {trackingResult.subCounty}</div>
            <div><strong>Incident Date:</strong> {formatShortDate(trackingResult.occurredAt)}</div>
            {trackingResult.statusReason && (
              <div className="pt-2 border-t border-[var(--line)] text-[13px] text-[var(--ink-muted)]">
                <strong>Officer Remark:</strong> {trackingResult.statusReason}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading state */}
      {reports === undefined && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {reports !== undefined && reports.length === 0 && (
        <EmptyState
          icon={Shield}
          title="No named harassment reports filed"
          description="Hapa ana report ka anaharasiwa kwa shule yenye anafunza. Repoti zako unazowasilisha ziko salama na zinalindwa."
          actionLabel="File Confidential Report"
          actionHref="/harassment/new"
        />
      )}

      {/* Reports Table */}
      {reports !== undefined && reports.length > 0 && (
        <DataTable
          columns={columns}
          data={reports}
          keyExtractor={(item) => item._id}
        />
      )}
    </div>
  );
}

