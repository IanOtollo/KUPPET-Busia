"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDateTime, formatShortDate, formatKES } from "@/lib/format";
import { Bus, Calendar as CalendarIcon, CheckCircle2, ChevronRight, AlertTriangle } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { BUS_BOOKING_STATUSES, BUS_TRANSITIONS, BUS_STATUS_LABELS, BusBookingStatus } from "@/lib/constants";
import { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { toast } from "sonner";

export default function AdminBusPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"queue" | "calendar">("queue");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const queryStatus = selectedStatus === "all" ? undefined : (selectedStatus as BusBookingStatus);

  const bookings = useQuery(api.busBookings.listAllAdmin, { status: queryStatus });
  const calendarSlots = useQuery(api.busBookings.getAvailabilityCalendar);
  const updateStatusMutation = useMutation(api.busBookings.updateStatus);

  // Approval Modal State
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Doc<"busBookings"> | null>(null);
  const [actionStatus, setActionStatus] = useState<BusBookingStatus>("approved");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [contributionKes, setContributionKes] = useState("");
  const [adminRemarks, setAdminRemarks] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAction = (booking: Doc<"busBookings">) => {
    const legalNext = BUS_TRANSITIONS[booking.status] ?? [];
    setSelectedBooking(booking);
    setActionStatus((legalNext[0] as BusBookingStatus) || booking.status as BusBookingStatus);
    setDriverName(booking.driverName || "");
    setDriverPhone(booking.driverPhone || "");
    setContributionKes(booking.contributionKes ? String(booking.contributionKes) : "");
    setAdminRemarks(booking.adminRemarks || "");
    setStatusReason(booking.statusReason || "");
    setApprovalModalOpen(true);
  };

  const handleApplyStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking) return;

    if (actionStatus === "declined" && !statusReason.trim()) {
      toast.error("Please give a reason for declining this booking.");
      return;
    }
    if (actionStatus === "awaiting_payment") {
      if (!(parseFloat(contributionKes) > 0)) {
        toast.error("Enter the amount the member must pay.");
        return;
      }
      if (selectedBooking.status === "payment_submitted" && !statusReason.trim()) {
        toast.error("Say why the payment was not accepted.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await updateStatusMutation({
        id: selectedBooking._id,
        newStatus: actionStatus,
        statusReason: statusReason.trim() || undefined,
        driverName: driverName.trim() || undefined,
        driverPhone: driverPhone.trim() || undefined,
        contributionKes: contributionKes ? parseFloat(contributionKes) : undefined,
        adminRemarks: adminRemarks.trim() || undefined,
      });

      toast.success(
        actionStatus === "awaiting_payment"
          ? "Approved. The member has been told how much to pay."
          : actionStatus === "confirmed"
            ? "Payment confirmed. The bus is released to the member."
            : `Booking ${actionStatus.replace(/_/g, " ")} successfully.`
      );
      setApprovalModalOpen(false);
    } catch (err: unknown) {
      const error = err as { message?: string; data?: { message?: string } };
      toast.error(error.data?.message || error.message || "Failed to update bus booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<Doc<"busBookings">>[] = [
    {
      key: "reference",
      header: "Reference",
      isMono: true,
      className: "w-36",
    },
    {
      key: "requesterName",
      header: "Requester & School",
      render: (item) => (
        <div>
          <span className="font-semibold text-[var(--ink)] block">
            {item.requesterName}
          </span>
          <span className="text-[12px] text-[var(--ink-muted)]">
            {item.school} • {item.phone}
          </span>
        </div>
      ),
    },
    {
      key: "destination",
      header: "Trip Purpose & Destination",
      render: (item) => (
        <div>
          <span className="font-medium text-[var(--ink)] block">
            {item.destination}
          </span>
          <span className="text-[12px] text-[var(--ink-muted)]">
            {item.purpose} • {item.passengers} Seats
          </span>
        </div>
      ),
    },
    {
      key: "departureAt",
      header: "Dates",
      render: (item) => (
        <div className="text-[13px]">
          <div>Dep: {formatShortDate(item.departureAt)}</div>
          <div className="text-[var(--ink-muted)]">Ret: {formatShortDate(item.returnAt)}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-28",
      render: (item) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenAction(item);
            }}
          >
            Action
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="FLEET & ASSET MANAGEMENT"
        title="Union Bus Reservations Queue"
        lead="Manage member bus booking requests, inspect date conflicts, assign official drivers, and record fuel contributions."
        breadcrumbs={[
          { label: "Admin Operations", href: "/admin" },
          { label: "Bus Reservations" },
        ]}
        action={
          <div className="flex items-center gap-2 border border-[var(--line)] rounded-[var(--r-md)] bg-[var(--surface)] p-1">
            <button
              onClick={() => setActiveTab("queue")}
              className={`px-3 py-1.5 rounded-[var(--r-sm)] text-[13px] font-medium transition-colors cursor-pointer ${
                activeTab === "queue"
                  ? "bg-[var(--union)] text-white font-semibold"
                  : "text-[var(--ink-body)] hover:bg-[var(--surface-sunk)]"
              }`}
            >
              Reservation Queue
            </button>
            <button
              onClick={() => setActiveTab("calendar")}
              className={`px-3 py-1.5 rounded-[var(--r-sm)] text-[13px] font-medium transition-colors cursor-pointer ${
                activeTab === "calendar"
                  ? "bg-[var(--union)] text-white font-semibold"
                  : "text-[var(--ink-body)] hover:bg-[var(--surface-sunk)]"
              }`}
            >
              Calendar Schedule
            </button>
          </div>
        }
      />

      {activeTab === "queue" && (
        <div>
          {/* Filter Bar */}
          <div className="flex items-center gap-3 p-4 rounded-[var(--r-md)] bg-[var(--surface)] border border-[var(--line)] mb-6 shadow-[var(--shadow-hair)]">
            <span className="text-[13px] font-semibold text-[var(--ink)]">Filter Status:</span>
            <div className="w-48">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {BUS_BOOKING_STATUSES.map((st) => (
                    <SelectItem key={st} value={st} className="capitalize">
                      {st.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {bookings === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={bookings || []}
              keyExtractor={(item) => item._id}
              emptyMessage="No bus booking requests match the current filter."
              onRowClick={(item) => handleOpenAction(item)}
            />
          )}
        </div>
      )}

      {activeTab === "calendar" && (
        <div className="p-6 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-panel)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-serif text-[20px] font-semibold text-[var(--ink)]">
              Fleet Occupation Calendar
            </h3>
            <div className="flex items-center gap-4 text-[13px]">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[var(--warning-soft)] border border-[var(--warning)]" />
                Requested
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[var(--success-soft)] border border-[var(--success)]" />
                Confirmed / Approved
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {calendarSlots?.map(
              (slot: {
                id: string;
                reference: string;
                departureAt: string;
                returnAt: string;
                destination: string;
                status: string;
              }) => (
                <div
                key={slot.id}
                onClick={() => router.push(`/admin/bus/${slot.id}`)}
                className={`p-4 rounded-[var(--r-md)] border cursor-pointer transition-colors ${
                  ["approved", "confirmed"].includes(slot.status)
                    ? "bg-[var(--success-soft)] border-[var(--success)]/40 hover:border-[var(--success)]"
                    : "bg-[var(--warning-soft)] border-[var(--warning)]/40 hover:border-[var(--warning)]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="mono-ref text-[12px] font-semibold text-[var(--ink)]">
                    {slot.reference}
                  </span>
                  <StatusBadge status={slot.status} />
                </div>
                <h4 className="font-semibold text-[15px] text-[var(--ink)]">
                  {slot.destination}
                </h4>
                <div className="text-[12.5px] text-[var(--ink-body)] mt-2">
                  Departure: {formatShortDate(slot.departureAt)}
                </div>
                <div className="text-[12.5px] text-[var(--ink-body)]">
                  Return: {formatShortDate(slot.returnAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adjudication / Approval Modal */}
      {selectedBooking && (
        <Dialog open={approvalModalOpen} onOpenChange={setApprovalModalOpen}>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <span className="eyebrow block mb-1">BUS RESERVATION ACTION</span>
              <DialogTitle>
                {selectedBooking.destination} ({selectedBooking.reference})
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleApplyStatus} className="space-y-4 py-2">
              <div className="p-3 bg-[var(--surface-sunk)] border border-[var(--line)] rounded-[var(--r-md)] text-[13.5px] space-y-1">
                <div><strong>Requester:</strong> {selectedBooking.requesterName} ({selectedBooking.school})</div>
                <div><strong>Passengers:</strong> {selectedBooking.passengers} seats</div>
                <div><strong>Trip Dates:</strong> {formatDateTime(selectedBooking.departureAt)} to {formatDateTime(selectedBooking.returnAt)}</div>
                <div><strong>Reason:</strong> {selectedBooking.reason}</div>
                {selectedBooking.status === "payment_submitted" && (
                  <div className="pt-1 mt-1 border-t border-[var(--line)]">
                    <strong>Member reports paying:</strong> {formatKES(selectedBooking.contributionKes ?? 0)} — ref{" "}
                    <span className="mono-ref">{selectedBooking.paymentReference}</span>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="actionStatus">Action Status</Label>
                <Select
                  value={actionStatus}
                  onValueChange={(val: BusBookingStatus) => setActionStatus(val)}
                >
                  <SelectTrigger id="actionStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(BUS_TRANSITIONS[selectedBooking.status] ?? []).map((st) => (
                      <SelectItem key={st} value={st} className="capitalize">
                        {BUS_STATUS_LABELS[st] ?? st.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {actionStatus === "awaiting_payment" && (
                <>
                  <div>
                    <Label htmlFor="kes">
                      Amount the member must pay (KES) <span className="text-[var(--danger)]">*</span>
                    </Label>
                    <Input
                      id="kes"
                      type="number"
                      min={1}
                      value={contributionKes}
                      onChange={(e) => setContributionKes(e.target.value)}
                      placeholder="15000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="remarks" optional>Payment instructions</Label>
                    <Input
                      id="remarks"
                      value={adminRemarks}
                      onChange={(e) => setAdminRemarks(e.target.value)}
                      placeholder="e.g. M-Pesa Paybill 123456, account: your TSC number"
                    />
                  </div>
                  {selectedBooking.status === "payment_submitted" && (
                    <div>
                      <Label htmlFor="rejectReason">
                        Why was the payment not accepted? <span className="text-[var(--danger)]">*</span>
                      </Label>
                      <Textarea
                        id="rejectReason"
                        rows={2}
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        placeholder="e.g. Amount received was less than required"
                      />
                    </div>
                  )}
                </>
              )}

              {["approved", "confirmed"].includes(actionStatus) && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="drvName">Assigned Senior Driver</Label>
                      <Input
                        id="drvName"
                        value={driverName}
                        onChange={(e) => setDriverName(e.target.value)}
                        placeholder="e.g. John Barasa"
                      />
                    </div>
                    <div>
                      <Label htmlFor="drvPhone">Driver Mobile Phone</Label>
                      <Input
                        id="drvPhone"
                        value={driverPhone}
                        onChange={(e) => setDriverPhone(e.target.value)}
                        placeholder="+2547XXXXXXXX"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="remarks" optional>Admin Remarks / Boarding Notes</Label>
                    <Input
                      id="remarks"
                      value={adminRemarks}
                      onChange={(e) => setAdminRemarks(e.target.value)}
                      placeholder="e.g. Report to secretariat by 6:00 AM for bus inspection"
                    />
                  </div>
                </>
              )}

              {actionStatus === "declined" && (
                <div>
                  <Label htmlFor="reason">
                    Decline Reason <span className="text-[var(--danger)]">*</span>
                  </Label>
                  <Textarea
                    id="reason"
                    rows={3}
                    required
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="Required: tell the member why the request cannot be accommodated…"
                  />
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setApprovalModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isSubmitting}
                  loadingText="Processing…"
                >
                  {actionStatus === "awaiting_payment"
                    ? "Approve & request payment"
                    : actionStatus === "confirmed"
                      ? "Confirm payment & release bus"
                      : "Apply"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

