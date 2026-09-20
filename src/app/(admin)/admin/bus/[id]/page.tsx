"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatKES } from "@/lib/format";
import { ArrowLeft, Bus, CheckCircle2, User, Phone, MapPin, AlertTriangle } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

export default function AdminBusDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const bookingId = resolvedParams.id as Id<"busBookings">;

  const booking = useQuery(api.busBookings.getById, { id: bookingId });

  if (booking === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-8 text-center bg-[var(--surface)] border border-[var(--line)] rounded-[var(--r-lg)]">
        <p className="text-[15px] text-[var(--ink-muted)] mb-4">Bus reservation not found.</p>
        <Button asChild>
          <Link href="/admin/bus">Back to Queue</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[860px] mx-auto">
      <PageHeader
        eyebrow="BUS RESERVATION REVIEW"
        title={`${booking.destination} (${booking.reference})`}
        lead={`Requester: ${booking.requesterName} • Institution: ${booking.school}`}
        breadcrumbs={[
          { label: "Admin Operations", href: "/admin" },
          { label: "Bus Queue", href: "/admin/bus" },
          { label: booking.reference },
        ]}
        action={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/admin/bus">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Bus Queue
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] border-b border-[var(--line)] pb-3">
                Reservation Facts & Schedule
              </h3>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14.5px]">
                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Departure Time & Location
                  </dt>
                  <dd className="font-semibold text-[var(--ink)] mt-0.5">
                    {formatDateTime(booking.departureAt)}
                  </dd>
                  <dd className="text-[13px] text-[var(--ink-muted)]">
                    {booking.departurePoint}
                  </dd>
                </div>

                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Return Time & Destination
                  </dt>
                  <dd className="font-semibold text-[var(--ink)] mt-0.5">
                    {formatDateTime(booking.returnAt)}
                  </dd>
                  <dd className="text-[13px] text-[var(--ink-muted)]">
                    {booking.destination}
                  </dd>
                </div>

                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Passenger Count
                  </dt>
                  <dd className="font-semibold text-[var(--union)] mt-0.5">
                    {booking.passengers} Passengers (Capacity: 62)
                  </dd>
                </div>

                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Trip Category
                  </dt>
                  <dd className="font-medium mt-0.5">{booking.purpose}</dd>
                </div>

                <div className="sm:col-span-2 pt-3 border-t border-[var(--line)]">
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] mb-1">
                    Mandatory Reason Provided by Member
                  </dt>
                  <dd className="text-[14px] leading-relaxed text-[var(--ink-body)] bg-[var(--canvas)] p-3 rounded-[var(--r-md)] border border-[var(--line)] whitespace-pre-line">
                    {booking.reason}
                  </dd>
                </div>

                {booking.extraRequirements && (
                  <div className="sm:col-span-2">
                    <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] mb-1">
                      Extra Requirements
                    </dt>
                    <dd className="text-[13.5px] text-[var(--ink-body)]">
                      {booking.extraRequirements}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h4 className="text-[13.5px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                Reservation Status
              </h4>

              <div className="flex items-center justify-between">
                <StatusBadge status={booking.status} />
                <span className="mono-ref text-[12.5px] text-[var(--ink-muted)]">
                  {booking.reference}
                </span>
              </div>

              {booking.driverName && (
                <div className="p-3 bg-[var(--success-soft)] border border-[var(--success)]/40 rounded-[var(--r-md)] space-y-1">
                  <span className="text-[11.5px] uppercase font-semibold text-[var(--success)] block">
                    Assigned Driver
                  </span>
                  <div className="font-medium text-[var(--ink)]">{booking.driverName}</div>
                  <div className="text-[12.5px] text-[var(--union)] font-medium">
                    {booking.driverPhone}
                  </div>
                </div>
              )}

              {booking.contributionKes !== undefined && booking.contributionKes > 0 && (
                <div className="p-3 bg-[var(--surface-sunk)] border border-[var(--line)] rounded-[var(--r-md)]">
                  <span className="text-[11.5px] uppercase font-semibold text-[var(--ink-muted)] block">
                    Fuel & Contribution
                  </span>
                  <span className="mono-ref text-[18px] font-bold text-[var(--ink)]">
                    {formatKES(booking.contributionKes)}
                  </span>
                </div>
              )}

              <Button className="w-full" asChild>
                <Link href="/admin/bus">Open Action Modal in Queue</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
