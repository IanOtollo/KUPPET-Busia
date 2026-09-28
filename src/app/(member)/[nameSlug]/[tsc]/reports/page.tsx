"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { formatShortDate } from "@/lib/format";
import { FileText, Download } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Doc } from "../../../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useMemberBasePath } from "@/lib/memberPath";

type ReportWithUrl = Doc<"financialReports"> & { fileUrl: string | null };

export default function MemberReportsPage() {
  const basePath = useMemberBasePath();
  const reports = useQuery(api.financialReports.listActive, {});
  const recordDownloadMutation = useMutation(api.financialReports.recordDownload);

  const handleDownload = async (report: ReportWithUrl) => {
    if (!report.fileUrl) {
      toast.error("This report's file is unavailable. Contact the branch secretariat.");
      return;
    }
    try {
      await recordDownloadMutation({ id: report._id });
      window.open(report.fileUrl, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Failed to download report.");
    }
  };

  const columns: Column<ReportWithUrl>[] = [
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
          { label: "Dashboard", href: `${basePath}/dashboard` },
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

