"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatDateTime } from "@/lib/format";
import { ArrowLeft, Lock, ShieldAlert, CheckCircle, FileText, AlertCircle } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { HARASSMENT_STATUSES, HarassmentStatus } from "@/lib/constants";
import { toast } from "sonner";

export default function AdminHarassmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const reportId = resolvedParams.id as Id<"harassmentReports">;

  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAndAuditReport = useMutation(api.harassment.getByIdAdmin);
  const updateStatusMutation = useMutation(api.harassment.updateStatus);

  const [newStatus, setNewStatus] = useState<string>("");
  const [statusReason, setStatusReason] = useState<string>("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Trigger audit-on-view query mutation on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchAndAuditReport({ id: reportId })
      .then((res) => {
        if (isMounted) {
          setReport(res);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setLoadError(err.message || "Failed to load report or access unauthorized.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reportId]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus || newStatus === report.status) {
      toast.error("Select a valid new status.");
      return;
    }

    if (newStatus === "closed_no_action" && statusReason.trim().length < 20) {
      toast.error("Closing a report with no action requires a reason of at least 20 characters.");
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await updateStatusMutation({
        id: reportId,
        newStatus: newStatus as HarassmentStatus,
        statusReason: statusReason.trim() || undefined,
      });

      toast.success(`Report status updated to ${newStatus.replace(/_/g, " ")}`);
      setReport({ ...report, status: newStatus, statusReason });
      setNewStatus("");
      setStatusReason("");
    } catch (err: unknown) {
      const error = err as { message?: string; data?: { message?: string } };
      toast.error(error.data?.message || error.message || "Failed to update status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (loadError || !report) {
    return (
      <div className="p-8 text-center bg-[var(--surface)] border border-[var(--line)] rounded-[var(--r-lg)]">
        <p className="text-[15px] text-[var(--danger)] mb-4">{loadError || "Report not found."}</p>
        <Button asChild>
          <Link href="/admin/harassment">Back to Reports Queue</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[880px] mx-auto">
      <PageHeader
        eyebrow="CONFIDENTIAL FILE"
        title={`Report ${report.reference}`}
        lead={`Category: ${report.category} • School: ${report.school} (${report.subCounty})`}
        breadcrumbs={[
          { label: "Admin Operations", href: "/admin" },
          { label: "Harassment Reports", href: "/admin/harassment" },
          { label: report.reference },
        ]}
        action={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/admin/harassment">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Queue
            </Link>
          </Button>
        }
      />

      {/* Audit Logged Banner */}
      <div className="p-3.5 rounded-[var(--r-md)] bg-[var(--brass-soft)] border border-[var(--brass)]/30 mb-6 flex items-center justify-between text-[13px]">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-[var(--brass)]" />
          <span>
            This file access has been logged in the system audit trail (<code>harassment.view</code>).
          </span>
        </div>
        <span className="mono-ref text-[12px] font-semibold text-[var(--ink)]">
          {report.reference}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Narrative */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Incident Investigation Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14.5px]">
                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Anonymity Status
                  </dt>
                  <dd className="font-semibold text-[var(--ink)] mt-0.5">
                    {report.isAnonymous ? "Anonymous Report" : "Named Reporter"}
                  </dd>
                </div>

                {!report.isAnonymous && (
                  <>
                    <div>
                      <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                        Reporter Name
                      </dt>
                      <dd className="font-medium mt-0.5">{report.reporterName || "Not provided"}</dd>
                    </div>

                    <div>
                      <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                        Reporter Contact
                      </dt>
                      <dd className="font-medium mt-0.5">{report.reporterContact || "Not provided"}</dd>
                    </div>
                  </>
                )}

                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Involved Person Role
                  </dt>
                  <dd className="font-medium mt-0.5">{report.involvedRole}</dd>
                </div>

                {report.involvedName && (
                  <div>
                    <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                      Name of Person Involved
                    </dt>
                    <dd className="font-medium mt-0.5">{report.involvedName}</dd>
                  </div>
                )}

                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Date of Occurrence
                  </dt>
                  <dd className="mt-0.5">{formatDate(report.occurredAt)}</dd>
                </div>

                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Is Ongoing?
                  </dt>
                  <dd className="mt-0.5 font-medium">{report.isOngoing ? "Yes (Ongoing)" : "No"}</dd>
                </div>

                <div className="sm:col-span-2 pt-3 border-t border-[var(--line)]">
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] mb-1">
                    Requested Support Actions
                  </dt>
                  <dd className="flex flex-wrap gap-2 mt-1">
                    {report.supportNeeded.map((sup: string) => (
                      <span
                        key={sup}
                        className="px-2.5 py-1 rounded-[var(--r-full)] bg-[var(--union-soft)] text-[var(--union)] text-[12.5px] font-semibold"
                      >
                        {sup}
                      </span>
                    ))}
                  </dd>
                </div>

                <div className="sm:col-span-2 pt-3 border-t border-[var(--line)]">
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] mb-2">
                    Full Incident Narrative Statement
                  </dt>
                  <dd className="text-[14px] leading-relaxed text-[var(--ink-body)] bg-[var(--canvas)] p-4 rounded-[var(--r-md)] border border-[var(--line)] whitespace-pre-line font-serif">
                    {report.narrative}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Action & Status Panel */}
        <div className="space-y-6">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Case Adjudication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] block mb-1">
                  Current Status
                </span>
                <StatusBadge status={report.status} />
              </div>

              {report.statusReason && (
                <div className="p-3 bg-[var(--surface-sunk)] border border-[var(--line)] rounded-[var(--r-md)] text-[13px]">
                  <strong>Remarks:</strong> {report.statusReason}
                </div>
              )}

              <form onSubmit={handleUpdateStatus} className="space-y-4 pt-4 border-t border-[var(--line)]">
                <div>
                  <Label htmlFor="status">Transition Status</Label>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select new status" />
                    </SelectTrigger>
                    <SelectContent>
                      {HARASSMENT_STATUSES.map((st) => (
                        <SelectItem key={st} value={st} className="capitalize">
                          {st.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="reason" optional>
                    Officer Action Remarks / Decision Reason
                  </Label>
                  <Textarea
                    id="reason"
                    rows={3}
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder={
                      newStatus === "closed_no_action"
                        ? "Mandatory: minimum 20 characters explaining why closed with no action…"
                        : "Optional remark recorded in file audit…"
                    }
                  />
                  {newStatus === "closed_no_action" && (
                    <p className="text-[11.5px] text-[var(--danger)] mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Closing with no action requires a reason (min 20 chars).
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  loading={isUpdatingStatus}
                  loadingText="Updating Status…"
                  disabled={!newStatus || newStatus === report.status}
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" /> Apply Status Mutation
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
