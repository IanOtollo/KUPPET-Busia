"use client";

import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/data/DataTable";
import { formatDateTime } from "@/lib/format";
import { History, Shield } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Doc } from "../../../../../convex/_generated/dataModel";

export default function AdminAuditPage() {
  const auditLogs = useQuery(api.auditLog.listRecentAdmin, { limit: 100 });

  const columns: Column<Doc<"auditLog">>[] = [
    {
      key: "createdAt",
      header: "Timestamp",
      isMono: true,
      render: (item) => formatDateTime(item.createdAt),
    },
    {
      key: "action",
      header: "Action Event",
      render: (item) => (
        <span className="mono-ref font-semibold text-[var(--union)]">
          {item.action}
        </span>
      ),
    },
    {
      key: "entityType",
      header: "Entity & ID",
      render: (item) => (
        <span className="text-[13px] text-[var(--ink-body)] font-mono">
          {item.entityType} {item.entityId ? `[${item.entityId}]` : ""}
        </span>
      ),
    },
    {
      key: "actorRole",
      header: "Actor Role",
      render: (item) => (
        <span className="capitalize text-[12.5px] font-medium text-[var(--ink-muted)]">
          {item.actorRole || "system"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="AUDIT TRAIL"
        title="System Immutable Audit Log"
        lead="Complete security and institutional log recording harassment file opens, status changes, member verification actions, and report downloads."
        breadcrumbs={[
          { label: "Admin Operations", href: "/admin" },
          { label: "Audit Log" },
        ]}
      />

      {auditLogs && (
        <DataTable
          columns={columns}
          data={auditLogs}
          keyExtractor={(item) => item._id}
          emptyMessage="No audit logs recorded."
        />
      )}
    </div>
  );
}

