"use client";

import { useMemo, useState, use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/data/StatusBadge";
import { CaseTimeline } from "@/components/data/CaseTimeline";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDate, formatDateTime, formatKES } from "@/lib/format";
import {
  Send,
  CheckCircle,
  MessageSquare,
  Paperclip,
  ExternalLink,
  ArrowRight,
  XCircle,
  PartyPopper,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { BereavementStatus } from "@/lib/constants";
import { ACTIONABLE, PAYMENT_METHODS, enteredStatusAt, planFor } from "@/lib/bereavementFlow";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

const DONE_MESSAGE: Record<string, string> = {
  under_review: "Marked as under review. The member has been told.",
  verified: "Claim verified. The member has been told.",
  support_approved: "Relief approved. The member has been told the amount.",
  disbursed: "Payment recorded. The member has been told.",
  closed: "Case closed.",
  declined: "Claim declined. The member has been told why.",
};

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
  const addNoteMutation = useMutation(api.bereavement.addInternalNote);
  const confirm = useConfirm();

  const [docsChecked, setDocsChecked] = useState(false);
  const [amount, setAmount] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [payRef, setPayRef] = useState("");
  const [memberNote, setMemberNote] = useState("");
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [justDone, setJustDone] = useState<string | null>(null);

  const [previewIdx, setPreviewIdx] = useState<number | null>(null);
  const [internalNoteText, setInternalNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  // Oldest claim still waiting on an admin, other than this one.
  const waiting = useMemo(
    () =>
      (allCases ?? [])
        .filter((c) => c._id !== caseId && ACTIONABLE.has(c.status))
        .sort((a, b) => enteredStatusAt(a) - enteredStatusAt(b)),
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

  const plan = planFor(caseDoc.status);
  const documents: { label: string; url: string | null }[] = [
    ...(caseDoc.burialPermitId ? [{ label: "Burial permit", url: caseDoc.burialPermitUrl }] : []),
    ...(caseDoc.payslipId ? [{ label: "Payslip", url: caseDoc.payslipUrl }] : []),
    ...(caseDoc.documentUrls ?? []).map((d: { id: string; url: string | null }, i: number) => ({
      label: `Other document ${i + 1}`,
      url: d.url,
    })),
  ];

  const amountNumber = parseFloat(amount ?? String(caseDoc.supportAmount ?? ""));
  const hasAmount = Number.isFinite(amountNumber) && amountNumber > 0;

  /** What is still missing before the main button works, in plain words. */
  const missing: string | null = (() => {
    if (plan.needs.documentsChecked && !docsChecked) return "Tick the box above once you have checked the documents.";
    if (plan.needs.amount && !hasAmount) return "Enter the relief amount to continue.";
    if (plan.needs.payment && !payRef.trim()) return "Enter the payment reference to continue.";
    return null;
  })();

  const apply = async (to: BereavementStatus, reason?: string) => {
    setBusy(true);
    setJustDone(null);
    try {
      await updateStatusMutation({
        id: caseId,
        newStatus: to,
        statusReason: (reason ?? memberNote).trim() || undefined,
        supportAmount: to === "support_approved" && hasAmount ? amountNumber : undefined,
        paymentMethod: to === "disbursed" ? payMethod : undefined,
        paymentReference: to === "disbursed" ? payRef.trim() : undefined,
      });
      setJustDone(to);
      setMemberNote("");
      setDeclineReason("");
      setDeclining(false);
      setDocsChecked(false);
      setPayRef("");
      toast.success(DONE_MESSAGE[to] ?? "Case updated.");
    } catch (err: unknown) {
      const error = err as { message?: string; data?: { message?: string } };
      toast.error(error.data?.message || error.message || "Failed to update case status.");
    } finally {
      setBusy(false);
    }
  };

  const handlePrimary = async () => {
    const primary = plan.primary;
    if (!primary || missing) return;

    if (primary.to === "verified" && caseDoc.contributionMethod && !caseDoc.contributionBroadcastAt) {
      const ok = await confirm({
        title: "Verify this claim and notify all members?",
        description: (
          <p>
            This sends <strong>every member and official</strong> a notification about {caseDoc.deceasedName}
            &apos;s passing and how to contribute ({caseDoc.contributionMethod}: {caseDoc.contributionNumber}). It goes
            out once and cannot be recalled, so check the contribution details first.
          </p>
        ),
        confirmLabel: "Yes, verify and notify",
      });
      if (!ok) return;
    } else if (primary.to === "disbursed") {
      const ok = await confirm({
        title: "Record this payment?",
        description: (
          <p>
            You are recording that {formatKES(caseDoc.supportAmount)} was paid to {caseDoc.memberNameSnapshot} via{" "}
            {payMethod} (ref {payRef.trim()}). {caseDoc.memberNameSnapshot} will be notified.
          </p>
        ),
        confirmLabel: "Yes, record payment",
      });
      if (!ok) return;
    }
    await apply(primary.to);
  };

  const handleSecondary = async (to: BereavementStatus) => {
    if (to === "closed") {
      const ok = await confirm({
        title: "Close this case without payment?",
        description: <p>The case will be closed with no relief paid. This cannot be reopened.</p>,
        confirmLabel: "Yes, close case",
        tone: "danger",
      });
      if (!ok) return;
    }
    await apply(to);
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      toast.error("Please give a reason for declining this case.");
      return;
    }
    const ok = await confirm({
      title: "Decline this bereavement claim?",
      description: (
        <p>
          {caseDoc.memberNameSnapshot} will be told their claim is declined, with your reason. This is final: the case
          cannot be reopened (they would have to file a new claim).
        </p>
      ),
      confirmLabel: "Yes, decline claim",
      tone: "danger",
    });
    if (!ok) return;
    await apply("declined", declineReason);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNoteText.trim()) return;

    setIsAddingNote(true);
    try {
      await addNoteMutation({ id: caseId, note: internalNoteText.trim() });
      toast.success("Internal note added to case file.");
      setInternalNoteText("");
    } catch {
      toast.error("Failed to add note.");
    } finally {
      setIsAddingNote(false);
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

      <Card className="mb-6">
        <CardContent className="pt-6">
          <CaseTimeline
            status={caseDoc.status}
            createdAt={caseDoc.createdAt}
            disbursedAt={caseDoc.disbursedAt}
            history={caseDoc.history}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Action panel: first on mobile so the next step is never buried */}
        <div className="lg:order-2 space-y-6">
          <Card className="lg:sticky lg:top-20">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle>{plan.primary ? "Next step" : "Case status"}</CardTitle>
                <StatusBadge status={caseDoc.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {justDone && (
                <div className="rounded-[var(--r-md)] border border-[var(--success)] bg-[var(--success-soft)] p-3 text-[15px] text-[var(--success)]">
                  <p className="flex items-center gap-2 font-semibold">
                    <PartyPopper className="h-4 w-4" /> {DONE_MESSAGE[justDone] ?? "Done."}
                  </p>
                  {nextCase ? (
                    <Button asChild size="sm" className="mt-3 w-full">
                      <Link href={`/admin/bereavement/${nextCase._id}`}>
                        Next waiting claim ({waiting.length}) <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  ) : (
                    <p className="mt-1 text-[14px]">No other claims are waiting. You&apos;re all caught up.</p>
                  )}
                </div>
              )}

              {caseDoc.supportAmount ? (
                <div className="p-3 bg-[var(--surface-sunk)] border border-[var(--line)] rounded-[var(--r-md)]">
                  <span className={dt}>Approved relief</span>
                  <span className="mono-ref block text-[20px] font-bold text-[var(--ink)]">
                    {formatKES(caseDoc.supportAmount)}
                  </span>
                  {caseDoc.paymentReference && (
                    <span className="text-[14px] text-[var(--ink-muted)]">
                      Paid via {caseDoc.paymentMethod ?? "—"} · ref{" "}
                      <span className="mono-ref">{caseDoc.paymentReference}</span>
                    </span>
                  )}
                </div>
              ) : null}

              {!plan.primary ? (
                <div className="text-[15px] text-[var(--ink-muted)] space-y-2">
                  <p>
                    This case is <strong className="text-[var(--ink)]">{caseDoc.status.replace(/_/g, " ")}</strong>. Nothing
                    more to do.
                  </p>
                  {caseDoc.statusReason && (
                    <p className="p-3 rounded-[var(--r-md)] bg-[var(--surface-sunk)] border border-[var(--line)] text-[var(--ink-body)]">
                      <strong>Note to member:</strong> {caseDoc.statusReason}
                    </p>
                  )}
                  {!justDone && nextCase && (
                    <Button asChild variant="secondary" size="sm" className="w-full">
                      <Link href={`/admin/bereavement/${nextCase._id}`}>
                        Next waiting claim ({waiting.length}) <ArrowRight className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {plan.needs.documentsChecked && (
                    <label className="flex items-start gap-3 rounded-[var(--r-md)] border border-[var(--line)] p-3 cursor-pointer">
                      <Checkbox
                        checked={docsChecked}
                        onCheckedChange={(v) => setDocsChecked(v === true)}
                        className="mt-0.5"
                        aria-label="I have checked the documents"
                      />
                      <span className="text-[15px] text-[var(--ink)]">
                        I have checked the burial permit, payslip and claim details.
                      </span>
                    </label>
                  )}

                  {plan.needs.amount && (
                    <div>
                      <Label htmlFor="amount">Relief amount (KES)</Label>
                      <Input
                        id="amount"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        placeholder="e.g. 20000"
                        value={amount ?? (caseDoc.supportAmount ? String(caseDoc.supportAmount) : "")}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                  )}

                  {plan.needs.payment && (
                    <div className="space-y-3">
                      <div>
                        <span className="block text-[15px] font-medium text-[var(--ink)] mb-1.5">Paid by</span>
                        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Payment method">
                          {PAYMENT_METHODS.map((m) => (
                            <button
                              key={m}
                              type="button"
                              role="radio"
                              aria-checked={payMethod === m}
                              onClick={() => setPayMethod(m)}
                              className={cn(
                                "rounded-full border px-4 min-h-[44px] text-[15px] font-medium transition-colors",
                                payMethod === m
                                  ? "bg-[var(--union)] text-white border-[var(--union)]"
                                  : "bg-[var(--surface)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--canvas)]"
                              )}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="payRef">Payment reference</Label>
                        <Input
                          id="payRef"
                          placeholder={payMethod === "M-Pesa" ? "e.g. SGH4K2LMNP" : "Transaction or cheque number"}
                          value={payRef}
                          onChange={(e) => setPayRef(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <Button className="w-full" size="lg" onClick={handlePrimary} loading={busy} loadingText="Saving…" disabled={!!missing}>
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      {plan.primary.to === "support_approved" && hasAmount
                        ? `Approve ${formatKES(amountNumber)}`
                        : plan.primary.label}
                    </Button>
                    <p className="mt-2 text-[14px] text-[var(--ink-muted)]">{missing ?? plan.primary.hint}</p>
                  </div>

                  <details className="group">
                    <summary className="cursor-pointer text-[14.5px] font-medium text-[var(--union)] min-h-[44px] flex items-center">
                      Add a note for the member (optional)
                    </summary>
                    <Textarea
                      rows={2}
                      value={memberNote}
                      onChange={(e) => setMemberNote(e.target.value)}
                      placeholder="Sent with the notification, e.g. “Please collect your cheque from the branch office.”"
                    />
                  </details>

                  {(plan.secondary.length > 0 || plan.canDecline) && (
                    <div className="pt-3 border-t border-[var(--line)] space-y-2">
                      {plan.secondary.map((s) => (
                        <Button
                          key={s.to}
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          disabled={busy}
                          onClick={() => handleSecondary(s.to)}
                        >
                          {s.label}
                        </Button>
                      ))}

                      {plan.canDecline &&
                        (declining ? (
                          <div className="space-y-2 rounded-[var(--r-md)] border border-[var(--danger)] p-3">
                            <Label htmlFor="declineReason">Reason for declining (sent to the member)</Label>
                            <Textarea
                              id="declineReason"
                              rows={3}
                              value={declineReason}
                              onChange={(e) => setDeclineReason(e.target.value)}
                              placeholder="e.g. The burial permit is unreadable. Please file a new claim with a clear copy."
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                className="flex-1"
                                onClick={handleDecline}
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
                            <XCircle className="h-4 w-4 mr-1.5" /> Decline this claim
                          </Button>
                        ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Facts, documents first because verifying depends on them */}
        <div className="lg:order-1 lg:col-span-2 space-y-6">
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

          <Card>
            <CardHeader>
              <CardTitle>Claim Details</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-[16px]">
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
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[15.5px]">
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
                    ? "All members have been notified of this bereavement and how to contribute."
                    : "Members are notified of these details when you verify the claim."}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[var(--union)]" />
                <CardTitle>Internal Notes (confidential)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[14px] text-[var(--ink-muted)]">Only branch officials see these. The teacher never does.</p>

              {caseDoc.internalNotes && caseDoc.internalNotes.length > 0 ? (
                <div className="space-y-3">
                  {caseDoc.internalNotes.map(
                    (note: { authorId: string; authorName: string; note: string; createdAt: number }, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-[var(--r-md)] bg-[var(--surface-sunk)] border border-[var(--line)] text-[15px]"
                      >
                        <div className="flex items-center justify-between text-[13px] text-[var(--ink-muted)] mb-1">
                          <span className="font-semibold text-[var(--ink)]">{note.authorName}</span>
                          <span>{formatDateTime(note.createdAt)}</span>
                        </div>
                        <p className="text-[var(--ink-body)]">{note.note}</p>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p className="text-[14.5px] text-[var(--ink-muted)] italic">No internal notes yet.</p>
              )}

              <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-[var(--line)]">
                <Textarea
                  value={internalNoteText}
                  onChange={(e) => setInternalNoteText(e.target.value)}
                  placeholder="Record an observation or committee recommendation…"
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
                  <Send className="h-3.5 w-3.5 mr-1" /> Add note
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
