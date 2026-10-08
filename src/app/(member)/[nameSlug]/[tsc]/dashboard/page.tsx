"use client";

import { useEffect, useState } from "react";
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
  ListChecks,
  ChevronDown,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
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
  submitted: "Received. The branch office is reviewing your claim.",
  under_review: "Received. The branch office is reviewing your claim.",
  verified: "Received. The branch office is reviewing your claim.",
  support_approved: "Approved. Members have been told how to support you.",
  disbursed: "Approved. Members have been told how to support you.",
};

const BUS_NEXT: Record<string, string> = {
  requested: "Waiting for the branch office to review your request.",
  under_review: "The branch office is reviewing your request.",
  awaiting_payment: "Approved — open the booking to see the amount to pay.",
  payment_submitted: "Payment sent — waiting for the branch office to verify it.",
  approved: "Approved — awaiting final confirmation.",
  confirmed: "Confirmed. Check the date and pick-up details.",
};

function formatTimeLeft(msLeft: number): string {
  const hours = Math.floor(msLeft / 3600_000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h left`;
  if (hours >= 1) return `${hours}h left`;
  return `${Math.max(1, Math.floor(msLeft / 60_000))}m left`;
}

/**
 * Section heading shared by every block on the home screen: icon + title + a
 * count pill, with one plain-language line saying what the block is for. The
 * helper line is what lets people tell "things I must do" from "things the
 * branch wants me to know" at a glance.
 */
function SectionHeader({
  icon: Icon,
  title,
  count,
  helper,
  tone,
}: {
  icon: typeof Bell;
  title: string;
  count?: number;
  helper: string;
  tone: "action" | "notice" | "community";
}) {
  const iconTone =
    tone === "action" ? "bg-[var(--union)] text-white" : tone === "notice" ? "bg-[var(--brass)] text-[var(--ink)]" : "bg-[var(--union-soft)] text-[var(--union)]";
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${iconTone}`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 font-serif text-[24px] font-semibold leading-tight text-[var(--heading-accent)]">
          {title}
          {count !== undefined && count > 0 && (
            <span className="rounded-full bg-[var(--surface-sunk)] px-2.5 py-0.5 font-sans text-[15.5px] font-semibold text-[var(--ink-body)]">
              {count}
            </span>
          )}
        </h2>
        <p className="text-[16px] text-[var(--ink-muted)]">{helper}</p>
      </div>
    </div>
  );
}

/** A branch notice: read-only, warm-tinted, long text folded until asked for. */
function NoticeCard({
  a,
  nowMs,
}: {
  a: { _id: string; title: string; body: string; priority: string; publishedAt: string; expiresAt?: string };
  nowMs: number;
}) {
  const [open, setOpen] = useState(false);
  const long = a.body.length > 220;
  const important = a.priority === "important";
  return (
    <article className="rounded-[var(--r-md)] border border-[var(--brass)]/25 bg-[var(--surface)] p-6">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[18px] font-semibold leading-snug text-[var(--ink)]">{a.title}</h3>
        {important && (
          <span className="shrink-0 rounded-full bg-[var(--brass-soft)] px-2.5 py-0.5 text-[14.5px] font-semibold text-[var(--brass)]">
            Important
          </span>
        )}
      </div>
      <p className={`mt-2 whitespace-pre-line text-[17px] leading-relaxed text-[var(--ink-body)] ${!open && long ? "line-clamp-3" : ""}`}>
        {a.body}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-[16px] font-semibold text-[var(--union)] hover:underline cursor-pointer"
        >
          {open ? "Show less" : "Read more"}
        </button>
      )}
      <p className="mt-3 text-[15.5px] text-[var(--ink-muted)]">
        Posted {formatRelativeTime(new Date(a.publishedAt).getTime())}
        {a.expiresAt && a.expiresAt.length > 10 && <> · {formatTimeLeft(new Date(a.expiresAt).getTime() - nowMs)}</>}
      </p>
    </article>
  );
}

