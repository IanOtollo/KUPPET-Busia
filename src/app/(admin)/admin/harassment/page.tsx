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
import { ShieldAlert, Lock, Filter, ChevronRight, Eye } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { HARASSMENT_CATEGORIES, HARASSMENT_STATUSES, HarassmentCategory, HarassmentStatus } from "@/lib/constants";
import { toast } from "sonner";

export default function AdminHarassmentPage() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const queryStatus = selectedStatus === "all" ? undefined : (selectedStatus as HarassmentStatus);
  const queryCategory = selectedCategory === "all" ? undefined : (selectedCategory as HarassmentCategory);

  // Note: listAllAdmin returns sanitized summary objects ONLY (no narrative, no reporter name in list!)
  const reports = useQuery(api.harassment.listAllAdmin, {
    status: queryStatus,
    category: queryCategory,
  });

  const columns: Column<any>[] = [
    {
      key: "reference",
      header: "Reference",
      isMono: true,
      className: "w-36",
    },
    {
      key: "isAnonymous",
      header: "Anonymity",
      render: (item) =>
        item.isAnonymous ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--brass)] px-2 py-0.5 rounded bg-[var(--brass-soft)]">
            <Lock className="h-3 w-3" /> Anonymous
          </span>
        ) : (
          <span className="text-[12px] text-[var(--ink-muted)]">Named Report</span>
        ),
    },
    {
      key: "category",
      header: "Category & School",
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
      key: "involvedRole",
      header: "Involved Role",
      render: (item) => (
        <span className="text-[13px] text-[var(--ink-body)]">{item.involvedRole}</span>
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
      className: "text-right w-28",
      render: (item) => (
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/admin/harassment/${item._id}`}>
            <Eye className="h-3.5 w-3.5 mr-1" /> Open File
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="CONFIDENTIAL GRIEVANCES"
        title="Harassment Safe Reports Queue"
        lead="RESTRICTED ACCESS — Handled strictly by authorized grievance officers. List view redacts reporter names and narrative texts under §15 privacy regulations."
        breadcrumbs={[
          { label: "Admin Operations", href: "/admin" },
          { label: "Harassment Reports" },
        ]}
      />

      {/* Security & Audit Notice */}
      <div className="p-4 rounded-[var(--r-md)] bg-[var(--brass-soft)] border border-[var(--brass)]/30 mb-6 flex items-start gap-3">
        <Lock className="h-5 w-5 text-[var(--brass)] shrink-0 mt-0.5" />
        <div className="text-[13.5px] leading-relaxed text-[var(--ink-body)]">
          <strong className="font-semibold text-[var(--ink)]">
            Mandatory Audit-on-View Enforcement:
          </strong>{" "}
          Opening any individual harassment report file automatically logs a immutable audit entry (<code>harassment.view</code>) recording your identity and timestamp.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-[var(--r-md)] bg-[var(--surface)] border border-[var(--line)] mb-6 shadow-[var(--shadow-hair)]">
        <Filter className="h-4 w-4 text-[var(--ink-muted)]" />
        <span className="text-[13px] font-semibold text-[var(--ink)]">Filter:</span>

        <div className="w-48">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger>
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {HARASSMENT_STATUSES.map((st) => (
                <SelectItem key={st} value={st} className="capitalize">
                  {st.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-64">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {HARASSMENT_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading state */}
      {reports === undefined && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {/* Table */}
      {reports !== undefined && (
        <DataTable
          columns={columns}
          data={reports || []}
          keyExtractor={(item) => item._id}
          emptyMessage="No harassment reports match the selected criteria."
          onRowClick={(item) => router.push(`/admin/harassment/${item._id}`)}
        />
      )}
    </div>
  );
}

