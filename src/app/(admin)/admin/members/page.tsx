"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/data/DataTable";
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
import { CheckCircle2, Mail, Phone, School, ShieldCheck, UserRound } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { toast } from "sonner";

export default function AdminMembersPage() {
  const members = useQuery(api.users.listMembers, {});
  const approveMemberMutation = useMutation(api.users.approveMember);
  const setMemberStatusMutation = useMutation(api.users.setMemberStatus);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Doc<"users"> | null>(null);

  const handleApprove = async (userId: Id<"users">) => {
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

  const handleSuspend = async (userId: Id<"users">) => {
    if (!confirm("Are you sure you want to suspend this member account?")) return;
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

  const columns: Column<Doc<"users">>[] = [
    {
      key: "fullName",
      header: "Teacher Name",
      render: (item) => (
        <div>
          <span className="font-semibold text-[var(--ink)] block">
            {item.fullName}
          </span>
          <span className="text-[12px] text-[var(--ink-muted)]">
            {item.email}
          </span>
        </div>
      ),
    },
    {
      key: "tscNumber",
      header: "TSC & National ID",
      isMono: true,
      render: (item) => (
        <div>
          <span className="mono-ref text-[13px] font-bold text-[var(--union)] block">
            {item.tscNumber}
          </span>
          <span className="mono-ref text-[12px] text-[var(--ink-muted)]">
            ID: {item.idNumber}
          </span>
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
        <span className="capitalize text-[12.5px] font-semibold text-[var(--ink)]">
          {item.role}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      className: "text-right w-36",
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          {item.status !== "active" && item.role === "member" && (
            <Button
              size="sm"
              loading={processingId === item._id}
              onClick={() => handleApprove(item._id)}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
            </Button>
          )}
          {item.status === "active" && item.role === "member" && (
            <Button
              variant="secondary"
              size="sm"
              className="text-[var(--danger)] hover:bg-[var(--danger-soft)]"
              loading={processingId === item._id}
              onClick={() => handleSuspend(item._id)}
            >
              Suspend
            </Button>
          )}
        </div>
      ),
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
      />

      {members === undefined ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={members || []}
          keyExtractor={(item) => item._id}
          onRowClick={setSelectedMember}
        />
      )}

      <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[680px]">
          {selectedMember && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--union)] text-[var(--brass)]">
                    <UserRound className="h-6 w-6" />
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

