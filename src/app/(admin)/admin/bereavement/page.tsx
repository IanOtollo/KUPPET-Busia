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
import { formatShortDate, formatKES } from "@/lib/format";
import { Download, Filter, ChevronRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { SUB_COUNTIES, BEREAVEMENT_STATUSES, SubCounty, BereavementStatus } from "@/lib/constants";
import { Doc } from "../../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { downloadExcel } from "@/lib/exportExcel";

export default function AdminBereavementPage() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedSubCounty, setSelectedSubCounty] = useState<string>("all");

  const queryStatus = selectedStatus === "all" ? undefined : (selectedStatus as BereavementStatus);
  const querySubCounty = selectedSubCounty === "all" ? undefined : (selectedSubCounty as SubCounty);

  const cases = useQuery(api.bereavement.listAllAdmin, {
    status: queryStatus,
    subCounty: querySubCounty,
  });

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    if (!cases || cases.length === 0) {
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
        ],
        rows: cases.map((c: Doc<"bereavementCases">) => [
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
        ]),
      });
      toast.success("Bereavement Excel file exported successfully.");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<Doc<"bereavementCases">>[] = [
    {
      key: "reference",
      header: "Reference",
      isMono: true,
      className: "w-36",
    },
    {
      key: "memberNameSnapshot",
      header: "Member & TSC",
      render: (item) => (
        <div>
          <span className="font-semibold text-[var(--ink)] block">
            {item.memberNameSnapshot}
          </span>
          <span className="mono-ref text-[12px] text-[var(--ink-muted)]">
            {item.tscSnapshot}
          </span>
        </div>
      ),
    },
    {
      key: "deceasedName",
      header: "Deceased & Relation",
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
      key: "subCounty",
      header: "Sub-County",
    },
    {
      key: "dateOfBereavement",
      header: "Date of Loss",
      render: (item) => formatShortDate(item.dateOfBereavement),
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
          <Link href={`/admin/bereavement/${item._id}`}>
            Manage <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="WELFARE ADMINISTRATION"
        title="Bereavement Claims Queue"
        lead="Review submitted bereavement cases, verify constitutional member relationships, manage approvals, and track benevolent disbursements."
        breadcrumbs={[
          { label: "Admin Operations", href: "/admin" },
          { label: "Bereavement Queue" },
        ]}
        action={
          <Button variant="secondary" size="sm" onClick={handleExportExcel} disabled={exporting}>
            <Download className="h-4 w-4 mr-1.5" /> {exporting ? "Exporting…" : "Export Filtered Excel"}
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-[var(--r-md)] bg-[var(--surface)] border border-[var(--line)] mb-6 shadow-[var(--shadow-hair)]">
        <Filter className="h-4 w-4 text-[var(--ink-muted)]" />
        <span className="text-[13px] font-semibold text-[var(--ink)]">Filter:</span>

        <div className="w-44">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {BEREAVEMENT_STATUSES.map((st) => (
                <SelectItem key={st} value={st} className="capitalize">
                  {st.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <Select value={selectedSubCounty} onValueChange={setSelectedSubCounty}>
            <SelectTrigger>
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

        {(selectedStatus !== "all" || selectedSubCounty !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedStatus("all");
              setSelectedSubCounty("all");
            }}
          >
            Reset Filters
          </Button>
        )}
      </div>

      {/* Loading state */}
      {cases === undefined && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {/* Table */}
      {cases !== undefined && (
        <DataTable
          columns={columns}
          data={cases || []}
          keyExtractor={(item) => item._id}
          emptyMessage="No bereavement cases match the selected filter criteria."
          onRowClick={(item) => router.push(`/admin/bereavement/${item._id}`)}
        />
      )}
    </div>
  );
}

