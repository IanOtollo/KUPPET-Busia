"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatShortDate } from "@/lib/format";
import { Download, ChevronRight, Clock } from "lucide-react";
import { useQuery, usePaginatedQuery, useConvex } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { SUB_COUNTIES } from "@/lib/constants";
import { Doc } from "../../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { downloadExcel } from "@/lib/exportExcel";
import { QUEUE_TABS, QueueTabKey, daysSince, isOpen } from "@/lib/bereavementFlow";
import type { SubCounty } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Case = Doc<"bereavementCases">;


export default function AdminBereavementPage() {
  const router = useRouter();
  const [chosenTab, setChosenTab] = useState<QueueTabKey | null>(null);
  const [selectedSubCounty, setSelectedSubCounty] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const convex = useConvex();
  const activeTab: QueueTabKey = chosenTab ?? "pending";
  const subCounty = selectedSubCounty === "all" ? undefined : (selectedSubCounty as SubCounty);

  // Rows load a page at a time, straight from an index, so this stays fast with thousands of claims.
  const {
    results: visible,
    status: pageStatus,
    loadMore,
  } = usePaginatedQuery(api.bereavement.listQueue, { tab: activeTab, subCounty }, { initialNumItems: 25 });
  const loading = pageStatus === "LoadingFirstPage";

  // Exact branch-wide totals. They ignore the sub-county filter, so hide them while it is on.
  const totals = useQuery(api.bereavement.queueCounts, {});
  const showCounts = !subCounty;

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const rows: Case[] = [];
      let cursor: string | null = null;
      for (;;) {
        const res: { page: Case[]; isDone: boolean; continueCursor: string } = await convex.query(
          api.bereavement.listQueue,
          { tab: activeTab, subCounty, paginationOpts: { numItems: 500, cursor } }
        );
        rows.push(...res.page);
        if (res.isDone) break;
        cursor = res.continueCursor;
      }
      if (rows.length === 0) {
        toast.error("No case records available to export.");
        return;
      }
      await downloadExcel({
        fileName: `KUPPET_Busia_Bereavement_${new Date().toISOString().split("T")[0]}.xlsx`,
        sheetName: "Bereavement",
        columns: [
          { header: "Reference" },
          { header: "Member Name" },
          { header: "TSC Number", text: true },
          { header: "School" },
          { header: "Sub-County" },
          { header: "Deceased Name" },
          { header: "Relationship" },
          { header: "Date of Loss" },
          { header: "Status" },
        ],
        rows: rows.map((c) => [
          c.reference,
          c.memberNameSnapshot,
          c.tscSnapshot,
          c.school,
          c.subCounty,
          c.deceasedName,
          c.relationship,
          c.dateOfBereavement,
          c.status,
        ]),
      });
      toast.success(`Exported ${rows.length} claim${rows.length === 1 ? "" : "s"} to Excel.`);
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<Case>[] = [
    { key: "reference", header: "Reference", isMono: true, className: "w-36" },
    {
      key: "memberNameSnapshot",
      header: "Member & TSC",
      render: (item) => (
        <div>
          <span className="font-semibold text-[var(--ink)] block">{item.memberNameSnapshot}</span>
          <span className="mono-ref text-[13.5px] text-[var(--ink-muted)]">{item.tscSnapshot}</span>
        </div>
      ),
    },
    {
      key: "deceasedName",
      header: "Deceased & Relation",
      render: (item) => (
        <div>
          <span className="font-medium text-[var(--ink)] block">{item.deceasedName}</span>
          <span className="text-[13.5px] uppercase tracking-wider text-[var(--brass)] font-semibold">
            {item.relationship}
          </span>
        </div>
      ),
    },
    { key: "subCounty", header: "Sub-County" },
    {
      key: "dateOfBereavement",
      header: "Date of Loss",
      render: (item) => formatShortDate(item.dateOfBereavement),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => {
        const waiting = isOpen(item.status) ? daysSince(item.createdAt) : null;
        return (
          <div className="space-y-1">
            <StatusBadge status={item.status} />
            {waiting !== null && (
              <span
                className={cn(
                  "flex items-center gap-1 text-[13px]",
                  waiting >= 7
                    ? "text-[var(--danger)] font-semibold"
                    : waiting >= 3
                      ? "text-[var(--brass)] font-semibold"
                      : "text-[var(--ink-muted)]"
                )}
              >
                <Clock className="h-3 w-3" />
                {waiting === 0 ? "Submitted today" : `Submitted ${waiting} day${waiting === 1 ? "" : "s"} ago`}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-32",
      render: (item) => {
        const open = isOpen(item.status);
        return (
          <Button variant={open ? "primary" : "ghost"} size="sm" asChild>
            <Link href={`/admin/bereavement/${item._id}`} onClick={(e) => e.stopPropagation()}>
              {open ? "Review" : "View"} <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="WELFARE ADMINISTRATION"
        title="Bereavement Claims"
        lead="Review each claim and approve or decline it. The longest-waiting claim is listed first."
        breadcrumbs={[
          { label: "Admin Operations", href: "/admin" },
          { label: "Bereavement Queue" },
        ]}
        action={
          <Button variant="secondary" size="sm" onClick={handleExportExcel} disabled={exporting}>
            <Download className="h-4 w-4 mr-1.5" /> {exporting ? "Exporting…" : "Export this list"}
          </Button>
        }
      />

      {/* Stage tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div role="tablist" aria-label="Claim stage" className="flex flex-wrap gap-2">
          {QUEUE_TABS.map((t) => {
            const selected = t.key === activeTab;
            const urgent = t.key === "pending" && showCounts && (totals?.pending ?? 0) > 0;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={selected}
                onClick={() => setChosenTab(t.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 min-h-[44px] text-[15px] font-semibold transition-colors",
                  selected
                    ? "bg-[var(--union)] text-white border-[var(--union)]"
                    : "bg-[var(--surface)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--canvas)]"
                )}
              >
                {t.label}
                <span
                  className={cn(
                    "min-w-[24px] rounded-full px-1.5 text-[13px] text-center",
                    selected
                      ? "bg-white/20 text-white"
                      : urgent
                        ? "bg-[var(--brass)] text-white"
                        : "bg-[var(--surface-sunk)] text-[var(--ink-muted)]"
                  )}
                >
                  {showCounts && totals ? (t.key === "all" ? totals.all : totals[t.key]) : "·"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="w-48">
          <Select value={selectedSubCounty} onValueChange={setSelectedSubCounty}>
            <SelectTrigger aria-label="Filter by sub-county">
              <SelectValue placeholder="All Sub-Counties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sub-Counties</SelectItem>
              {SUB_COUNTIES.map((sc) => (
                <SelectItem key={sc} value={sc}>
                  {sc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {!loading && (
        <>
          <DataTable
            columns={columns}
            data={visible}
            keyExtractor={(item) => item._id}
            emptyMessage={
              activeTab === "pending" ? "No claims waiting. You're all caught up." : "No bereavement cases here."
            }
            onRowClick={(item) => router.push(`/admin/bereavement/${item._id}`)}
          />
          {pageStatus === "CanLoadMore" && (
            <div className="mt-4 text-center">
              <Button variant="secondary" onClick={() => loadMore(25)}>
                Show more
              </Button>
            </div>
          )}
          {pageStatus === "LoadingMore" && (
            <p className="mt-4 text-center text-[14.5px] text-[var(--ink-muted)]">Loading…</p>
          )}
        </>
      )}
    </div>
  );
}
