"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { formatShortDate } from "@/lib/format";
import { FileText, Download } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";

export default function MemberReportsPage() {
  const reports = useQuery(api.financialReports.listActive, {});
  const recordDownloadMutation = useMutation(api.financialReports.recordDownload);

  const handleDownload = async (report: Doc<"financialReports">) => {
    try {
      await recordDownloadMutation({ id: report._id });
      toast.success(`Downloading ${report.title}…`);
      // Simulate stream download
    } catch {
      toast.error("Failed to download report.");
    }
  };

  const columns: Column<Doc<"financialReports">>[] = [
    {
      key: "title",
      header: "Report Title & Period",
      render: (item) => (
        <div>
          <span className="font-semibold text-[var(--ink)] block">
            {item.title}
          </span>
          <span className="text-[12px] text-[var(--brass)] font-medium">
            Period: {item.period}
          </span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
    },
    {
      key: "publishedAt",
      header: "Publish Date",
      render: (item) => formatShortDate(item.publishedAt),
    },
    {
      key: "actions",
      header: "Download",
      className: "text-right w-36",
      render: (item) => (
        <Button size="sm" variant="secondary" onClick={() => handleDownload(item)}>
          <Download className="h-3.5 w-3.5 mr-1" /> PDF Report
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="UNION TRANSPARENCY"
        title="Financial Reports & Statements"
        lead="Download published branch annual accounts, quarterly financial statements, budget allocations, and AGM minutes."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Financial Reports" },
        ]}
      />

      {reports === undefined ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No financial reports published yet"
          description="Branch annual accounts and audit statements will be uploaded here by the Executive Secretariat."
        />
      ) : (
        <DataTable
          columns={columns}
          data={reports}
          keyExtractor={(item) => item._id}
        />
      )}
    </div>
  );
}

