"use client";

import { useMemo, useState, use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  CheckCircle,
  Users,
  Paperclip,
  ExternalLink,
  ArrowRight,
  XCircle,
  PartyPopper,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { isApproved, isOpen } from "@/lib/bereavementFlow";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DONE_MESSAGE: Record<string, string> = {
  support_approved: "Approved. Teachers and the member have been notified.",
  declined: "Declined. The member has been told why.",
};

const DECLINE_REASONS = [
  {
    label: "Documents missing",
    text: "Your supporting documents are missing. Please submit a new claim with the burial permit and your payslip attached.",
  },
  {
    label: "Documents unclear",
    text: "One or more of your documents is unclear or unreadable. Please submit a new claim with clear copies.",
  },
  {
    label: "Details don't match",
    text: "The details in your claim do not match the documents provided. Please check them and submit a new claim.",
  },
  {
    label: "Not eligible",
    text: "This claim is not eligible under the union's welfare rules. Please contact the branch office for guidance.",
  },
];

export default function AdminBereavementDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // Keyed so moving to the next case starts with a clean form.
  return <CaseReview key={id} id={id} />;
}

function CaseReview({ id }: { id: string }) {
  const caseId = id as Id<"bereavementCases">;

  const caseDoc = useQuery(api.bereavement.getById, { id: caseId });
  const allCases = useQuery(api.bereavement.listAllAdmin, {});
  const updateStatusMutation = useMutation(api.bereavement.updateStatus);

  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [justDone, setJustDone] = useState<string | null>(null);

  const [previewIdx, setPreviewIdx] = useState<number | null>(null);

  // The longest-waiting claim still pending, other than this one.
  const waiting = useMemo(
    () =>
      (allCases ?? [])
        .filter((c) => c._id !== caseId && isOpen(c.status))
        .sort((a, b) => a.createdAt - b.createdAt),
    [allCases, caseId]
  );
  const nextCase = waiting[0];

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
        <p className="text-[16px] text-[var(--ink-muted)] mb-4">Case not found.</p>
        <Button asChild>
          <Link href="/admin/bereavement">Back to Queue</Link>
        </Button>
      </div>
    );
  }

  const documents: { label: string; url: string | null }[] = [
    ...(caseDoc.burialPermitId ? [{ label: "Burial permit", url: caseDoc.burialPermitUrl }] : []),
    ...(caseDoc.payslipId ? [{ label: "Payslip", url: caseDoc.payslipUrl }] : []),
    ...(caseDoc.documentUrls ?? []).map((d: { id: string; url: string | null }, i: number) => ({
      label: `Other document ${i + 1}`,
      url: d.url,
    })),
  ];
  const pending = isOpen(caseDoc.status);

  const decide = async (to: "support_approved" | "declined", reason?: string) => {
    setBusy(true);
    setJustDone(null);
    try {
      await updateStatusMutation({ id: caseId, newStatus: to, statusReason: reason?.trim() || undefined });
      setJustDone(to);
      setDeclineReason("");
      setDeclining(false);
      toast.success(DONE_MESSAGE[to]);
    } catch (err: unknown) {
      const error = err as { message?: string; data?: { message?: string } };
      toast.error(error.data?.message || error.message || "Could not save your decision.");
    } finally {
      setBusy(false);
    }
  };

  const dt = "text-[13.5px] uppercase font-semibold text-[var(--ink-muted)]";
  const preview = previewIdx !== null ? documents[previewIdx] : null;

  return (
    <div>
      <BackLink href="/admin/bereavement" label="Back to Queue" />
      <PageHeader
        eyebrow="WELFARE CASE REVIEW"
        title={`${caseDoc.deceasedName} (${caseDoc.reference})`}
        lead={`Member: ${caseDoc.memberNameSnapshot} • TSC: ${caseDoc.tscSnapshot} • ${caseDoc.subCounty}`}
        breadcrumbs={[
          { label: "Admin Operations", href: "/admin" },
          { label: "Bereavement Queue", href: "/admin/bereavement" },
          { label: caseDoc.reference },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Decision panel: first on mobile so it is never buried */}
        <div className="lg:order-2 space-y-6">
          <Card className="lg:sticky lg:top-20">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{pending ? "Your decision" : "Outcome"}</CardTitle>
                <StatusBadge status={isApproved(caseDoc.status) ? "support_approved" : caseDoc.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {justDone && (
                <div className="rounded-[var(--r-md)] border border-[var(--success)] bg-[var(--success-soft)] p-3 text-[15px] text-[var(--success)] font-semibold flex items-center gap-2">
                  <PartyPopper className="h-4 w-4 shrink-0" /> {DONE_MESSAGE[justDone]}
                </div>
              )}

              {pending ? (
                <>
                  <p className="flex items-start gap-2 text-[15px] text-[var(--ink-body)]">
                    <Users className="h-4 w-4 mt-1 shrink-0 text-[var(--union)]" />
                    <span>
                      <strong>Approving</strong> tells every teacher about {caseDoc.deceasedName}&apos;s passing
                      {caseDoc.contributionMethod ? (
                        <>
                          {" "}and how to contribute ({caseDoc.contributionMethod}:{" "}
                          <span className="mono-ref">{caseDoc.contributionNumber}</span>)
                        </>
                      ) : null}
                      , and tells {caseDoc.memberNameSnapshot} it is approved.
                    </span>
                  </p>

                  <Button className="w-full" size="lg" onClick={() => decide("support_approved")} loading={busy} loadingText="Approving…">
                    <CheckCircle className="h-4 w-4 mr-1.5" /> Approve
                  </Button>

                  {declining ? (
                    <div className="space-y-3 rounded-[var(--r-md)] border border-[var(--danger)] p-3">
                      <Label htmlFor="declineReason">Reason for declining (the member will read this)</Label>
                      <div className="flex flex-wrap gap-2">
                        {DECLINE_REASONS.map((r) => (
                          <button
                            key={r.label}
                            type="button"
                            onClick={() => setDeclineReason(r.text)}
                            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 min-h-[40px] text-[14px] font-medium text-[var(--ink)] hover:bg-[var(--canvas)]"
                          >
                            {r.label}
                          </button>
                        ))}
                      </div>
                      <Textarea
                        id="declineReason"
                        rows={4}
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        placeholder="Say what is missing or wrong so the member can fix it and submit again."
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => decide("declined", declineReason)}
                          disabled={busy || !declineReason.trim()}
                        >
                          Decline claim
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeclining(false)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-[var(--danger)]"
                      onClick={() => setDeclining(true)}
                    >
                      <XCircle className="h-4 w-4 mr-1.5" /> Decline
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-[15px] text-[var(--ink-muted)] space-y-2">
                  <p>
                    {caseDoc.status === "declined" ? "Declined" : "Approved"} on{" "}
                    <strong className="text-[var(--ink)]">
                      {formatDateTime(caseDoc.history?.[caseDoc.history.length - 1]?.at ?? caseDoc.updatedAt)}
                    </strong>
                    .
                  </p>
                  {caseDoc.statusReason && (
                    <p className="p-3 rounded-[var(--r-md)] bg-[var(--surface-sunk)] border border-[var(--line)] text-[var(--ink-body)]">
                      <strong>Reason:</strong> {caseDoc.statusReason}
                    </p>
                  )}
                </div>
              )}

              {nextCase && (
                <Button asChild variant={pending ? "ghost" : "secondary"} size="sm" className="w-full">
                  <Link href={`/admin/bereavement/${nextCase._id}`}>
                    Next pending claim ({waiting.length}) <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Claim facts */}
        <div className="lg:order-1 lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Claim Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-[16px] [&>div]:min-w-0 [&_dd]:break-words">
                <div>
                  <dt className={dt}>Deceased</dt>
                  <dd className="font-semibold text-[var(--ink)] mt-0.5">{caseDoc.deceasedName}</dd>
                </div>
                <div>
                  <dt className={dt}>Relationship</dt>
                  <dd className="font-bold text-[var(--brass)] uppercase mt-0.5">{caseDoc.relationship}</dd>
                </div>
                <div>
                  <dt className={dt}>Date of bereavement</dt>
                  <dd className="mt-0.5">{formatDate(caseDoc.dateOfBereavement)}</dd>
                </div>
                <div>
                  <dt className={dt}>Burial / service date</dt>
                  <dd className="mt-0.5">{caseDoc.burialDate ? formatDate(caseDoc.burialDate) : "Not specified"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className={dt}>Place of burial</dt>
                  <dd className="mt-0.5">{caseDoc.burialPlace || "Not specified"}</dd>
                </div>
                {caseDoc.details && (
                  <div className="sm:col-span-2 pt-2 border-t border-[var(--line)]">
                    <dt className={cn(dt, "mb-1")}>Member&apos;s narrative</dt>
                    <dd className="text-[15.5px] leading-relaxed text-[var(--ink-body)] whitespace-pre-line bg-[var(--canvas)] p-3 rounded-[var(--r-md)] border border-[var(--line)]">
                      {caseDoc.details}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Member</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[15.5px] [&>div]:min-w-0 [&_dd]:break-words">
                <div>
                  <dt className={dt}>Full name</dt>
                  <dd className="font-medium text-[var(--ink)] mt-0.5">{caseDoc.memberNameSnapshot}</dd>
                </div>
                <div>
                  <dt className={dt}>TSC number</dt>
                  <dd className="mono-ref font-medium text-[var(--ink)] mt-0.5">{caseDoc.tscSnapshot}</dd>
                </div>
                <div>
                  <dt className={dt}>School</dt>
                  <dd className="mt-0.5">{caseDoc.school}</dd>
                </div>
                <div>
                  <dt className={dt}>Sub-county</dt>
                  <dd className="mt-0.5">{caseDoc.subCounty}</dd>
                </div>
                <div>
                  <dt className={dt}>Phone</dt>
                  <dd className="mt-0.5 font-medium">
                    <a href={`tel:${caseDoc.phone}`} className="text-[var(--union)]">
                      {caseDoc.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className={dt}>Submitted</dt>
                  <dd className="mt-0.5">{formatDateTime(caseDoc.createdAt)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-[var(--union)]" />
                <CardTitle>Supporting Documents</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {documents.length === 0 ? (
                <p className="text-[14.5px] text-[var(--ink-muted)] italic">
                  No supporting documents were attached to this claim.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {documents.map((d, i) =>
                    d.url ? (
                      <Button
                        key={d.label}
                        variant={previewIdx === i ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setPreviewIdx(previewIdx === i ? null : i)}
                      >
                        <Paperclip className="h-3.5 w-3.5 mr-1.5" /> {d.label}
                      </Button>
                    ) : (
                      <span key={d.label} className="text-[15px] text-[var(--ink-muted)] self-center">
                        {d.label} (unavailable)
                      </span>
                    )
                  )}
                </div>
              )}
              {preview?.url && (
                <div className="space-y-2">
                  <iframe
                    src={preview.url}
                    title={preview.label}
                    className="w-full h-[480px] rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface-sunk)]"
                  />
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[14.5px] font-medium text-[var(--union)] hover:underline"
                  >
                    Open in a new tab <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {caseDoc.contributionMethod && (
            <Card>
              <CardContent className="pt-6 space-y-2">
                <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] border-b border-[var(--line)] pb-3">
                  Contribution Details
                </h3>
                <p className="text-[15.5px] text-[var(--ink-body)]">
                  <strong>{caseDoc.contributionMethod}:</strong>{" "}
                  <span className="mono-ref">{caseDoc.contributionNumber}</span>
                  {caseDoc.contributionAccount ? ` (${caseDoc.contributionAccount})` : ""}
                </p>
                {caseDoc.contributionNote && (
                  <p className="text-[15px] text-[var(--ink-muted)]">{caseDoc.contributionNote}</p>
                )}
                <p className="text-[14px] text-[var(--ink-muted)]">
                  {caseDoc.contributionBroadcastAt
                    ? "All teachers have been told about this bereavement and how to contribute."
                    : "Teachers are told these details when you approve the claim."}
                </p>
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
