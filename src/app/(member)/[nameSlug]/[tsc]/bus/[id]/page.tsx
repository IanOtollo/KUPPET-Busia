"use client";

import { use, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { BackLink } from "@/components/layout/BackLink";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatDateTime, formatKES } from "@/lib/format";
import { ArrowLeft, Bus, MapPin, Calendar, Phone, User, Info, CheckCircle2, Wallet, Hourglass } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { useMemberBasePath } from "@/lib/memberPath";

export default function BusBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const basePath = useMemberBasePath();
  const booking = useQuery(api.busBookings.getById, {
    id: resolvedParams.id as Id<"busBookings">,
  });
  const submitPayment = useMutation(api.busBookings.submitPayment);
  const [paymentRef, setPaymentRef] = useState("");
  const [paying, setPaying] = useState(false);

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    setPaying(true);
    try {
      await submitPayment({ id: booking._id, paymentReference: paymentRef });
      toast.success("Payment sent to the branch office for verification.");
      setPaymentRef("");
    } catch (err: unknown) {
      const error = err as { message?: string; data?: { message?: string } };
      toast.error(error.data?.message || error.message || "Could not submit your payment.");
    } finally {
      setPaying(false);
    }
  };

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
          <Link href={`${basePath}/bus`}>Back to Bus Reservations</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-[860px] mx-auto">
      <BackLink href={`${basePath}/bus`} label="Back to Reservations" />
      <PageHeader
        eyebrow="BUS RESERVATION DETAILS"
        title={`Destination: ${booking.destination}`}
        lead={`Reference: ${booking.reference} • Purpose: ${booking.purpose}`}
        breadcrumbs={[
          { label: "Dashboard", href: `${basePath}/dashboard` },
          { label: "Union Bus", href: `${basePath}/bus` },
          { label: booking.reference },
        ]}
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

          {/* Payment step: admin has approved and named the amount */}
          {booking.status === "awaiting_payment" && (
            <Card className="border-[var(--brass)] bg-[var(--brass-soft)]/40">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-2 text-[var(--ink)] font-semibold text-[16px]">
                  <Wallet className="h-5 w-5 text-[var(--brass)]" /> Your request is approved — payment required
                </div>
                <p className="text-[14px] text-[var(--ink-body)]">
                  Please pay{" "}
                  <strong className="mono-ref text-[18px] text-[var(--ink)]">
                    {formatKES(booking.contributionKes ?? 0)}
                  </strong>{" "}
                  to secure the bus. Once you have paid, enter the payment reference below so the branch office can verify it and release the bus.
                </p>
                {booking.adminRemarks && (
                  <p className="text-[13.5px] p-3 rounded-[var(--r-md)] bg-[var(--surface)] border border-[var(--line)]">
                    <strong>Payment details:</strong> {booking.adminRemarks}
                  </p>
                )}
                {booking.statusReason && (
                  <p className="text-[13.5px] p-3 rounded-[var(--r-md)] bg-[var(--danger-soft)] border border-[var(--danger)]/30 text-[var(--ink-body)]">
                    <strong>Previous payment not accepted:</strong> {booking.statusReason}
                  </p>
                )}
                <form onSubmit={handleSubmitPayment} className="flex flex-col sm:flex-row gap-3 sm:items-end">
                  <div className="flex-1">
                    <Label htmlFor="paymentRef">Payment reference (e.g. M-Pesa code)</Label>
                    <Input
                      id="paymentRef"
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="e.g. SJK3L9XQ2P"
                      maxLength={60}
                    />
                  </div>
                  <Button type="submit" loading={paying} loadingText="Sending…" disabled={!paymentRef.trim()}>
                    I have paid
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {booking.status === "payment_submitted" && (
            <Card className="border-[var(--info)]/40 bg-[var(--info-soft)]/40">
              <CardContent className="pt-6 flex items-start gap-3 text-[14px] text-[var(--ink-body)]">
                <Hourglass className="h-5 w-5 text-[var(--info)] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[var(--ink)] block">Payment awaiting verification</strong>
                  You reported paying {formatKES(booking.contributionKes ?? 0)}
                  {booking.paymentReference ? ` (ref ${booking.paymentReference})` : ""}. The branch office will verify it and release the bus. You will be notified.
                </span>
              </CardContent>
            </Card>
          )}

          {/* Assigned Vehicle & Driver Info if Approved */}
          {["approved", "confirmed"].includes(booking.status) && (
            <Card className="border-[var(--success)] bg-[var(--success-soft)]/30">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center gap-2 text-[var(--success)] font-semibold text-[16px]">
                  <CheckCircle2 className="h-5 w-5" /> {booking.status === "confirmed" ? "Bus released — driver & bus details" : "Assigned Driver & Bus Details"}
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
                    Amount to pay
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