export default function MemberDashboardPage() {
  const basePath = useMemberBasePath();
  const profile = useQuery(api.users.getMyProfile);
  const bereavementCases = useQuery(api.bereavement.listMine);
  const busBookings = useQuery(api.busBookings.listMine);
  const announcements = useQuery(api.announcements.listActive);
  const notifications = useQuery(api.notifications.listMine);
  const markRead = useMutation(api.notifications.markAsRead);
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

  // Convex only re-runs the query when data changes, so re-check expiry every minute
  // to make timed notices disappear on schedule without a page refresh.
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showAllNotices, setShowAllNotices] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Every current announcement, most important first, then newest.
  const PRIORITY_RANK: Record<string, number> = { urgent: 0, important: 1, normal: 2 };
  const sortedAnnouncements = [...(announcements ?? [])]
    .filter((a: { expiresAt?: string }) => {
      // Legacy date-only expiries are handled by the server query.
      if (!a.expiresAt || a.expiresAt.length <= 10) return true;
      return new Date(a.expiresAt).getTime() > nowMs;
    })
    .sort(
    (a: { priority: string; publishedAt: string }, b: { priority: string; publishedAt: string }) =>
      (PRIORITY_RANK[a.priority] ?? 2) - (PRIORITY_RANK[b.priority] ?? 2) ||
      b.publishedAt.localeCompare(a.publishedAt)
  );

  const urgentAnnouncements = sortedAnnouncements.filter((a: { priority: string }) => a.priority === "urgent");
  const regularAnnouncements = sortedAnnouncements.filter((a: { priority: string }) => a.priority !== "urgent");

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

  const CONTRIBUTION_VISIBLE_MS = 24 * 3600_000;
  const contributionCalls = (notifications ?? []).filter(
    (n: { type: string; isRead: boolean; createdAt: number }) =>
      n.type === "bereavement_contribution" && !n.isRead && nowMs - n.createdAt < CONTRIBUTION_VISIBLE_MS
  );

  const unreadNotifications = (notifications ?? []).filter(
    (n: { isRead: boolean; type: string; createdAt: number }) =>
      !n.isRead && n.type !== "bereavement_contribution" && nowMs - n.createdAt < CONTRIBUTION_VISIBLE_MS
  );
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
    <div className="space-y-12 lg:space-y-14">
      {/* 1. Greeting */}
      <div>
        <span className="eyebrow block mb-1">MEMBER PORTAL</span>
        <h1 className="font-serif text-[30px] sm:text-[38px] font-bold text-[var(--ink)] leading-tight">
          {getGreeting()}, {name}.
        </h1>
      </div>

      {/* Orientation line: how much is waiting, in one glance */}
      {dataReady && (
        <p className="-mt-4 text-[17px] text-[var(--ink-muted)]">
          {attention.length === 0
            ? "Nothing needs you right now."
            : `${attention.length} ${attention.length === 1 ? "thing needs" : "things need"} your attention`}
          {regularAnnouncements.length > 0 &&
            ` · ${regularAnnouncements.length} ${regularAnnouncements.length === 1 ? "notice" : "notices"} from the branch`}
        </p>
      )}

      {/* Urgent branch notices interrupt the page (and only they do) */}
      {urgentAnnouncements.map((a: { _id: string; title: string; body: string; publishedAt: string }) => (
        <div
          key={a._id}
          role="alert"
          className="flex items-start gap-4 rounded-[var(--r-md)] border-2 border-[var(--warning)] bg-[var(--warning-soft)] p-5"
        >
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-[var(--warning)]" />
          <div className="min-w-0">
            <span className="text-[15.5px] font-bold uppercase tracking-wide text-[var(--warning)]">Urgent from the branch</span>
            <h3 className="text-[19px] font-semibold leading-snug text-[var(--ink)]">{a.title}</h3>
            <p className="mt-1 whitespace-pre-line text-[17px] leading-relaxed text-[var(--ink-body)]">{a.body}</p>
            <p className="mt-2 text-[15.5px] text-[var(--ink-muted)]">
              Posted {formatRelativeTime(new Date(a.publishedAt).getTime())}
            </p>
          </div>
        </div>
      ))}

      {/* Account status warning (if awaiting verification) */}
      {isPendingApproval && (
        <div className="flex items-start gap-3.5 rounded-[var(--r-md)] border border-[var(--warning)] bg-[var(--warning-soft)] p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--warning)]" />
          <div className="text-[16px] leading-relaxed text-[var(--ink-body)]">
            <strong className="block font-semibold text-[var(--ink)]">Membership Verification Pending</strong>
            Your registration is awaiting verification by the branch office.
          </div>
        </div>
      )}

      {/* A. MY TASKS: personal, actionable, tappable */}
      <section aria-label="Needs your attention">
        <SectionHeader
          icon={ListChecks}
          tone="action"
          title="Needs your attention"
          count={attention.length}
          helper="Your own claims, bookings and messages. Tap one to open it."
        />

        {!dataReady ? (
          <Card>
            <CardContent className="pt-6 text-[16px] text-[var(--ink-muted)]">Checking your account…</CardContent>
          </Card>
        ) : attention.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6 text-[16px] text-[var(--ink-body)]">
              <CheckCircle2 className="h-6 w-6 shrink-0 text-[var(--union)]" />
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
                <Card interactive key={item.id} className="border-l-4 border-l-[var(--union)]">
                  <Link href={item.href}>
                    <CardContent className="flex items-center gap-5 pt-7 pb-7">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--union-soft)]">
                        <Icon className="h-5 w-5 text-[var(--union)]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[17px] font-semibold leading-snug text-[var(--ink)]">{item.title}</span>
                        <span className="block text-[16px] text-[var(--ink-muted)]">{item.detail}</span>
                        {item.time && (
                          <span className="mt-0.5 block text-[15.5px] text-[var(--ink-muted)]">{formatRelativeTime(item.time)}</span>
                        )}
                      </div>
                      {item.status && <StatusBadge status={item.status} />}
                      <span className="hidden shrink-0 items-center gap-1 text-[16px] font-semibold text-[var(--union)] sm:flex">
                        Open <ArrowRight className="h-4 w-4" />
                      </span>
                      <ArrowRight className="h-5 w-5 shrink-0 text-[var(--union)] sm:hidden" />
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* B. COMMUNITY: a colleague needs support */}
      {contributionCalls.length > 0 && (
        <section aria-label="Colleague bereavement">
          <SectionHeader
            icon={HeartHandshake}
            tone="community"
            title="Standing with a colleague"
            count={contributionCalls.length}
            helper="A fellow member has lost a loved one. You can contribute if you wish."
          />
          <div className="space-y-3">
            {contributionCalls.map(
              (n: { _id: Id<"notifications">; title: string; body: string; createdAt: number }) => (
                <div
                  key={n._id}
                  className="rounded-[var(--r-md)] border border-l-4 border-[var(--union)]/30 border-l-[var(--union)] bg-[var(--union-soft)]/40 p-5"
                >
                  <strong className="block text-[19px] font-semibold leading-snug text-[var(--ink)]">
                    {n.title.replace(/^Bereavement:\s*/, "")}
                  </strong>
                  <p className="mt-2 text-[17px] leading-relaxed text-[var(--ink-body)]">{n.body}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-[15.5px] text-[var(--ink-muted)]">
                      {formatRelativeTime(n.createdAt)} · disappears after 24 hours
                    </span>
                    <Button variant="secondary" size="sm" onClick={() => markRead({ id: n._id })}>
                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> Got it, dismiss
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* C. FROM THE BRANCH: information only, nothing to do */}
      {regularAnnouncements.length > 0 && (
        <section
          aria-label="Branch announcements"
          className="rounded-[var(--r-lg)] border border-[var(--brass)]/30 bg-[var(--brass-soft)]/50 p-4 sm:p-6"
        >
          <SectionHeader
            icon={Megaphone}
            tone="notice"
            title="From the branch"
            count={regularAnnouncements.length}
            helper="Notices from the branch office. For your information; nothing to do."
          />
          <div className="space-y-3">
            {(showAllNotices ? regularAnnouncements : regularAnnouncements.slice(0, 1)).map(
              (a: { _id: string; title: string; body: string; priority: string; publishedAt: string; expiresAt?: string }) => (
                <NoticeCard key={a._id} a={a} nowMs={nowMs} />
              )
            )}
          </div>
          {regularAnnouncements.length > 1 && (
            <button
              type="button"
              onClick={() => setShowAllNotices((v) => !v)}
              className="mt-4 inline-flex items-center gap-1.5 text-[16px] font-semibold text-[var(--union)] hover:underline cursor-pointer"
            >
              {showAllNotices ? "Show fewer notices" : `Show ${regularAnnouncements.length - 1} more`}
              <ChevronDown className={`h-4 w-4 transition-transform ${showAllNotices ? "rotate-180" : ""}`} />
            </button>
          )}
        </section>
      )}

      {/* 6. Quick actions */}
      <section>
        <h2 className="mb-1 font-serif text-[22px] font-semibold text-[var(--ink)]">Quick actions</h2>
        <p className="mb-4 text-[16px] text-[var(--ink-muted)]">Start something new.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button variant="secondary" className="h-[64px] justify-start px-5 text-left text-[17px]" asChild>
            <Link href={`${basePath}/bereavement/new`}>
              <HeartHandshake className="h-4 w-4 text-[var(--union)] shrink-0" />
              <span className="truncate">Report Bereavement</span>
            </Link>
          </Button>

          <Button variant="secondary" className="h-[64px] justify-start px-5 text-left text-[17px]" asChild>
            <Link href={`${basePath}/bus/new`}>
              <Bus className="h-4 w-4 text-[var(--union)] shrink-0" />
              <span className="truncate">Book Union Bus</span>
            </Link>
          </Button>

          <Button variant="secondary" className="h-[64px] justify-start px-5 text-left text-[17px]" asChild>
            <Link href={`${basePath}/transfers`}>
              <ArrowRightLeft className="h-4 w-4 text-[var(--union)] shrink-0" />
              <span className="truncate">Transfers & Swaps</span>
            </Link>
          </Button>

          <Button variant="secondary" className="h-[64px] justify-start px-5 text-left text-[17px]" asChild>
            <Link href={`${basePath}/branch/officials`}>
              <Users className="h-4 w-4 text-[var(--union)] shrink-0" />
              <span className="truncate">Branch Directory</span>
            </Link>
          </Button>
        </div>
      </section>

      {/* 7. Branch leadership contacts */}
      <details className="group rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] p-6">
        <summary className="flex cursor-pointer list-none items-center justify-between font-serif text-[22px] font-semibold text-[var(--heading-accent)]">
          Branch leadership contacts
          <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[15px]">
          {leadershipContacts && leadershipContacts.length > 0 ? (
            leadershipContacts.map((official: { _id: string; fullName: string; position: string; phone?: string }) => (
              <div key={official._id} className="p-3.5 rounded-[var(--r-md)] bg-[var(--canvas)] border border-[var(--line)]">
                <span className="eyebrow text-[var(--brass)] block mb-1">{official.position.toUpperCase()}</span>
                <strong className="text-[var(--ink)] font-semibold block text-[16px]">
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
                  <span className="mt-2 block text-[14px] text-[var(--ink-muted)]">
                    Contact via the branch secretariat
                  </span>
                )}
              </div>
            ))
          ) : (
            <p className="text-[15px] text-[var(--ink-muted)] sm:col-span-2">
              Loading branch leadership contacts…
            </p>
          )}
        </div>
        </div>
      </details>
    </div>
  );
}
