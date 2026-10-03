"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/data/StatusBadge";
import { formatRelativeTime } from "@/lib/format";
import {
  HeartHandshake,
  Bus,
  Users,
  AlertTriangle,
  ArrowRight,
  Phone,
  Sparkles,
  MessageSquare,
  Bell,
  CheckCircle2,
  Megaphone,
  ArrowRightLeft,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { useMemberBasePath } from "@/lib/memberPath";

type AttentionItem = {
  id: string;
  icon: typeof Bell;
  title: string;
  detail: string;
  href: string;
  status?: string;
  time?: number;
};

// What the teacher is waiting for, in plain words, per stage.
const BEREAVEMENT_NEXT: Record<string, string> = {
  submitted: "Received — waiting for the branch office to start review.",
  under_review: "The branch office is reviewing your claim.",
  verified: "Your claim is verified — support approval is next.",
  support_approved: "Support approved — payment is being arranged.",
  disbursed: "Support has been paid out.",
};

const BUS_NEXT: Record<string, string> = {
  requested: "Waiting for the branch office to review your request.",
  under_review: "The branch office is reviewing your request.",
  awaiting_payment: "Approved — open the booking to see the amount to pay.",
  payment_submitted: "Payment sent — waiting for the branch office to verify it.",
  approved: "Approved — awaiting final confirmation.",
  confirmed: "Confirmed. Check the date and pick-up details.",
};

export default function MemberDashboardPage() {
  const basePath = useMemberBasePath();
  const profile = useQuery(api.users.getMyProfile);
  const bereavementCases = useQuery(api.bereavement.listMine);
  const busBookings = useQuery(api.busBookings.listMine);
  const announcements = useQuery(api.announcements.listActive);
  const notifications = useQuery(api.notifications.listMine);
  const unreadMessages = useQuery(api.messages.unreadCount);
  const officials = useQuery(api.officials.listActive);
  const leadershipContacts = officials
    ?.filter((o: { tier: string }) => o.tier === "executive")
    .slice(0, 2);

  // Time-aware Kenyan greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const name = profile?.fullName || "Teacher";
  const isPendingApproval =
    profile?.status === "pending_approval" || profile?.status === "pending_verification";

  // Every current announcement, most important first, then newest.
  const PRIORITY_RANK: Record<string, number> = { urgent: 0, important: 1, normal: 2 };
  const sortedAnnouncements = [...(announcements ?? [])].sort(
    (a: { priority: string; publishedAt: string }, b: { priority: string; publishedAt: string }) =>
      (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2) ||
      b.publishedAt.localeCompare(a.publishedAt)
  );

  // Everything the teacher is waiting on or should act on. Deliberately built
  // only from bereavement, bus, messages and notifications — harassment reports
  // are confidential and never surface on the home screen.
  const attention: AttentionItem[] = [];

  for (const c of bereavementCases ?? []) {
    if (["closed", "declined"].includes(c.status)) continue;
    attention.push({
      id: `brv-${c._id}`,
      icon: HeartHandshake,
      title: `Bereavement claim — ${c.deceasedName}`,
      detail: BEREAVEMENT_NEXT[c.status] ?? "In progress.",
      href: `${basePath}/bereavement/${c._id}`,
      status: c.status,
      time: c.createdAt,
    });
  }

  for (const b of busBookings ?? []) {
    if (["completed", "cancelled", "declined"].includes(b.status)) continue;
    attention.push({
      id: `bus-${b._id}`,
      icon: Bus,
      title: `Bus request — ${b.destination}`,
      detail: BUS_NEXT[b.status] ?? "In progress.",
      href: `${basePath}/bus/${b._id}`,
      status: b.status,
      time: b.createdAt,
    });
  }

  if ((unreadMessages ?? 0) > 0) {
    attention.push({
      id: "messages",
      icon: MessageSquare,
      title: `${unreadMessages} unread ${unreadMessages === 1 ? "message" : "messages"}`,
      detail: "Open your inbox to read and reply.",
      href: `${basePath}/messages`,
    });
  }

  const unreadNotifications = (notifications ?? []).filter((n: { isRead: boolean }) => !n.isRead);
  if (unreadNotifications.length > 0) {
    const latest = unreadNotifications[0];
    attention.push({
      id: "notifications",
      icon: Bell,
      title:
        unreadNotifications.length === 1
          ? latest.title
          : `${unreadNotifications.length} new notifications`,
      detail: unreadNotifications.length === 1 ? latest.body : `Latest: ${latest.title}`,
      href: `${basePath}/notifications`,
      time: latest.createdAt,
    });
  }

  const dataReady =
    bereavementCases !== undefined &&
    busBookings !== undefined &&
    notifications !== undefined &&
    unreadMessages !== undefined;

  return (
    <div className="space-y-8">
      {/* 1. Greeting */}
      <div>
        <span className="eyebrow block mb-1">MEMBER PORTAL</span>
        <h1 className="font-serif text-[30px] sm:text-[38px] font-bold text-[var(--ink)] leading-tight">
          {getGreeting()}, {name}.
        </h1>
      </div>

      {/* 2. Branch announcements: the first thing every member sees */}
      {sortedAnnouncements.length > 0 && (
        <section aria-label="Branch announcements">
          <h2 className="font-serif text-[20px] font-semibold text-[var(--ink)] mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-[var(--brass)]" /> Branch Announcements
          </h2>
          <div className="space-y-3">
            {sortedAnnouncements.map(
              (a: { _id: string; title: string; body: string; priority: string; publishedAt: string }) => {
                const urgent = a.priority === "urgent";
                const important = a.priority === "important";
                return (
                  <div
                    key={a._id}
                    className={`p-4 rounded-[var(--r-md)] border ${
                      urgent
                        ? "bg-[var(--warning-soft)] border-[var(--warning)]"
                        : important
                          ? "bg-[var(--brass-soft)] border-[var(--brass)]/40"
                          : "bg-[var(--surface)] border-[var(--line)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <strong className="font-semibold text-[var(--ink)] text-[15px]">{a.title}</strong>
                      {(urgent || important) && (
                        <span className="eyebrow text-[var(--brass)] font-semibold shrink-0">
                          {urgent ? "URGENT" : "IMPORTANT"}
                        </span>
                      )}
                    </div>
                    <p className="text-[14px] leading-relaxed text-[var(--ink-body)] mt-1 whitespace-pre-line">
                      {a.body}
                    </p>
                    <span className="text-[12px] text-[var(--ink-muted)] block mt-2">
                      {formatRelativeTime(new Date(a.publishedAt).getTime())}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        </section>
      )}

      {/* 3. Account status warning (if awaiting verification) */}
      {isPendingApproval && (
        <div className="p-4 rounded-[var(--r-md)] bg-[var(--warning-soft)] border border-[var(--warning)] flex items-start gap-3.5">
          <AlertTriangle className="h-5 w-5 text-[var(--warning)] shrink-0 mt-0.5" />
          <div className="text-[14px] leading-relaxed text-[var(--ink-body)]">
            <strong className="font-semibold text-[var(--ink)] block">
              Membership Verification Pending
            </strong>
            Your registration is awaiting verification by the branch office.
          </div>
        </div>
      )}

      {/* 4. Needs your attention */}
      <section>
        <h2 className="font-serif text-[20px] font-semibold text-[var(--ink)] mb-4">
          Needs your attention
        </h2>

        {!dataReady ? (
          <Card>
            <CardContent className="pt-6 text-[14px] text-[var(--ink-muted)]">Checking your account…</CardContent>
          </Card>
        ) : attention.length === 0 ? (
          <Card>
            <CardContent className="pt-6 flex items-center gap-3 text-[14px] text-[var(--ink-body)]">
              <CheckCircle2 className="h-5 w-5 text-[var(--union)] shrink-0" />
              <span>
                <strong className="font-semibold text-[var(--ink)]">You&apos;re all caught up.</strong>{" "}
                Nothing is waiting on you or on the branch office right now.
              </span>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {attention.map((item) => {
              const Icon = item.icon;
              return (
                <Card interactive key={item.id}>
                  <Link href={item.href}>
                    <CardContent className="pt-5 pb-5 flex items-center gap-4">
                      <span className="h-10 w-10 rounded-full bg-[var(--surface-sunk)] grid place-items-center shrink-0">
                        <Icon className="h-5 w-5 text-[var(--union)]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-[var(--ink)] block text-[15px] truncate">
                          {item.title}
                        </span>
                        <span className="text-[13.5px] text-[var(--ink-muted)] block">
                          {item.detail}
                        </span>
                        {item.time && (
                          <span className="text-[12px] text-[var(--ink-muted)] block mt-0.5">
                            {formatRelativeTime(item.time)}
                          </span>
                        )}
                      </div>
                      {item.status && <StatusBadge status={item.status} />}
                      <ArrowRight className="h-4 w-4 text-[var(--ink-muted)] shrink-0" />
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. Quick actions */}
      <section>
        <h2 className="font-serif text-[20px] font-semibold text-[var(--ink)] mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Button variant="secondary" className="h-[48px] justify-start px-4 text-left" asChild>
            <Link href={`${basePath}/bereavement/new`}>
              <HeartHandshake className="h-4 w-4 text-[var(--union)] shrink-0" />
              <span className="truncate">Report Bereavement</span>
            </Link>
          </Button>

          <Button variant="secondary" className="h-[48px] justify-start px-4 text-left" asChild>
            <Link href={`${basePath}/bus/new`}>
              <Bus className="h-4 w-4 text-[var(--union)] shrink-0" />
              <span className="truncate">Book Union Bus</span>
            </Link>
          </Button>

          <Button variant="secondary" className="h-[48px] justify-start px-4 text-left" asChild>
            <Link href={`${basePath}/transfers`}>
              <ArrowRightLeft className="h-4 w-4 text-[var(--union)] shrink-0" />
              <span className="truncate">Transfers & Swaps</span>
            </Link>
          </Button>

          <Button variant="secondary" className="h-[48px] justify-start px-4 text-left" asChild>
            <Link href={`${basePath}/branch/officials`}>
              <Users className="h-4 w-4 text-[var(--union)] shrink-0" />
              <span className="truncate">Branch Directory</span>
            </Link>
          </Button>
        </div>
      </section>

      {/* 7. Branch leadership contacts */}
      <div className="p-5 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)]">
        <h4 className="font-serif text-[17px] font-semibold text-[var(--ink)] mb-3">
          Your Branch Leadership Contacts
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[13.5px]">
          {leadershipContacts && leadershipContacts.length > 0 ? (
            leadershipContacts.map((official: { _id: string; fullName: string; position: string; phone?: string }) => (
              <div key={official._id} className="p-3.5 rounded-[var(--r-md)] bg-[var(--canvas)] border border-[var(--line)]">
                <span className="eyebrow text-[var(--brass)] block mb-1">{official.position.toUpperCase()}</span>
                <strong className="text-[var(--ink)] font-semibold block text-[15px]">
                  {official.fullName}
                </strong>
                {official.phone ? (
                  <a
                    href={`tel:${official.phone}`}
                    className="mt-2 inline-flex items-center gap-1.5 text-[var(--union)] font-medium"
                  >
                    <Phone className="h-3.5 w-3.5" /> Call {official.phone}
                  </a>
                ) : (
                  <span className="mt-2 block text-[12.5px] text-[var(--ink-muted)]">
                    Contact via the branch secretariat
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="text-[13.5px] text-[var(--ink-muted)] sm:col-span-2">
              Loading branch leadership contacts…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
