"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { DataTable, Column } from "@/components/data/DataTable";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatShortDate } from "@/lib/format";
import { JOB_GROUPS } from "@/lib/constants";
import { downloadExcel } from "@/lib/exportExcel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, Download, Search, X, CheckCircle2, Mail, Phone, School, ShieldCheck, UserRound, UserCheck, XCircle } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";

type StatusTab = "all" | "pending_approval" | "active" | "inactive";
const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Suspended / Rejected" },
];

export default function AdminMembersPage() {
  return (
    <Suspense fallback={null}>
      <AdminMembersPageInner />
    </Suspense>
  );
}

function AdminMembersPageInner() {
  const members = useQuery(api.users.listMembers, {});
  const approveMemberMutation = useMutation(api.users.approveMember);
  const setMemberStatusMutation = useMutation(api.users.setMemberStatus);
  const searchParams = useSearchParams();
  const transfers = useQuery(api.transfers.listAll, {});
  const acknowledgeTransfer = useMutation(api.transfers.acknowledge);
  const confirm = useConfirm();
  const pendingTransfers = transfers?.filter((t) => !t.acknowledgedAt) ?? [];

  const handleAcknowledge = async (id: Id<"transfers">) => {
    try {
      await acknowledgeTransfer({ id });
      toast.success("Marked as reviewed.");
    } catch {
      toast.error("Failed to update.");
    }
  };

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<(Doc<"users"> & { photoUrl: string | null }) | null>(null);
  const pendingApprovalCount = members?.filter((member) => member.status === "pending_approval").length ?? 0;

  // Opened via the top-bar search ("?highlight=<id>") — jump straight to that
  // member's record once the list has loaded.
  useEffect(() => {
    const highlightId = searchParams.get("highlight");
    if (highlightId && members && !selectedMember) {
      const match = members.find((m) => m._id === highlightId);
      if (match) setSelectedMember(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, members]);

  const handleApprove = async (userId: Id<"users">) => {
    const ok = await confirm({
      title: "Approve this membership?",
      description: (
        <p>
          The teacher gets full portal access straight away. Check their TSC number and National ID against your records
          first.
        </p>
      ),
      confirmLabel: "Yes, approve member",
    });
    if (!ok) return;
    setProcessingId(userId);
    try {
      await approveMemberMutation({ userId });
      toast.success("Member account verified and approved.");
      setSelectedMember((current) => current?._id === userId ? { ...current, status: "active" } : current);
    } catch {
      toast.error("Failed to approve member.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (userId: Id<"users">) => {
    const reason = window.prompt(
      "Reason for rejecting this membership application (shown to the applicant):"
    );
    if (reason === null) return;
    if (!reason.trim()) {
      toast.error("Enter a reason before rejecting.");
      return;
    }
    const ok = await confirm({
      title: "Reject this application?",
      description: <p>The applicant will not be able to sign in and will see your reason. Rejection cannot be undone from here.</p>,
      confirmLabel: "Yes, reject",
      tone: "danger",
    });
    if (!ok) return;
    setProcessingId(userId);
    try {
      await setMemberStatusMutation({ userId, newStatus: "rejected", reason: reason.trim() });
      toast.success("Membership application rejected.");
      setSelectedMember((current) => current?._id === userId ? { ...current, status: "rejected" } : current);
    } catch {
      toast.error("Failed to reject application.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspend = async (userId: Id<"users">) => {
    const ok = await confirm({
      title: "Suspend this member?",
      description: <p>They are signed out of the portal and cannot use any service until the account is reactivated.</p>,
      confirmLabel: "Yes, suspend",
      tone: "danger",
    });
    if (!ok) return;
    setProcessingId(userId);
    try {
      await setMemberStatusMutation({ userId, newStatus: "suspended", reason: "Admin action" });
      toast.success("Member account suspended.");
      setSelectedMember((current) => current?._id === userId ? { ...current, status: "suspended" } : current);
    } catch {
      toast.error("Failed to suspend member.");
    } finally {
      setProcessingId(null);
    }
  };

  const [query, setQuery] = useState("");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [jobGroupFilter, setJobGroupFilter] = useState<string>("all");

  const q = query.trim().toLowerCase();

  const tabCounts = useMemo(() => {
    const list = members ?? [];
    return {
      all: list.length,
      pending_approval: list.filter((m) => m.status === "pending_approval").length,
      active: list.filter((m) => m.status === "active").length,
      inactive: list.filter((m) => m.status === "suspended" || m.status === "rejected").length,
    } as Record<StatusTab, number>;
  }, [members]);

  // Filtered by status tab + search (name, school, TSC, ID, phone), sorted A-Z by name.
  const visibleMembers = useMemo(() => {
    return (members ?? [])
      .filter((m) => {
        if (statusTab === "pending_approval" && m.status !== "pending_approval") return false;
        if (statusTab === "active" && m.status !== "active") return false;
        if (statusTab === "inactive" && m.status !== "suspended" && m.status !== "rejected") return false;
        if (jobGroupFilter === "none" && m.jobGroup) return false;
        if (jobGroupFilter !== "all" && jobGroupFilter !== "none" && m.jobGroup !== jobGroupFilter) return false;
        if (!q) return true;
        return [m.fullName, m.school, m.tscNumber, m.idNumber, m.phone].some((v) => v?.toLowerCase().includes(q));
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" }));
  }, [members, statusTab, jobGroupFilter, q]);

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    if (visibleMembers.length === 0) {
      toast.error("No members in this view to export.");
      return;
    }
    setExporting(true);
    try {
      const groupPart = jobGroupFilter === "all" ? "" : `_JobGroup-${jobGroupFilter === "none" ? "Unset" : jobGroupFilter}`;
      await downloadExcel({
        fileName: `KUPPET_Busia_Members${groupPart}_${statusTab}_${new Date().toISOString().split("T")[0]}.xlsx`,
        sheetName: "Members",
        columns: [
          { header: "Name" },
          { header: "TSC Number", text: true },
          { header: "Job Group" },
          { header: "School" },
          { header: "Sub-County" },
          { header: "Phone", text: true },
          { header: "Email" },
          { header: "Status" },
        ],
        rows: visibleMembers.map((m) => [m.fullName, m.tscNumber, m.jobGroup ?? "", m.school, m.subCounty, m.phone, m.email, m.status]),
      });
      toast.success(`Exported ${visibleMembers.length} member${visibleMembers.length === 1 ? "" : "s"}.`);
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<Doc<"users"> & { photoUrl: string | null }>[] = [
    {
      key: "fullName",
      header: "Teacher Name",
      render: (item) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--union-soft)] text-[var(--union)]">
            {item.photoUrl ? (
              <img src={item.photoUrl} alt={item.fullName} className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-4 w-4" />
            )}
          </div>
          <div>
            <span className="font-semibold text-[var(--ink)] block">{item.fullName}</span>
            <span className="text-[12px] text-[var(--ink-muted)]">{item.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: "tscNumber",
      header: "TSC & National ID",
      isMono: true,
      render: (item) => (
        <div>
          <span className="mono-ref text-[13px] font-bold text-[var(--union)] block">{item.tscNumber}</span>
          <span className="mono-ref text-[12px] text-[var(--ink-muted)]">ID: {item.idNumber}</span>
        </div>
      ),
    },
    {
      key: "school",
      header: "School & Sub-County",
      render: (item) => (
        <div>
          <span className="font-medium text-[var(--ink-body)] block">{item.school}</span>
          <span className="text-[12px] text-[var(--ink-muted)]">{item.subCounty}</span>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (item) => (
        <span className="capitalize text-[12.5px] font-semibold text-[var(--ink)]">{item.role}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="MEMBER ADMINISTRATION"
        title="Member Accounts & Verification"
        lead="Verify registered post-primary teachers against TSC records, manage member accounts, and assign branch roles."
        breadcrumbs={[
          { label: "Admin Operations", href: "/admin" },
          { label: "Members Management" },
        ]}
        action={
          pendingApprovalCount > 0 ? (
            <div className="inline-flex items-center gap-2 rounded-[var(--r-full)] border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-3 py-2 text-[13px] font-semibold text-[var(--warning)]">
              <UserCheck className="h-4 w-4" />
              {pendingApprovalCount} awaiting review
            </div>
          ) : null
        }
      />

      {pendingApprovalCount > 0 && (
        <button
          type="button"
          onClick={() => {
            const firstPending = members?.find((member) => member.status === "pending_approval");
            if (firstPending) setSelectedMember(firstPending);
          }}
          className="mb-6 flex w-full items-center gap-3 rounded-[var(--r-md)] border border-[var(--warning)]/30 bg-[var(--warning-soft)] p-4 text-left text-[13.5px] text-[var(--ink-body)] transition-colors hover:bg-[var(--brass-soft)]"
        >
          <UserCheck className="h-5 w-5 shrink-0 text-[var(--warning)]" />
          <span><strong>{pendingApprovalCount} membership application{pendingApprovalCount === 1 ? "" : "s"} need review.</strong> Open each teacher record to verify their details before approving access.</span>
        </button>
      )}

      {pendingTransfers.length > 0 && (
        <div className="mb-6 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]">
          <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-3 text-[13.5px] font-semibold text-[var(--ink)]">
            <ArrowRightLeft className="h-4 w-4 text-[var(--union)]" />
            Transfers & promotions reported by teachers ({pendingTransfers.length})
          </div>
          <ul className="divide-y divide-[var(--line)]">
            {pendingTransfers.map((t) => (
              <li key={t._id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[13.5px] text-[var(--ink-body)]">
                  <span className="font-semibold text-[var(--ink)]">{t.memberName}</span>{" "}
                  <span className="mono-ref text-[12px] text-[var(--ink-muted)]">TSC {t.tscNumber}</span>
                  {t.fromSchool.trim().toLowerCase() !== t.toSchool.trim().toLowerCase() || t.fromSubCounty !== t.toSubCounty ? (
                    <div>{t.fromSchool} ({t.fromSubCounty}) → <strong>{t.toSchool} ({t.toSubCounty})</strong></div>
                  ) : null}
                  {t.fromDesignation !== t.toDesignation && (
                    <div>{t.fromDesignation} → <strong>{t.toDesignation}</strong></div>
                  )}
                  {(t.effectiveDate || t.reason) && (
                    <div className="text-[12px] text-[var(--ink-muted)]">
                      {[t.effectiveDate && `Effective ${t.effectiveDate}`, t.reason].filter(Boolean).join(" • ")}
                    </div>
                  )}
                  <div className="text-[11px] text-[var(--ink-muted)]">{formatShortDate(t.createdAt)}</div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => handleAcknowledge(t._id)}>
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark reviewed
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {members === undefined ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-[420px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by teacher name, school, TSC or ID…"
                aria-label="Search members"
                className="h-[40px] w-full rounded-[var(--r-md)] border border-[var(--line-strong)] bg-[var(--surface)] pl-9 pr-9 text-[13.5px] placeholder:text-[var(--ink-muted)] focus:border-[var(--union)] focus:outline-none focus:ring-2 focus:ring-[rgba(31,61,92,0.12)]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select value={jobGroupFilter} onValueChange={setJobGroupFilter}>
                <SelectTrigger aria-label="Filter by job group" className="h-[40px] w-[180px] text-[13.5px]">
                  <SelectValue placeholder="All job groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All job groups</SelectItem>
                  {JOB_GROUPS.map((g) => (
                    <SelectItem key={g} value={g}>Job Group {g}</SelectItem>
                  ))}
                  <SelectItem value="none">Not set</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="secondary" size="sm" onClick={handleExportExcel} disabled={exporting}>
                <Download className="mr-1.5 h-4 w-4" /> {exporting ? "Exporting…" : "Export Excel"}
              </Button>
            </div>

            <div role="tablist" className="flex flex-wrap gap-1.5">
              {STATUS_TABS.map((t) => (
                <button
                  key={t.value}
                  role="tab"
                  aria-selected={statusTab === t.value}
                  onClick={() => setStatusTab(t.value)}
                  className={`inline-flex items-center gap-1.5 rounded-[var(--r-full)] border px-3 py-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
                    statusTab === t.value
                      ? "border-[var(--union)] bg-[var(--union)] text-white"
                      : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-body)] hover:bg-[var(--surface-sunk)]"
                  }`}
                >
                  {t.label}
                  <span className={`text-[11px] ${statusTab === t.value ? "text-white/80" : "text-[var(--ink-muted)]"}`}>
                    {tabCounts[t.value]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="mb-3 text-[12.5px] text-[var(--ink-muted)]">
            {visibleMembers.length} teacher{visibleMembers.length === 1 ? "" : "s"}
            {jobGroupFilter !== "all" && ` · ${jobGroupFilter === "none" ? "no job group set" : `Job Group ${jobGroupFilter}`}`} · sorted A–Z by name
          </p>

          {visibleMembers.length === 0 ? (
            <div className="rounded-[var(--r-md)] border border-dashed border-[var(--line-strong)] bg-[var(--surface)] p-10 text-center text-[13.5px] text-[var(--ink-muted)]">
              {q ? `No teachers match "${query.trim()}".` : "No members in this view yet."}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={visibleMembers}
              keyExtractor={(item) => item._id}
              onRowClick={setSelectedMember}
            />
          )}
        </>
      )}

      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px]">
          {selectedMember && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--union)] text-[var(--brass)] overflow-hidden shrink-0">
                    {selectedMember.photoUrl ? (
                      <img src={selectedMember.photoUrl} alt={selectedMember.fullName} className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <span className="eyebrow block mb-1">MEMBER ACCOUNT RECORD</span>
                    <DialogTitle>{selectedMember.fullName}</DialogTitle>
                    <DialogDescription>{selectedMember.tscNumber} · {selectedMember.email}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="grid gap-3 py-2 sm:grid-cols-2">
                <Detail label="Account status"><StatusBadge status={selectedMember.status} /></Detail>
                <Detail label="Branch role"><span className="capitalize font-semibold">{selectedMember.role}</span></Detail>
                <Detail label="TSC number"><span className="mono-ref">{selectedMember.tscNumber}</span></Detail>
                <Detail label="National ID"><span className="mono-ref">{selectedMember.idNumber}</span></Detail>
                <Detail label="School"><span className="inline-flex items-center gap-1.5"><School className="h-4 w-4 text-[var(--ink-muted)]" />{selectedMember.school}</span></Detail>
                <Detail label="Sub-county">{selectedMember.subCounty}</Detail>
                <Detail label="Designation">{selectedMember.designation}</Detail>
                <Detail label="School role">{selectedMember.schoolRole || "Not provided"}</Detail>
                <Detail label="Telephone"><a className="inline-flex items-center gap-1.5 text-[var(--union)] hover:underline" href={`tel:${selectedMember.phone}`}><Phone className="h-4 w-4" />{selectedMember.phone}</a></Detail>
                <Detail label="Email"><a className="inline-flex items-center gap-1.5 break-all text-[var(--union)] hover:underline" href={`mailto:${selectedMember.email}`}><Mail className="h-4 w-4" />{selectedMember.email}</a></Detail>
                <Detail label="Subjects" className="sm:col-span-2">{selectedMember.subjects?.length ? selectedMember.subjects.join(", ") : "Not provided"}</Detail>
                <Detail label="Registered">{formatShortDate(selectedMember.createdAt)}</Detail>
                <Detail label="Approval">{selectedMember.approvedAt ? `${formatShortDate(selectedMember.approvedAt)} · verified` : "Awaiting approval"}</Detail>
              </div>

              <div className="rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface-sunk)] p-3 text-sm text-[var(--ink-body)]">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--ink)]"><ShieldCheck className="h-4 w-4 text-[var(--success)]" />Administrative controls</span>
                <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)]">Account actions are recorded in the audit log. Privileged branch accounts cannot be suspended from this member-management screen.</p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="secondary" onClick={() => setSelectedMember(null)}>Close</Button>
                {selectedMember.status === "pending_approval" && selectedMember.role === "member" && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                    loading={processingId === selectedMember._id}
                    onClick={() => handleReject(selectedMember._id)}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />Reject
                  </Button>
                )}
                {selectedMember.status !== "active" && selectedMember.role === "member" && (
                  <Button type="button" loading={processingId === selectedMember._id} onClick={() => handleApprove(selectedMember._id)}>
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />Approve Member
                  </Button>
                )}
                {selectedMember.status === "active" && selectedMember.role === "member" && (
                  <Button type="button" variant="secondary" className="text-[var(--danger)] hover:bg-[var(--danger-soft)]" loading={processingId === selectedMember._id} onClick={() => handleSuspend(selectedMember._id)}>
                    Suspend Account
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)] p-3 ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-muted)]">{label}</p>
      <div className="mt-1 text-sm text-[var(--ink-body)]">{children}</div>
    </div>
  );
}

