"use client";

import { use } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/data/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatDate, formatShortDate, formatKES } from "@/lib/format";
import { ArrowLeft, User, Calendar, MapPin, Phone, Building, FileCheck } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const STATUS_STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "verified", label: "Verified" },
  { key: "support_approved", label: "Approved" },
  { key: "disbursed", label: "Disbursed" },
];

export default function BereavementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const caseDoc = useQuery(api.bereavement.getById, {
    id: resolvedParams.id as Id<"bereavementCases">,
  });

  if (caseDoc === undefined) {
    return (
      <div className="max-w-[800px] mx-auto space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!caseDoc) {
    return (
      <div className="p-8 text-center bg-[var(--surface)] border border-[var(--line)] rounded-[var(--r-lg)]">
        <p className="text-[15px] text-[var(--ink-muted)] mb-4">Case record not found.</p>
        <Button asChild>
          <Link href="/bereavement">Back to Cases</Link>
        </Button>
      </div>
    );
  }

  // Determine current step index
  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === caseDoc.status);

  return (
    <div className="max-w-[860px] mx-auto">
      <PageHeader
        eyebrow="WELFARE CASE DETAILS"
        title={caseDoc.deceasedName}
        lead={`Case Reference: ${caseDoc.reference} • Relationship: ${caseDoc.relationship.toUpperCase()}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bereavement", href: "/bereavement" },
          { label: caseDoc.reference },
        ]}
        action={
          <Button variant="secondary" size="sm" asChild>
            <Link href="/bereavement">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to Cases
            </Link>
          </Button>
        }
      />

      {/* Progress Timeline */}
      {caseDoc.status !== "declined" && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h4 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] mb-4">
              Welfare Processing Timeline
            </h4>
            <div className="grid grid-cols-5 gap-2 text-center">
              {STATUS_STEPS.map((step, idx) => {
                const isPassed = currentStepIdx >= idx;
                const isCurrent = currentStepIdx === idx;
                return (
                  <div key={step.key} className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-semibold mb-1.5 transition-colors ${
                        isPassed
                          ? "bg-[var(--union)] text-white"
                          : "bg-[var(--surface-sunk)] text-[var(--ink-muted)] border border-[var(--line)]"
                      } ${isCurrent ? "ring-2 ring-[var(--brass)]" : ""}`}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={`text-[11.5px] ${
                        isPassed ? "font-semibold text-[var(--ink)]" : "text-[var(--ink-muted)]"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Case Details Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] border-b border-[var(--line)] pb-3">
                Deceased Record
              </h3>

              <div className="grid grid-cols-2 gap-4 text-[14.5px]">
                <div>
                  <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] block">
                    Deceased Full Name
                  </span>
                  <span className="font-medium text-[var(--ink)]">{caseDoc.deceasedName}</span>
                </div>

                <div>
                  <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] block">
                    Recognised Relationship
                  </span>
                  <span className="font-semibold text-[var(--brass)] uppercase">
                    {caseDoc.relationship}
                  </span>
                </div>

                <div>
                  <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] block">
                    Date of Bereavement
                  </span>
                  <span>{formatDate(caseDoc.dateOfBereavement)}</span>
                </div>

                {caseDoc.burialDate && (
                  <div>
                    <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] block">
                      Burial / Service Date
                    </span>
                    <span>{formatDate(caseDoc.burialDate)}</span>
                  </div>
                )}

                {caseDoc.burialPlace && (
                  <div className="col-span-2">
                    <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] block">
                      Funeral Location / Place of Burial
                    </span>
                    <span>{caseDoc.burialPlace}</span>
                  </div>
                )}

                {caseDoc.details && (
                  <div className="col-span-2 pt-2 border-t border-[var(--line)]">
                    <span className="text-[12px] uppercase font-semibold text-[var(--ink-muted)] block mb-1">
                      Additional Details
                    </span>
                    <p className="text-[14px] leading-relaxed text-[var(--ink-body)]">
                      {caseDoc.details}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <h4 className="text-[13.5px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
                Case Status
              </h4>

              <div className="flex items-center justify-between">
                <StatusBadge status={caseDoc.status} />
                <span className="mono-ref text-[12.5px] text-[var(--ink-muted)]">
                  {caseDoc.reference}
                </span>
              </div>

              {caseDoc.supportAmount && (
                <div className="p-3 rounded-[var(--r-md)] bg-[var(--success-soft)] border border-[var(--success)] text-center">
                  <span className="text-[11.5px] uppercase font-semibold text-[var(--success)] block">
                    Approved Welfare Support
                  </span>
                  <span className="mono-ref text-[20px] font-bold text-[var(--success)]">
                    {formatKES(caseDoc.supportAmount)}
                  </span>
                </div>
              )}

              {caseDoc.statusReason && (
                <div className="p-3 rounded-[var(--r-md)] bg-[var(--surface-sunk)] border border-[var(--line)] text-[13px] text-[var(--ink-body)]">
                  <strong>Branch Note:</strong> {caseDoc.statusReason}
                </div>
              )}

              <div className="border-t border-[var(--line)] pt-3 text-[13px] text-[var(--ink-muted)] space-y-2">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 shrink-0" />
                  <span>{caseDoc.school}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{caseDoc.subCounty} Sub-County</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{caseDoc.phone}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
