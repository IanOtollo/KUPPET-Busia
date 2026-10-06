"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/data/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/format";
import { Bell, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Doc } from "../../../../../../convex/_generated/dataModel";
import { useMemberBasePath } from "@/lib/memberPath";

export default function MemberNotificationsPage() {
  const basePath = useMemberBasePath();
  const allNotifications = useQuery(api.notifications.listMine);
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  const notifications = allNotifications?.filter((n) => nowMs - n.createdAt < 24 * 3600_000);
  const markRead = useMutation(api.notifications.markAsRead);

  return (
    <div>
      <PageHeader
        eyebrow="IN-APP NOTIFICATIONS"
        title="Notifications & Case Alerts"
        lead="Real-time status updates on your bereavement claims, bus reservations, and branch announcements."
        breadcrumbs={[
          { label: "Dashboard", href: `${basePath}/dashboard` },
          { label: "Notifications" },
        ]}
      />

      {notifications === undefined ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description="You will receive alerts here whenever your welfare claims or bus requests are updated by the branch office. Notifications are removed automatically after 24 hours."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n: Doc<"notifications">) => (
            <Card
              key={n._id}
              className={!n.isRead ? "border-l-4 border-l-[var(--union)] bg-[var(--union-soft)]/20" : ""}
            >
              <CardContent className="pt-4 pb-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {n.link ? (
                      <Link
                        href={`${basePath}${n.link}`}
                        onClick={() => !n.isRead && markRead({ id: n._id })}
                        className="font-semibold text-[18px] text-[var(--ink)] hover:text-[var(--union)] hover:underline"
                      >
                        {n.title}
                      </Link>
                    ) : (
                      <span className="font-semibold text-[18px] text-[var(--ink)]">
                        {n.title}
                      </span>
                    )}
                    {!n.isRead && (
                      <span className="px-2 py-0.5 rounded-full bg-[var(--union)] text-white text-[13.5px] font-bold">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-[16.5px] text-[var(--ink-body)] leading-relaxed">
                    {n.body}
                  </p>
                  <span className="text-[15.5px] text-[var(--ink-muted)] block">
                    {formatRelativeTime(n.createdAt)}
                  </span>
                </div>

                {!n.isRead && (
                  <button
                    onClick={() => markRead({ id: n._id })}
                    className="text-[16px] text-[var(--union)] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Mark read
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
