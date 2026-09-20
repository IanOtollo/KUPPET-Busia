"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatShortDate } from "@/lib/format";
import { ArrowLeft, Shield, Lock } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

export default function HarassmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const refCode = resolvedParams.id;

  const report = useQuery(api.harassment.getByReference, { reference: refCode });

  if (report === undefined) {
    return (
      <div className="max-w-[700px] mx-auto space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 text-center bg-[var(--surface)] border border-[var(--line)] rounded-[var(--r-lg)]">
        <p className="text-[15px] text-[var(--ink-muted)] mb-4">
          Report not found for reference code <code>{refCode}</code>.
        </p>
        <Button asChild>
          <Link href="/harassment">Back to Safe Reporting</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[720px] mx-auto">
      <PageHeader
        eyebrow="REPORT TRACKING"
        title={`Reference: ${report.reference}`}
        lead={`Category: ${report.category} • Sub-County: ${report.subCounty}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Harassment Protection", href: "/harassment" },
          { label: report.reference },
        ]}
        action={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/harassment">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Protection
            </Link>
          </Button>
        }
      />

      <Card className="mb-6">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-4">
            <div>
              <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] block">
                Investigation Status
              </span>
              <StatusBadge status={report.status} className="mt-1" />
            </div>
            <div className="text-right">
              <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] block">
                Filed Date
              </span>
              <span className="text-[14px] font-medium text-[var(--ink)]">
                {formatShortDate(report.createdAt)}
              </span>
            </div>
          </div>

          <div className="space-y-3 text-[14.5px]">
            <div>
              <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] block">
                Category
              </span>
              <span className="font-semibold text-[var(--ink)]">{report.category}</span>
            </div>

            <div>
              <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] block">
                Incident Date
              </span>
              <span>{formatShortDate(report.occurredAt)}</span>
            </div>

            {report.statusReason && (
              <div className="p-3 bg-[var(--surface-sunk)] border border-[var(--line)] rounded-[var(--r-md)] text-[13.5px]">
                <strong>Officer Remark:</strong> {report.statusReason}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
