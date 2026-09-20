"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatShortDate } from "@/lib/format";
import { CheckCircle2, XCircle, Shield, UserCheck } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { toast } from "sonner";

export default function AdminMembersPage() {
  const members = useQuery(api.users.listMembers, {});
  const approveMemberMutation = useMutation(api.users.approveMember);
  const setMemberStatusMutation = useMutation(api.users.setMemberStatus);

  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleApprove = async (userId: Id<"users">) => {
    setProcessingId(userId);
    try {
      await approveMemberMutation({ userId });
      toast.success("Member account verified and approved.");
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
          {item.status !== "active" && (
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
          data={members}
          keyExtractor={(item) => item._id}
        />
      )}
    </div>
  );
}

