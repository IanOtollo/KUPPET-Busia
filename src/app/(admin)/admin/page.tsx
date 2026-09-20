"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatRelativeTime } from "@/lib/format";
import {
  UserCheck,
  HeartHandshake,
  ShieldAlert,
  Bus,
  AlertTriangle,
  History,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function AdminDashboardPage() {
  const members = useQuery(api.users.listMembers, {});
  const bereavementCases = useQuery(api.bereavement.listAllAdmin, {});
  const harassmentReports = useQuery(api.harassment.listAllAdmin, {});
  const busBookings = useQuery(api.busBookings.listAllAdmin, {});
  const auditLogs = useQuery(api.auditLog.listRecentAdmin, { limit: 6 });

  const pendingMembers = members?.filter((m: { status: string }) => m.status === "pending_approval" || m.status === "pending_verification") ?? [];
  const pendingBereavement = bereavementCases?.filter((c: { status: string }) => c.status === "submitted" || c.status === "under_review") ?? [];
  const pendingHarassment = harassmentReports?.filter((r: { status: string }) => r.status === "submitted" || r.status === "acknowledged") ?? [];
  const pendingBus = busBookings?.filter((b: { status: string }) => b.status === "requested" || b.status === "under_review") ?? [];

  // Needs attention: submitted > 48h ago
  const now = Date.now();
  const fortyEightHoursMs = 48 * 60 * 60 * 1000;
  const needsAttentionBereavement = bereavementCases?.filter(
    (c: { status: string; createdAt: number }) => c.status === "submitted" && now - c.createdAt > fortyEightHoursMs
  ) || [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SECRETARIAT OPERATIONS"
        title="Branch Operations Dashboard"
        lead="Operational queue oversight, pending membership approvals, welfare adjudication, asset calendar, and real-time audit logging."
      />

      {/* 1. Pending Work Row (Clickable Tiles) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card interactive>
          <Link href="/admin/members">
            <CardContent className="pt-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                  Pending Members
                </span>
                {pendingMembers.length > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--warning)] animate-pulse" />
                )}
              </div>
              <div className="mono-ref text-[36px] font-bold text-[var(--ink)]">
                {pendingMembers.length}
              </div>
              <p className="text-[12.5px] text-[var(--ink-muted)]">
                Awaiting TSC verification
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card interactive>
          <Link href="/admin/bereavement">
            <CardContent className="pt-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                  Pending Bereavement
                </span>
                {pendingBereavement.length > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--warning)] animate-pulse" />
                )}
              </div>
              <div className="mono-ref text-[36px] font-bold text-[var(--ink)]">
                {pendingBereavement.length}
              </div>
              <p className="text-[12.5px] text-[var(--ink-muted)]">
                Awaiting welfare review
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card interactive>
          <Link href="/admin/harassment">
            <CardContent className="pt-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                  Pending Harassment
                </span>
                {pendingHarassment.length > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--danger)] animate-pulse" />
                )}
              </div>
              <div className="mono-ref text-[36px] font-bold text-[var(--ink)]">
                {pendingHarassment.length}
              </div>
              <p className="text-[12.5px] text-[var(--ink-muted)]">
                Confidential grievance queue
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card interactive>
          <Link href="/admin/bus">
            <CardContent className="pt-6 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                  Pending Bus Requests
                </span>
                {pendingBus.length > 0 && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--warning)] animate-pulse" />
                )}
              </div>
              <div className="mono-ref text-[36px] font-bold text-[var(--ink)]">
                {pendingBus.length}
              </div>
              <p className="text-[12.5px] text-[var(--ink-muted)]">
                Fleet schedule requests
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* 2. Needs Attention (>48h unhandled) Banner & Table */}
      {needsAttentionBereavement.length > 0 && (
        <Card className="border-[var(--warning)] bg-[var(--warning-soft)]/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
              <CardTitle className="text-[18px]">
                Needs Urgent Attention (Submitted &gt; 48 hours ago)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-[14px]">
              {needsAttentionBereavement.map((c: any) => (
                <div key={c._id} className="flex items-center justify-between p-3 rounded-[var(--r-md)] bg-[var(--surface)] border border-[var(--line)]">
                  <div>
                    <span className="mono-ref font-bold text-[var(--union)] mr-2">{c.reference}</span>
                    <span className="font-semibold text-[var(--ink)]">{c.memberNameSnapshot}</span>
                    <span className="text-[12.5px] text-[var(--ink-muted)] ml-2">({c.relationship} - {c.deceasedName})</span>
                  </div>
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/admin/bereavement/${c._id}`}>Review Now</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Sub-County Welfare Distribution */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sub-County Welfare Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "Matayos", count: 18 },
                { name: "Nambale", count: 14 },
                { name: "Teso North", count: 22 },
                { name: "Teso South", count: 16 },
                { name: "Butula", count: 12 },
                { name: "Samia (Funyula)", count: 9 },
                { name: "Bunyala (Budalangi)", count: 8 },
              ].map((sc) => {
                const max = 25;
                const percentage = Math.round((sc.count / max) * 100);
                return (
                  <div key={sc.name} className="space-y-1">
                    <div className="flex justify-between text-[13.5px]">
                      <span className="font-medium text-[var(--ink)]">{sc.name}</span>
                      <span className="mono-ref text-[var(--ink-muted)]">{sc.count} members</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[var(--surface-sunk)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--union)] rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Audit Activity Feed */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-[var(--union)]" />
                <CardTitle className="text-[17px]">Recent Audit Activity Feed</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-[13px]">
              {auditLogs === undefined ? (
                <Skeleton className="h-40 w-full" />
              ) : auditLogs.length === 0 ? (
                <p className="text-[var(--ink-muted)]">No audit entries recorded yet.</p>
              ) : (
                auditLogs.map((log: { _id: string; action: string; createdAt: number; entityType: string; entityId?: string }) => (
                  <div key={log._id} className="pb-3 border-b border-[var(--line)] last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-[11.5px] text-[var(--ink-muted)]">
                      <span className="font-semibold text-[var(--union)]">{log.action}</span>
                      <span>{formatRelativeTime(log.createdAt)}</span>
                    </div>
                    <p className="text-[var(--ink-body)] mt-0.5 font-mono text-[12px]">
                      {log.entityType} • {log.entityId || "system"}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

