"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatShortDate } from "@/lib/format";

export type CalendarSlot = {
  id: string;
  reference: string;
  requesterName: string;
  departureAt: string;
  returnAt: string;
  destination: string;
  status: string;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const slotTone = (status: string) =>
  ["approved", "confirmed"].includes(status)
    ? "bg-[var(--success-soft)] border-[var(--success)]/50 text-[var(--ink)]"
    : status === "completed"
      ? "bg-[var(--surface-sunk)] border-[var(--line-strong)] text-[var(--ink-muted)]"
      : "bg-[var(--warning-soft)] border-[var(--warning)]/50 text-[var(--ink)]";

const pad = (n: number) => String(n).padStart(2, "0");

/** Month grid of every bus booking (past and upcoming). Hover a date to see its trips. */
export function BusCalendar({
  slots,
  onOpen,
}: {
  slots: CalendarSlot[] | undefined;
  onOpen: (id: string) => void;
}) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  if (slots === undefined) return <Skeleton className="h-96 w-full" />;

  const first = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7; // Monday-first
  const cells: (number | null)[] = [
    ...Array(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const slotsOn = (key: string) =>
    slots.filter((s) => s.departureAt.slice(0, 10) <= key && s.returnAt.slice(0, 10) >= key);

  const move = (delta: number) =>
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const monthLabel = first.toLocaleDateString("en-KE", { month: "long", year: "numeric" });

  return (
    <div className="p-4 sm:p-6 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-panel)]">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => move(-1)} aria-label="Previous month">
            ‹
          </Button>
          <h3 className="font-serif text-[20px] font-semibold text-[var(--ink)] min-w-[170px] text-center">
            {monthLabel}
          </h3>
          <Button variant="secondary" size="sm" onClick={() => move(1)} aria-label="Next month">
            ›
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}
          >
            Today
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[13px]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[var(--warning-soft)] border border-[var(--warning)]" />
            Pending / awaiting payment
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[var(--success-soft)] border border-[var(--success)]" />
            Confirmed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[var(--surface-sunk)] border border-[var(--line-strong)]" />
            Completed
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-7 text-center text-[12px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-1">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-[var(--line)] border border-[var(--line)] rounded-[var(--r-md)]">
            {cells.map((day, idx) => {
              if (day === null) return <div key={`e-${idx}`} className="bg-[var(--canvas)] min-h-[88px]" />;
              const key = `${cursor.year}-${pad(cursor.month + 1)}-${pad(day)}`;
              const daySlots = slotsOn(key);
              const column = idx % 7;
              return (
                <div
                  key={key}
                  className={`group relative bg-[var(--surface)] min-h-[88px] p-1.5 ${
                    daySlots.length ? "hover:z-20" : ""
                  }`}
                >
                  <span
                    className={`text-[12.5px] font-medium inline-flex h-6 w-6 items-center justify-center rounded-full ${
                      key === todayKey ? "bg-[var(--union)] text-white" : "text-[var(--ink-body)]"
                    }`}
                  >
                    {day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {daySlots.slice(0, 2).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => onOpen(s.id)}
                        className={`w-full truncate rounded border px-1.5 py-0.5 text-left text-[11px] cursor-pointer ${slotTone(s.status)}`}
                      >
                        {s.destination}
                      </button>
                    ))}
                    {daySlots.length > 2 && (
                      <span className="text-[11px] text-[var(--ink-muted)]">+{daySlots.length - 2} more</span>
                    )}
                  </div>

                  {daySlots.length > 0 && (
                    <div
                      role="tooltip"
                      className={`pointer-events-none absolute top-full z-30 mt-1 hidden w-64 rounded-[var(--r-md)] border border-[var(--line-strong)] bg-[var(--surface)] p-3 text-[12.5px] shadow-[var(--shadow-panel)] group-hover:block ${
                        column > 3 ? "right-0" : "left-0"
                      }`}
                    >
                      <div className="mb-2 font-semibold text-[var(--ink)]">
                        {formatShortDate(key)} — {daySlots.length} {daySlots.length === 1 ? "trip" : "trips"}
                      </div>
                      <div className="space-y-2.5">
                        {daySlots.map((s) => (
                          <div key={s.id} className="border-t border-[var(--line)] pt-2 first:border-0 first:pt-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="mono-ref font-semibold text-[var(--ink)]">{s.reference}</span>
                              <StatusBadge status={s.status} />
                            </div>
                            <div className="font-medium text-[var(--ink)] mt-0.5">{s.destination}</div>
                            <div className="text-[var(--ink-muted)]">{s.requesterName}</div>
                            <div className="text-[var(--ink-muted)]">
                              {formatShortDate(s.departureAt)} → {formatShortDate(s.returnAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {slots.length === 0 && (
        <p className="text-[14px] text-[var(--ink-muted)] pt-4 text-center">No bus bookings recorded yet.</p>
      )}
    </div>
  );
}
