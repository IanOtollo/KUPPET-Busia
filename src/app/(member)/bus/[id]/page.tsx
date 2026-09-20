"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatKES } from "@/lib/format";
import { ArrowLeft, Bus, MapPin, Calendar, Phone, User, Info, CheckCircle2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function BusBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const booking = useQuery(api.busBookings.getById, {
    id: resolvedParams.id as Id<"busBookings">,
  });

  if (booking === undefined) {
    return (
      <div className="max-w-[800px] mx-auto space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-8 text-center bg-[var(--surface)] border border-[var(--line)] rounded-[var(--r-lg)]">
        <p className="text-[15px] text-[var(--ink-muted)] mb-4">Reservation not found.</p>
        <Button asChild>
          <Link href="/bus">Back to Bus Reservations</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[860px] mx-auto">
      <PageHeader
        eyebrow="BUS RESERVATION DETAILS"
        title={`Destination: ${booking.destination}`}
        lead={`Reference: ${booking.reference} • Purpose: ${booking.purpose}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Union Bus", href: "/bus" },
          { label: booking.reference },
        ]}
        action={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/bus">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Reservations
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] border-b border-[var(--line)] pb-3">
                Trip Specification & Schedule
              </h3>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[14.5px]">
                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Departure Time & Location
                  </dt>
                  <dd className="font-medium text-[var(--ink)] mt-0.5">
                    {formatDateTime(booking.departureAt)}
                  </dd>
                  <dd className="text-[13px] text-[var(--ink-muted)]">
                    Pickup: {booking.departurePoint}
                  </dd>
                </div>

                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Return Time & Destination
                  </dt>
                  <dd className="font-medium text-[var(--ink)] mt-0.5">
                    {formatDateTime(booking.returnAt)}
                  </dd>
                  <dd className="text-[13px] text-[var(--ink-muted)]">
                    Destination: {booking.destination}
                  </dd>
                </div>

                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    Passenger Count
                  </dt>
                  <dd className="font-semibold text-[var(--union)] mt-0.5">
                    {booking.passengers} Passengers (Max Capacity 62)
                  </dd>
                </div>

                <div>
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)]">
                    On-Trip Contact
                  </dt>
                  <dd className="font-medium text-[var(--ink)] mt-0.5">
                    {booking.tripContactName} ({booking.tripContactPhone})
                  </dd>
                </div>

                <div className="sm:col-span-2 pt-3 border-t border-[var(--line)]">
                  <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] mb-1">
                    Mandatory Purpose & Reason Provided
                  </dt>
                  <dd className="text-[14px] leading-relaxed text-[var(--ink-body)] bg-[var(--canvas)] p-3 rounded-[var(--r-md)] border border-[var(--line)] whitespace-pre-line">
                    {booking.reason}
                  </dd>
                </div>

                {booking.extraRequirements && (
                  <div className="sm:col-span-2">
                    <dt className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] mb-1">
                      Logistical Requirements
                    </dt>
                    <dd className="text-[13.5px] text-[var(--ink-body)]">
                      {booking.extraRequirements}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Assigned Vehicle & Driver Info if Approved */}
          {["approved", "confirmed"].includes(booking.status) && (
            <Card className="border-[var(--success)] bg-[var(--success-soft)]/30">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-2 text-[var(--success)] font-semibold text-[16px]">
                  <CheckCircle2 className="h-5 w-5" /> Assigned Driver & Bus Details
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[14px]">
                  <div>
                    <span className="text-[12px] text-[var(--ink-muted)] uppercase block">
                      Assigned Driver
                    </span>
                    <span className="font-medium text-[var(--ink)]">
                      {booking.driverName || "Branch Senior Driver"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[12px] text-[var(--ink-muted)] uppercase block">
                      Driver Contact Phone
                    </span>
                    <a
                      href={`tel:${booking.driverPhone || "+254722000000"}`}
                      className="font-medium text-[var(--union)]"
                    >
                      {booking.driverPhone || "+254 722 000 000"}
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Col: Status Card */}
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

              {booking.contributionKes !== undefined && booking.contributionKes > 0 && (
                <div className="p-3 rounded-[var(--r-md)] bg-[var(--surface-sunk)] border border-[var(--line)]">
                  <span className="text-[11.5px] uppercase font-semibold text-[var(--ink-muted)] block">
                    Fuel & Contribution Fee
                  </span>
                  <span className="mono-ref text-[18px] font-bold text-[var(--ink)]">
                    {formatKES(booking.contributionKes)}
                  </span>
                </div>
              )}

              {booking.adminRemarks && (
                <div className="p-3 rounded-[var(--r-md)] bg-[var(--surface-sunk)] border border-[var(--line)] text-[13px] text-[var(--ink-body)]">
                  <strong>Branch Admin Remarks:</strong> {booking.adminRemarks}
                </div>
              )}

              <div className="border-t border-[var(--line)] pt-3 text-[13px] text-[var(--ink-muted)] space-y-1">
                <div>Requester: {booking.requesterName}</div>
                <div>School: {booking.school}</div>
                <div>Phone: {booking.phone}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
