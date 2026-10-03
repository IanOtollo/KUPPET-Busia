"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NativeSelect } from "@/components/ui/native-select";
import { formatShortDate, formatRelativeTime, formatStay } from "@/lib/format";
import { SUB_COUNTIES } from "@/lib/constants";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

export default function AdminTransfersPage() {
  const [tab, setTab] = useState<"cases" | "swaps">("cases");

  return (
    <div>
      <PageHeader
        eyebrow="MEMBER MOVEMENT"
        title="Transfers & School Swaps"
        lead="Transfer cases reported by teachers (with how long they served at the school they left) and teachers looking to swap schools."
        breadcrumbs={[{ label: "Admin Operations", href: "/admin" }, { label: "Transfers & Swaps" }]}
      />

      <div
        role="tablist"
        className="inline-flex items-center gap-1 border border-[var(--line)] rounded-[var(--r-md)] bg-[var(--surface)] p-1 mb-6"
      >
        {(
          [
            ["cases", "Transfer Cases"],
            ["swaps", "School Swaps"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-[var(--r-sm)] text-[13.5px] font-medium transition-colors cursor-pointer ${
              tab === key
                ? "bg-[var(--union)] text-white font-semibold"
                : "text-[var(--ink-body)] hover:bg-[var(--surface-sunk)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "cases" ? <Cases /> : <Swaps />}
    </div>
  );
}

function Cases() {
  const transfers = useQuery(api.transfers.listAll, {});
  const acknowledge = useMutation(api.transfers.acknowledge);

  if (transfers === undefined) return <Skeleton className="h-64 w-full" />;
  if (transfers.length === 0) {
    return <p className="text-[14px] text-[var(--ink-muted)]">No transfer cases have been reported yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]">
      <table className="w-full text-[13.5px]">
        <thead className="bg-[var(--surface-sunk)] text-left text-[12px] uppercase tracking-wider text-[var(--ink-muted)]">
          <tr>
            <th className="px-4 py-3">Teacher</th>
            <th className="px-4 py-3">Move</th>
            <th className="px-4 py-3">Length of stay at previous school</th>
            <th className="px-4 py-3">Reported</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {transfers.map((t) => (
            <tr key={t._id}>
              <td className="px-4 py-3">
                <span className="font-semibold text-[var(--ink)] block">{t.memberName}</span>
                <span className="mono-ref text-[12px] text-[var(--ink-muted)]">{t.tscNumber}</span>
              </td>
              <td className="px-4 py-3">
                <span className="block">
                  {t.fromSchool} → {t.toSchool}
                </span>
                <span className="text-[12px] text-[var(--ink-muted)]">
                  {t.fromSubCounty} → {t.toSubCounty}
                  {t.fromDesignation !== t.toDesignation ? ` • ${t.fromDesignation} → ${t.toDesignation}` : ""}
                </span>
              </td>
              <td className="px-4 py-3 font-semibold text-[var(--union)]">
                {t.fromSchool === t.toSchool ? "—" : formatStay(t.previousStayDays)}
              </td>
              <td className="px-4 py-3 text-[var(--ink-muted)]">{formatShortDate(new Date(t.createdAt).toISOString())}</td>
              <td className="px-4 py-3 text-right">
                {t.acknowledgedAt ? (
                  <span className="text-[12px] text-[var(--ink-muted)]">Reviewed</span>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await acknowledge({ id: t._id as Id<"transfers"> });
                      } catch {
                        toast.error("Could not mark as reviewed.");
                      }
                    }}
                  >
                    Mark reviewed
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Swaps() {
  const swaps = useQuery(api.swaps.listOpen);
  const close = useMutation(api.swaps.close);
  const [filter, setFilter] = useState("all");

  if (swaps === undefined) return <Skeleton className="h-64 w-full" />;

  const rows = swaps.filter((s) => filter === "all" || s.targetSubCounty === filter || s.subCounty === filter);

  return (
    <div className="space-y-4">
      <div className="w-60">
        <NativeSelect value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by sub-county">
          <option value="all">All sub-counties</option>
          {SUB_COUNTIES.map((sc) => (
            <option key={sc} value={sc}>
              {sc}
            </option>
          ))}
        </NativeSelect>
      </div>

      {rows.length === 0 ? (
        <p className="text-[14px] text-[var(--ink-muted)]">No open swap requests.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--surface)]">
          <table className="w-full text-[13.5px]">
            <thead className="bg-[var(--surface-sunk)] text-left text-[12px] uppercase tracking-wider text-[var(--ink-muted)]">
              <tr>
                <th className="px-4 py-3">Teacher</th>
                <th className="px-4 py-3">Now at</th>
                <th className="px-4 py-3">Wants</th>
                <th className="px-4 py-3">Subjects</th>
                <th className="px-4 py-3">Posted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {rows.map((s) => (
                <tr key={s._id}>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-[var(--ink)] block">
                      {s.memberName}
                      {s.jobGroup ? ` • ${s.jobGroup}` : ""}
                    </span>
                    <span className="text-[12px] text-[var(--ink-muted)]">
                      {s.tscNumber} • {s.phone}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {s.school}
                    <span className="block text-[12px] text-[var(--ink-muted)]">{s.subCounty}</span>
                  </td>
                  <td className="px-4 py-3">
                    {s.targetSubCounty}
                    {s.targetSchool && <span className="block text-[12px] text-[var(--ink-muted)]">{s.targetSchool}</span>}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-body)]">{s.subjects.join(", ")}</td>
                  <td className="px-4 py-3 text-[var(--ink-muted)]">{formatRelativeTime(s.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        try {
                          await close({ id: s._id as Id<"swapRequests"> });
                          toast.success("Swap request closed.");
                        } catch {
                          toast.error("Could not close the request.");
                        }
                      }}
                    >
                      Close
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
