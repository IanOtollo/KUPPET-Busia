"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/data/StatusBadge";
import { formatDate, formatRelativeTime } from "@/lib/format";
import {
  HeartHandshake,
  Shield,
  Bus,
  Users,
  AlertTriangle,
  ArrowRight,
  Phone,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export default function MemberDashboardPage() {
  const profile = useQuery(api.users.getMyProfile);
  const bereavementCases = useQuery(api.bereavement.listMine);
  const harassmentReports = useQuery(api.harassment.listMine);
  const busBookings = useQuery(api.busBookings.listMine);
  const announcements = useQuery(api.announcements.listActive);

  // Time-aware Kenyan greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const name = profile?.fullName ? profile.fullName.split(" ")[0] : "Teacher";
  const isPendingApproval = profile?.status === "pending_approval" || profile?.status === "pending_verification";

  const openBereavementCount =
    bereavementCases?.filter((c: { status: string }) => !["closed", "declined"].includes(c.status)).length || 0;
  const openHarassmentCount =
    harassmentReports?.filter((r: { status: string }) => !["resolved", "closed_no_action"].includes(r.status)).length || 0;
  const upcomingBusCount =
    busBookings?.filter((b: { status: string }) => !["completed", "cancelled", "declined"].includes(b.status)).length || 0;

  const urgentAnnouncement = announcements?.find((a: { priority: string }) => a.priority === "urgent");

  return (
    <div className="space-y-8">
      {/* 1. Time-aware Greeting Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <div>
            <span className="eyebrow block mb-1">MEMBER PORTAL</span>
            <h1 className="font-serif text-[30px] sm:text-[38px] font-bold text-[var(--ink)] leading-tight">
              {getGreeting()}, {name}.
            </h1>
          </div>
          <span className="mono-ref text-[13px] text-[var(--ink-muted)]">
            {formatDate(new Date())}
          </span>
        </div>
      </div>

      {/* 2. Account Status Warning Banner (if awaiting verification) */}
      {isPendingApproval && (
        <div className="p-4 rounded-[var(--r-md)] bg-[var(--warning-soft)] border border-[var(--warning)] flex items-start gap-3.5">
          <AlertTriangle className="h-5 w-5 text-[var(--warning)] shrink-0 mt-0.5" />
          <div className="text-[14px] leading-relaxed text-[var(--ink-body)]">
            <strong className="font-semibold text-[var(--ink)] block">
              Membership Verification Pending
            </strong>
            Your membership registration is awaiting verification by the branch secretariat office. Full welfare submission functions will be activated once your TSC credentials are confirmed.
          </div>
        </div>
      )}

      {/* 3. Urgent Announcement Banner */}
      {urgentAnnouncement && (
        <div className="p-4 rounded-[var(--r-md)] bg-[var(--warning-soft)] border border-[var(--warning)] flex items-start gap-3.5">
          <Sparkles className="h-5 w-5 text-[var(--brass)] shrink-0 mt-0.5" />
          <div className="text-[14px] leading-relaxed text-[var(--ink-body)]">
            <span className="eyebrow text-[var(--brass)] font-semibold block mb-0.5">
              URGENT BRANCH NOTICE
            </span>
            <strong className="font-semibold text-[var(--ink)] block">
              {urgentAnnouncement.title}
            </strong>
            <p className="text-[var(--ink-muted)] mt-1">{urgentAnnouncement.body}</p>
          </div>
        </div>
      )}

      {/* 4. 3-Card Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card interactive>
          <Link href="/bereavement">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                  Bereavement Cases
                </span>
                <HeartHandshake className="h-5 w-5 text-[var(--union)]" />
              </div>
              <div className="mono-ref text-[32px] font-bold text-[var(--ink)]">
                {openBereavementCount}
              </div>
              <div className="text-[13px] text-[var(--union)] font-medium flex items-center justify-between">
                <span>View claims history</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card interactive>
          <Link href="/harassment">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                  Harassment Protection
                </span>
                <Shield className="h-5 w-5 text-[var(--union)]" />
              </div>
              <div className="mono-ref text-[32px] font-bold text-[var(--ink)]">
                {openHarassmentCount}
              </div>
              <div className="text-[13px] text-[var(--union)] font-medium flex items-center justify-between">
                <span>Track confidential reports</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card interactive>
          <Link href="/bus">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                  Bus Reservations
                </span>
                <Bus className="h-5 w-5 text-[var(--union)]" />
              </div>
              <div className="mono-ref text-[32px] font-bold text-[var(--ink)]">
                {upcomingBusCount}
              </div>
              <div className="text-[13px] text-[var(--union)] font-medium flex items-center justify-between">
                <span>Check bus calendar</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>

      {/* 5. Quick Actions Row */}
      <div>
        <h3 className="font-serif text-[20px] font-semibold text-[var(--ink)] mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button variant="secondary" className="h-[48px] justify-start px-4 text-left" asChild>
            <Link href="/bereavement/new">
              <HeartHandshake className="h-4 w-4 text-[var(--union)] shrink-0" />
              <span className="truncate">Report Bereavement</span>
            </Link>
          </Button>

          <Button variant="secondary" className="h-[48px] justify-start px-4 text-left" asChild>
            <Link href="/harassment/new">
              <Shield className="h-4 w-4 text-[var(--union)] shrink-0" />
              <span className="truncate">Safe Harassment Report</span>
            </Link>
          </Button>

          <Button variant="secondary" className="h-[48px] justify-start px-4 text-left" asChild>
            <Link href="/bus/new">
              <Bus className="h-4 w-4 text-[var(--union)] shrink-0" />
              <span className="truncate">Book Union Bus</span>
            </Link>
          </Button>

          <Button variant="secondary" className="h-[48px] justify-start px-4 text-left" asChild>
            <Link href="/officials">
              <Users className="h-4 w-4 text-[var(--union)] shrink-0" />
              <span className="truncate">Branch Directory</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* 6. Recent Activity Timeline */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-4">
            Recent Activity Timeline
          </h3>

          {bereavementCases?.length === 0 && harassmentReports?.length === 0 && busBookings?.length === 0 ? (
            <p className="text-[14px] text-[var(--ink-muted)] py-4">
              No recent welfare activity on your account.
            </p>
          ) : (
            <div className="space-y-4">
              {bereavementCases?.slice(0, 3).map((c: any) => (
                <div key={c._id} className="flex items-center justify-between text-[14px] pb-3 border-b border-[var(--line)] last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--union)] shrink-0" />
                    <div>
                      <span className="font-semibold text-[var(--ink)] block">
                        Bereavement Claim: {c.deceasedName}
                      </span>
                      <span className="mono-ref text-[12px] text-[var(--ink-muted)]">
                        {c.reference} • {formatRelativeTime(c.createdAt)}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}

              {busBookings?.slice(0, 2).map((b: any) => (
                <div key={b._id} className="flex items-center justify-between text-[14px] pb-3 border-b border-[var(--line)] last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--brass)] shrink-0" />
                    <div>
                      <span className="font-semibold text-[var(--ink)] block">
                        Bus Reservation: {b.destination}
                      </span>
                      <span className="mono-ref text-[12px] text-[var(--ink-muted)]">
                        {b.reference} • {formatRelativeTime(b.createdAt)}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 7. Branch Leadership Executive Contacts Strip */}
      <div className="p-5 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)]">
        <h4 className="font-serif text-[17px] font-semibold text-[var(--ink)] mb-3">
          Your Branch Leadership Contacts
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13.5px]">
          <div className="p-3.5 rounded-[var(--r-md)] bg-[var(--canvas)] border border-[var(--line)]">
            <span className="eyebrow text-[var(--brass)] block mb-1">EXECUTIVE SECRETARY</span>
            <strong className="text-[var(--ink)] font-semibold block text-[15px]">
              Moffats Okisai
            </strong>
            <span className="text-[12.5px] text-[var(--ink-muted)] block mb-2">
              Branch Executive Officer & Spokesperson
            </span>
            <a
              href="tel:+254722000001"
              className="inline-flex items-center gap-1.5 text-[var(--union)] font-medium"
            >
              <Phone className="h-3.5 w-3.5" /> Call +254 722 000 001
            </a>
          </div>

          <div className="p-3.5 rounded-[var(--r-md)] bg-[var(--canvas)] border border-[var(--line)]">
            <span className="eyebrow text-[var(--brass)] block mb-1">BRANCH CHAIRPERSON</span>
            <strong className="text-[var(--ink)] font-semibold block text-[15px]">
              Rosemary Wandera
            </strong>
            <span className="text-[12.5px] text-[var(--ink-muted)] block mb-2">
              Governance & Council Chair
            </span>
            <a
              href="tel:+254722000002"
              className="inline-flex items-center gap-1.5 text-[var(--union)] font-medium"
            >
              <Phone className="h-3.5 w-3.5" /> Call +254 722 000 002
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

