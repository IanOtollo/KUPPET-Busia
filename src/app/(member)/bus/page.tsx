"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { DataTable, Column } from "@/components/data/DataTable";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/data/StatusBadge";
import { EmptyState } from "@/components/data/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatShortDate } from "@/lib/format";
import { Bus, Plus, Calendar as CalendarIcon, Info, ChevronRight } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";

export default function MemberBusPage() {
  const bookings = useQuery(api.busBookings.listMine);
  const calendarData = useQuery(api.busBookings.getAvailabilityCalendar);

  const columns: Column<Doc<"busBookings">>[] = [
    {
      key: "reference",
      header: "Reference",
      isMono: true,
      className: "w-36",
    },
    {
      key: "purpose",
      header: "Purpose & Destination",
      render: (item) => (
        <div>
          <span className="font-semibold text-[var(--ink)] block">
            {item.destination}
          </span>
          <span className="text-[12px] text-[var(--ink-muted)]">
            {item.purpose} • {item.passengers} Passengers
          </span>
        </div>
      ),
    },
    {
      key: "departureAt",
      header: "Departure",
      render: (item) => formatDateTime(item.departureAt),
    },
    {
      key: "returnAt",
      header: "Return",
      render: (item) => formatDateTime(item.returnAt),
    },
    {
      key: "status",
      header: "Status",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right w-24",
      render: (item) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/bus/${item._id}`}>
            View <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="UNION SERVICES"
        title="Branch Bus Reservations"
        lead="Reserve the KUPPET Busia bus branch bus for academic trips, union meetings, sports events, or funeral transportation."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Union Bus" },
        ]}
        action={
          <Button asChild>
            <Link href="/bus/new">
              <Plus className="h-4 w-4 mr-1.5" /> Book the Union Bus
            </Link>
          </Button>
        }
      />

      {/* Admin final approval disclaimer */}
      <div className="p-4 rounded-[var(--r-md)] bg-[var(--brass-soft)] border border-[var(--brass)]/30 mb-8 flex items-start gap-3">
        <Info className="h-5 w-5 text-[var(--brass)] shrink-0 mt-0.5" />
        <div className="text-[13.5px] leading-relaxed text-[var(--ink-body)]">
          <strong className="font-semibold text-[var(--ink)]">
            Booking & Availability Notice:
          </strong>{" "}
          Final approval and vehicle availability are confirmed by the branch administrator. Requests require a minimum 3-day notice period.
        </div>
      </div>

      {/* Calendar Legend & Availability Strip */}
      <div className="p-5 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] mb-8 shadow-[var(--shadow-hair)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-[var(--union)]" />
            <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)]">
              Branch Bus Calendar Status
            </h3>
          </div>
          <div className="flex items-center gap-4 text-[12.5px]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[var(--surface-sunk)] border border-[var(--line-strong)]" />
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[var(--warning-soft)] border border-[var(--warning)]" />
              Requested
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[var(--danger-soft)] border border-[var(--danger)]" />
              Booked / Confirmed
            </span>
          </div>
        </div>

        {/* 14-day upcoming slot preview */}
        {calendarData && calendarData.length > 0 ? (
          <div className="space-y-2">
            <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] block">
              Upcoming Reserved Schedules:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {calendarData.slice(0, 6).map(
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
                  className={`p-3 rounded-[var(--r-md)] border text-[13px] ${
                    ["approved", "confirmed"].includes(slot.status)
                      ? "bg-[var(--danger-soft)] border-[var(--danger)]/30 text-[var(--danger)]"
                      : "bg-[var(--warning-soft)] border-[var(--warning)]/30 text-[var(--warning)]"
                  }`}
                >
                  <div className="font-semibold">{slot.destination}</div>
                  <div className="text-[12px] opacity-90 mt-0.5">
                    {formatShortDate(slot.departureAt)} – {formatShortDate(slot.returnAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[13.5px] text-[var(--ink-muted)]">
            The union bus is currently unreserved for the upcoming period. Submit your booking request early.
          </p>
        )}
      </div>

      {/* Loading state */}
      {bookings === undefined && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {bookings !== undefined && bookings.length === 0 && (
        <EmptyState
          icon={Bus}
          title="No bus booking requests yet"
          description="Kama member unataka kubook bus ya union kwa function yeyote, wasilisha maombi hapa na ueleze sababu."
          actionLabel="Request Bus Reservation"
          actionHref="/bus/new"
        />
      )}

      {/* Bookings Table */}
      {bookings !== undefined && bookings.length > 0 && (
        <DataTable
          columns={columns}
          data={bookings}
          keyExtractor={(item) => item._id}
        />
      )}
    </div>
  );
}

