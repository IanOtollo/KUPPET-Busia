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
  Clock,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { SUB_COUNTIES } from "@/lib/constants";

export default function AdminDashboardPage() {
  const members = useQuery(api.users.listMembers, {});
  const bereavementCases = useQuery(api.bereavement.listAllAdmin, {});
  const harassmentReports = useQuery(api.harassment.listAllAdmin, {});
  const busBookings = useQuery(api.busBookings.listAllAdmin, {});

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

  // Active members grouped by sub-county for the welfare distribution chart.
  const activeMembers = members?.filter((m: { status: string }) => m.status === "active") ?? [];
  const subCountyDistribution = SUB_COUNTIES.map((name) => ({
    name,
    count: activeMembers.filter((m: { subCounty: string }) => m.subCounty === name).length,
  }));
  const maxSubCountyCount = Math.max(1, ...subCountyDistribution.map((sc) => sc.count));

  const recentSubmissions = [
    ...(members ?? []).map((m) => ({
      id: `member-${m._id}`,
      text: `New membership application: ${m.fullName}`,
      href: "/admin/members",
      createdAt: m.createdAt,
    })),
    ...(bereavementCases ?? []).map((c) => ({
      id: `ber-${c._id}`,
      text: `New bereavement claim: ${c.deceasedName} (${c.memberNameSnapshot})`,
      href: `/admin/bereavement/${c._id}`,
      createdAt: c.createdAt,
    })),
    ...(harassmentReports ?? []).map((r) => ({
      id: `har-${r._id}`,
      text: `New harassment report: ${r.reference}`,
      href: `/admin/harassment/${r._id}`,
      createdAt: r.createdAt,
    })),
    ...(busBookings ?? []).map((b) => ({
      id: `bus-${b._id}`,
      text: `New bus request: ${b.requesterName} to ${b.destination}`,
      href: `/admin/bus/${b._id}`,
      createdAt: b.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SECRETARIAT OPERATIONS"
        title="Branch Operations Dashboard"
        lead="Operational queue oversight, pending membership approvals, welfare adjudication, asset calendar, and real-time audit logging."
      />

      {/* 1. Pending Work Row (Clickable Tiles) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        <Card interactive>
          <Link href="/admin/members" className="group block h-full">
            <CardContent className="relative pt-6 pb-11 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                  Total Members
                </span>
              </div>
              <div className="mono-ref text-[36px] font-bold text-[var(--ink)]">
                {members?.length ?? 0}
              </div>
              <p className="text-[12.5px] text-[var(--ink-muted)]">
                {pendingMembers.length > 0
                  ? `${pendingMembers.length} awaiting TSC verification`
                  : "All registered teacher members"}
              </p>
              <span aria-hidden className="absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-tl-[var(--r-md)] rounded-br-[var(--r-md)] bg-[var(--union)] text-white shadow-[0_4px_12px_rgba(31,61,92,0.28)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRight className="h-5 w-5" />
              </span>
            </CardContent>
          </Link>
        </Card>

        <Card interactive>
          <Link href="/admin/bereavement" className="group block h-full">
            <CardContent className="relative pt-6 pb-11 space-y-2">
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
              <span aria-hidden className="absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-tl-[var(--r-md)] rounded-br-[var(--r-md)] bg-[var(--union)] text-white shadow-[0_4px_12px_rgba(31,61,92,0.28)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRight className="h-5 w-5" />
              </span>
            </CardContent>
          </Link>
        </Card>

        <Card interactive>
          <Link href="/admin/harassment" className="group block h-full">
            <CardContent className="relative pt-6 pb-11 space-y-2">
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
              <span aria-hidden className="absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-tl-[var(--r-md)] rounded-br-[var(--r-md)] bg-[var(--union)] text-white shadow-[0_4px_12px_rgba(31,61,92,0.28)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRight className="h-5 w-5" />
              </span>
            </CardContent>
          </Link>
        </Card>

        <Card interactive>
          <Link href="/admin/bus" className="group block h-full">
            <CardContent className="relative pt-6 pb-11 space-y-2">
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
              <span aria-hidden className="absolute -bottom-2 -right-2 grid h-10 w-10 place-items-center rounded-tl-[var(--r-md)] rounded-br-[var(--r-md)] bg-[var(--union)] text-white shadow-[0_4px_12px_rgba(31,61,92,0.28)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRight className="h-5 w-5" />
              </span>
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
              {subCountyDistribution.map((sc) => {
                const percentage = Math.round((sc.count / maxSubCountyCount) * 100);
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

        {/* Right Col: Recent Submissions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[var(--union)]" />
                <CardTitle className="text-[17px]">Recent Submissions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-[13px]">
              {members === undefined ? (
                <Skeleton className="h-40 w-full" />
              ) : recentSubmissions.length === 0 ? (
                <p className="text-[var(--ink-muted)]">Nothing has been submitted yet.</p>
              ) : (
                recentSubmissions.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--line)] last:border-0 last:pb-0 hover:text-[var(--union)] transition-colors"
                  >
                    <span className="text-[var(--ink-body)]">{item.text}</span>
                    <span className="shrink-0 text-[11.5px] text-[var(--ink-muted)]">{formatRelativeTime(item.createdAt)}</span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

