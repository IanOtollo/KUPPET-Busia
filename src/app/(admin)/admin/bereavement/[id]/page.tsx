"use client";

import { useState, use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatShortDate, formatDateTime, formatKES } from "@/lib/format";
import { ArrowLeft, Send, CheckCircle, ShieldAlert, MessageSquare, AlertCircle } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { BEREAVEMENT_STATUSES, BereavementStatus } from "@/lib/constants";
import { toast } from "sonner";

export default function AdminBereavementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const caseId = resolvedParams.id as Id<"bereavementCases">;

  const caseDoc = useQuery(api.bereavement.getById, { id: caseId });
  const updateStatusMutation = useMutation(api.bereavement.updateStatus);
  const addNoteMutation = useMutation(api.bereavement.addInternalNote);

  const [newStatus, setNewStatus] = useState<string>("");
  const [statusReason, setStatusReason] = useState<string>("");
  const [supportAmount, setSupportAmount] = useState<string>("");
  const [internalNoteText, setInternalNoteText] = useState<string>("");

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddingNote, setIsAddingNote] = useState(false);

  if (caseDoc === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!caseDoc) {
    return (
      <div className="p-8 text-center bg-[var(--surface)] border border-[var(--line)] rounded-[var(--r-lg)]">
        <p className="text-[15px] text-[var(--ink-muted)] mb-4">Case not found.</p>
        <Button asChild>
          <Link href="/admin/bereavement">Back to Queue</Link>
        </Button>
      </div>
    );
  }

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus || newStatus === caseDoc.status) {
      toast.error("Please select a new valid status.");
      return;
    }

    if (newStatus === "declined" && statusReason.trim().length < 20) {
      toast.error("Declining a case requires an explanation of at least 20 characters.");
      return;
    }

    setIsUpdatingStatus(true);
    try {
      await updateStatusMutation({
        id: caseId,
        newStatus: newStatus as BereavementStatus,
        statusReason: statusReason.trim() || undefined,
        supportAmount: supportAmount ? parseFloat(supportAmount) : undefined,
      });

      toast.success(`Case status updated to ${newStatus.replace(/_/g, " ")}`);
      setStatusReason("");
      setNewStatus("");
    } catch (err: unknown) {
      const error = err as { message?: string; data?: { message?: string } };
      toast.error(error.data?.message || error.message || "Failed to update case status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNoteText.trim()) return;

    setIsAddingNote(true);
    try {
      await addNoteMutation({
        id: caseId,
        note: internalNoteText.trim(),
      });
      toast.success("Internal note added to case file.");
      setInternalNoteText("");
    } catch {
      toast.error("Failed to add note.");
    } finally {
      setIsAddingNote(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="WELFARE CASE REVIEW"
        title={`Review: ${caseDoc.deceasedName} (${caseDoc.reference})`}
        lead={`Member: ${caseDoc.memberNameSnapshot} • TSC: ${caseDoc.tscSnapshot} • Sub-County: ${caseDoc.subCounty}`}
        breadcrumbs={[
          { label: "Admin Operations", href: "/admin" },
          { label: "Bereavement Queue", href: "/admin/bereavement" },
          { label: caseDoc.reference },
        ]}
        action={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/admin/bereavement">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Queue
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Submitted Facts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deceased & Claim Facts */}
          <Card>
            <CardHeader>
              <CardTitle>Bereavement Claim Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-[14.5px]">
                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Deceased Full Name
                  </dt>
                  <dd className="font-semibold text-[var(--ink)] mt-0.5">
                    {caseDoc.deceasedName}
                  </dd>
                </div>

                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Union Recognised Relationship
                  </dt>
                  <dd className="font-bold text-[var(--brass)] uppercase mt-0.5">
                    {caseDoc.relationship}
                  </dd>
                </div>

                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Date of Bereavement
                  </dt>
                  <dd className="mt-0.5">{formatDate(caseDoc.dateOfBereavement)}</dd>
                </div>

                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Burial / Service Date
                  </dt>
                  <dd className="mt-0.5">
                    {caseDoc.burialDate ? formatDate(caseDoc.burialDate) : "Not specified"}
                  </dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Place of Burial / Funeral Home
                  </dt>
                  <dd className="mt-0.5">{caseDoc.burialPlace || "Not specified"}</dd>
                </div>

                {caseDoc.details && (
                  <div className="sm:col-span-2 pt-2 border-t border-[var(--line)]">
                    <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] mb-1">
                      Member's Additional Narrative
                    </dt>
                    <dd className="text-[14px] leading-relaxed text-[var(--ink-body)] whitespace-pre-line bg-[var(--canvas)] p-3 rounded-[var(--r-md)] border border-[var(--line)]">
                      {caseDoc.details}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Member Profile Snapshot */}
          <Card>
            <CardHeader>
              <CardTitle>Member Profile Snapshot</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14px]">
                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Member Full Name
                  </dt>
                  <dd className="font-medium text-[var(--ink)] mt-0.5">
                    {caseDoc.memberNameSnapshot}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    TSC Number
                  </dt>
                  <dd className="mono-ref font-medium text-[var(--ink)] mt-0.5">
                    {caseDoc.tscSnapshot}
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    School / Station
                  </dt>
                  <dd className="mt-0.5">{caseDoc.school}</dd>
                </div>
                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Sub-County
                  </dt>
                  <dd className="mt-0.5">{caseDoc.subCounty}</dd>
                </div>
                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Contact Phone
                  </dt>
                  <dd className="mt-0.5 font-medium">
                    <a href={`tel:${caseDoc.phone}`} className="text-[var(--union)]">
                      {caseDoc.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Submitted Date
                  </dt>
                  <dd className="mt-0.5">{formatDateTime(caseDoc.createdAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Internal Notes Thread (Admin-only) */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[var(--union)]" />
                <CardTitle>Internal Administrative Notes (Confidential)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[12.5px] text-[var(--ink-muted)]">
                Internal notes are strictly confidential to branch officials and are never visible to the teacher.
              </p>

              {/* Existing Notes */}
              {caseDoc.internalNotes && caseDoc.internalNotes.length > 0 ? (
                <div className="space-y-3">
                  {caseDoc.internalNotes.map(
                    (
                      note: {
                        authorId: string;
                        authorName: string;
                        note: string;
                        createdAt: number;
                      },
                      idx: number
                    ) => (
                    <div
                      key={idx}
                      className="p-3 rounded-[var(--r-md)] bg-[var(--surface-sunk)] border border-[var(--line)] text-[13.5px]"
                    >
                      <div className="flex items-center justify-between text-[11.5px] text-[var(--ink-muted)] mb-1">
                        <span className="font-semibold text-[var(--ink)]">
                          {note.authorName}
                        </span>
                        <span>{formatDateTime(note.createdAt)}</span>
                      </div>
                      <p className="text-[var(--ink-body)]">{note.note}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[13px] text-[var(--ink-muted)] italic">
                  No internal notes recorded on this file yet.
                </p>
              )}

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-[var(--line)]">
                <Textarea
                  value={internalNoteText}
                  onChange={(e) => setInternalNoteText(e.target.value)}
                  placeholder="Record an administrative observation or committee recommendation…"
                  rows={2}
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="secondary"
                  loading={isAddingNote}
                  loadingText="Adding…"
                  disabled={!internalNoteText.trim()}
                >
                  <Send className="h-3.5 w-3.5 mr-1" /> Add Confidential Note
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Sticky Action & Status Panel */}
        <div className="space-y-6">
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle>Case Status & Adjudication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] block mb-1">
                  Current Status
                </span>
                <StatusBadge status={caseDoc.status} />
              </div>

              {caseDoc.supportAmount && (
                <div className="p-3 bg-[var(--success-soft)] border border-[var(--success)] rounded-[var(--r-md)]">
                  <span className="text-[11.5px] uppercase font-semibold text-[var(--success)] block">
                    Approved Welfare Amount
                  </span>
                  <span className="mono-ref text-[18px] font-bold text-[var(--success)]">
                    {formatKES(caseDoc.supportAmount)}
                  </span>
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
                      {BEREAVEMENT_STATUSES.map((st) => (
                        <SelectItem key={st} value={st} className="capitalize">
                          {st.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="amount" optional>Approved Relief Amount (KES)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="e.g. 20000"
                    value={supportAmount}
                    onChange={(e) => setSupportAmount(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="reason" optional>
                    Status Reason / Member Remark
                  </Label>
                  <Textarea
                    id="reason"
                    rows={3}
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder={
                      newStatus === "declined"
                        ? "Mandatory: minimum 20 characters explaining decline…"
                        : "Optional note sent to member in notification…"
                    }
                  />
                  {newStatus === "declined" && (
                    <p className="text-[11.5px] text-[var(--danger)] mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Decline reason is mandatory (minimum 20 characters).
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  loading={isUpdatingStatus}
                  loadingText="Updating Status…"
                  disabled={!newStatus || newStatus === caseDoc.status}
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" /> Apply Status Change
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
