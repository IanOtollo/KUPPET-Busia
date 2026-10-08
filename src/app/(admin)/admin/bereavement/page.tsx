"use client";

import { useMemo, useState } from "react";
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
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { SUB_COUNTIES } from "@/lib/constants";
import { Doc } from "../../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { downloadExcel } from "@/lib/exportExcel";
import { QUEUE_TABS, QueueTabKey, daysSince, enteredStatusAt, planFor } from "@/lib/bereavementFlow";
import { cn } from "@/lib/utils";

type Case = Doc<"bereavementCases">;

const ACTION_TABS: QueueTabKey[] = ["needs_review", "awaiting_approval", "ready_to_pay"];

export default function AdminBereavementPage() {
  const router = useRouter();
  const [chosenTab, setChosenTab] = useState<QueueTabKey | null>(null);
  const [selectedSubCounty, setSelectedSubCounty] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const allCases = useQuery(api.bereavement.listAllAdmin, {});

  const scoped = useMemo(
    () => (allCases ?? []).filter((c) => selectedSubCounty === "all" || c.subCounty === selectedSubCounty),
    [allCases, selectedSubCounty]
  );

  const counts = useMemo(() => {
    const out = {} as Record<QueueTabKey, number>;
    for (const t of QUEUE_TABS) {
      out[t.key] = t.key === "all" ? scoped.length : scoped.filter((c) => (t.statuses as readonly string[]).includes(c.status)).length;
    }
    return out;
  }, [scoped]);

  // Open on the first stage that has work waiting; fall back to everything.
  const activeTab: QueueTabKey =
    chosenTab ?? (ACTION_TABS.find((k) => counts[k] > 0) ?? "all");

  const visible = useMemo(() => {
    const tab = QUEUE_TABS.find((t) => t.key === activeTab)!;
    const rows = scoped.filter((c) => activeTab === "all" || (tab.statuses as readonly string[]).includes(c.status));
    const waitingFirst = ACTION_TABS.includes(activeTab);
    return [...rows].sort((a, b) =>
      waitingFirst ? enteredStatusAt(a) - enteredStatusAt(b) : b.createdAt - a.createdAt
    );
  }, [scoped, activeTab]);

  const handleExportExcel = async () => {
    if (visible.length === 0) {
      toast.error("No case records available to export.");
      return;
    }
    setExporting(true);
    try {
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
          { header: "Support Amount (KES)", numFmt: "#,##0" },
          { header: "Payment Reference" },
        ],
        rows: visible.map((c: Case) => [
          c.reference,
          c.memberNameSnapshot,
          c.tscSnapshot,
          c.school,
          c.subCounty,
          c.deceasedName,
          c.relationship,
          c.dateOfBereavement,
          c.status,
          c.supportAmount || 0,
          c.paymentReference ?? "",
        ]),
      });
      toast.success("Bereavement Excel file exported successfully.");
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
        const waiting = planFor(item.status).primary ? daysSince(enteredStatusAt(item)) : null;
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
                {waiting === 0 ? "Today" : `Waiting ${waiting} day${waiting === 1 ? "" : "s"}`}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-44",
      render: (item) => {
        const primary = planFor(item.status).primary;
        return (
          <Button variant={primary ? "primary" : "ghost"} size="sm" asChild>
            <Link href={`/admin/bereavement/${item._id}`} onClick={(e) => e.stopPropagation()}>
              {primary ? primary.label : "View"} <ChevronRight className="h-3.5 w-3.5 ml-1" />
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
        lead="Work through claims stage by stage. The oldest claim in each stage is listed first."
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
            const urgent = ACTION_TABS.includes(t.key) && counts[t.key] > 0;
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
                  {allCases === undefined ? "–" : counts[t.key]}
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

      {allCases === undefined && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {allCases !== undefined && (
        <DataTable
          columns={columns}
          data={visible}
          keyExtractor={(item) => item._id}
          emptyMessage={
            ACTION_TABS.includes(activeTab)
              ? "Nothing waiting at this stage. You're all caught up."
              : "No bereavement cases here."
          }
          onRowClick={(item) => router.push(`/admin/bereavement/${item._id}`)}
        />
      )}
    </div>
  );
}
