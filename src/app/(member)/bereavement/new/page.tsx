"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent } from "@/components/ui/card";
import {
  SUB_COUNTIES,
  BEREAVEMENT_RELATIONSHIPS,
  BereavementRelationship,
  SubCounty,
} from "@/lib/constants";
import { toast } from "sonner";
import { Info, CheckCircle2, ArrowRight, Home, FileText } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

const bereavementFormSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  tscNumber: z.string().min(1, "TSC Number is required"),
  school: z.string().min(3, "School is required"),
  subCounty: z.enum(SUB_COUNTIES, {
    errorMap: () => ({ message: "Select sub-county" }),
  }),
  phone: z.string().regex(/^(?:\+254|0)?(7\d{8}|1\d{8})$/, "Valid phone required"),
  relationship: z.enum(["mother", "father", "spouse", "child"], {
    errorMap: () => ({
      message:
        "The union only recognises bereavement for mother, father, spouse, or child.",
    }),
  }),
  deceasedName: z.string().min(3, "Deceased name is required").max(80),
  dateOfBereavement: z.string().refine((val) => {
    const d = new Date(val);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 180;
  }, "Date must not be in the future and cannot exceed 180 days ago"),
  burialPlace: z.string().max(120).optional(),
  burialDate: z.string().optional(),
  details: z.string().max(700, "Maximum 700 characters allowed").optional(),
});

type BereavementFormData = z.infer<typeof bereavementFormSchema>;

export default function NewBereavementPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReference, setCreatedReference] = useState<string | null>(null);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  const createCase = useMutation(api.bereavement.create);
  const userProfile = useQuery(api.users.getMyProfile);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BereavementFormData>({
    resolver: zodResolver(bereavementFormSchema),
    defaultValues: {
      fullName: userProfile?.fullName || "Member Teacher",
      tscNumber: userProfile?.tscNumber || "TSC-BUSIA",
      school: userProfile?.school || "",
      subCounty: userProfile?.subCounty || "Matayos",
      phone: userProfile?.phone || "+254700000000",
      relationship: "mother",
      deceasedName: "",
      dateOfBereavement: new Date().toISOString().split("T")[0],
      details: "",
    },
  });

  const detailsValue = watch("details") || "";

  const onSubmit = async (data: BereavementFormData) => {
    setIsSubmitting(true);
    try {
      const res = await createCase({
        relationship: data.relationship as BereavementRelationship,
        deceasedName: data.deceasedName,
        dateOfBereavement: data.dateOfBereavement,
        burialPlace: data.burialPlace,
        burialDate: data.burialDate,
        details: data.details,
        school: data.school,
        subCounty: data.subCounty as SubCounty,
        phone: data.phone,
        documentIds: [],
      });

      setCreatedReference(res.reference);
      setCreatedCaseId(res.caseId);
      toast.success("Bereavement case submitted successfully.");
    } catch (err: unknown) {
      const error = err as { message?: string; data?: { message?: string } };
      toast.error(
        error.data?.message || error.message || "Failed to submit bereavement claim."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmation Screen on Success
  if (createdReference && createdCaseId) {
    return (
      <div className="max-w-[640px] mx-auto py-8">
        <div className="p-6 sm:p-8 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-panel)] text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--success-soft)] text-[var(--success)] flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 stroke-[2]" />
          </div>

          <span className="eyebrow block mb-2">CLAIM REGISTERED</span>
          <h2 className="font-serif text-[26px] sm:text-[32px] font-bold text-[var(--ink)] mb-2">
            Bereavement Case Received
          </h2>
          <p className="text-[15px] text-[var(--ink-muted)] mb-6">
            Your bereavement notification has been registered in the branch welfare system.
          </p>

          <div className="p-4 rounded-[var(--r-md)] bg-[var(--surface-sunk)] border border-[var(--line)] mb-6 text-center">
            <span className="text-[12px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold block">
              Official Reference Code
            </span>
            <span className="mono-ref text-[20px] sm:text-[24px] font-bold text-[var(--union)] block mt-1">
              {createdReference}
            </span>
          </div>

          {/* What happens next 3-step list */}
          <div className="text-left border-t border-[var(--line)] pt-6 mb-8">
            <h4 className="font-serif text-[16px] font-semibold text-[var(--ink)] mb-4">
              What happens next:
            </h4>
            <div className="space-y-4 text-[14px]">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--union)] text-white font-semibold text-[12px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <div>
                  <strong className="text-[var(--ink)] block">Branch Secretariat Verification</strong>
                  <span className="text-[var(--ink-muted)]">
                    The welfare officer verifies your active union membership records and relationship eligibility.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--union)] text-white font-semibold text-[12px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <div>
                  <strong className="text-[var(--ink)] block">Welfare Committee Approval</strong>
                  <span className="text-[var(--ink-muted)]">
                    The Executive Secretary and Treasurer review the claim and allocate approved bereavement relief.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[var(--union)] text-white font-semibold text-[12px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <div>
                  <strong className="text-[var(--ink)] block">Disbursement & Condolences</strong>
                  <span className="text-[var(--ink-muted)]">
                    The branch office coordinates with your sub-county representative and disburses welfare to your contact number.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link href={`/bereavement/${createdCaseId}`}>
                <FileText className="h-4 w-4 mr-1.5" /> View Case Record
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-1.5" /> Return to Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto">
      <PageHeader
        eyebrow="REPORT BEREAVEMENT"
        title="File a Bereavement Welfare Claim"
        lead="Submit bereavement details for union welfare intervention. All reports are verified against branch welfare constitutional provisions."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Bereavement", href: "/bereavement" },
          { label: "New Claim" },
        ]}
      />

      {/* Mandatory Dual-Language Policy Notice */}
      <div className="p-4 rounded-[var(--r-md)] bg-[var(--info-soft)] border border-[var(--info)]/20 mb-8 flex items-start gap-3.5">
        <Info className="h-5 w-5 text-[var(--info)] shrink-0 mt-0.5" />
        <div className="text-[14px] leading-relaxed text-[var(--ink-body)]">
          <p className="font-semibold text-[var(--ink)]">
            Branch Welfare Policy (Sera ya Ustawi wa Tawi):
          </p>
          <p className="text-[var(--ink-muted)] mt-0.5">
            The branch recognises bereavement support for a member's <strong>mother, father, spouse, or child only</strong>. / Tawi hutoa msaada wa msiba kwa mama, baba, mke/mume, au mtoto wa mwanachama pekee.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Member Identification */}
            <div>
              <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-4">
                1. Member Identification
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Member Full Name</Label>
                  <Input
                    id="fullName"
                    disabled
                    value={userProfile?.fullName || "Active Member"}
                    className="bg-[var(--surface-sunk)]"
                  />
                </div>

                <div>
                  <Label htmlFor="tsc">TSC / Membership Number</Label>
                  <Input
                    id="tsc"
                    disabled
                    value={userProfile?.tscNumber || "TSC-RECORD"}
                    className="bg-[var(--surface-sunk)]"
                  />
                </div>

                <div>
                  <Label htmlFor="school">Current School / Institution</Label>
                  <Input
                    id="school"
                    error={!!errors.school}
                    {...register("school")}
                  />
                  {errors.school && (
                    <p className="text-[13px] text-[var(--danger)] mt-1">
                      {errors.school.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="subCounty">Sub-County</Label>
                  <Select
                    defaultValue={userProfile?.subCounty || "Matayos"}
                    onValueChange={(val) =>
                      setValue("subCounty", val as SubCounty, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger id="subCounty" error={!!errors.subCounty}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUB_COUNTIES.map((sc) => (
                        <SelectItem key={sc} value={sc}>
                          {sc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.subCounty && (
                    <p className="text-[13px] text-[var(--danger)] mt-1">
                      {errors.subCounty.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone">Contact Mobile Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    error={!!errors.phone}
                    {...register("phone")}
                  />
                  {errors.phone && (
                    <p className="text-[13px] text-[var(--danger)] mt-1">
                      {errors.phone.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px bg-[var(--line)] w-full" />

            {/* Section 2: Bereavement Facts */}
            <div>
              <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-4">
                2. Deceased Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strictly Restricted Relationship Selector */}
                <div>
                  <Label htmlFor="relationship">
                    Relationship to Deceased <span className="text-[var(--danger)]">*</span>
                  </Label>
                  <Select
                    defaultValue="mother"
                    onValueChange={(val) =>
                      setValue("relationship", val as BereavementRelationship, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger id="relationship" error={!!errors.relationship}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BEREAVEMENT_RELATIONSHIPS.map((rel) => (
                        <SelectItem key={rel.value} value={rel.value}>
                          <span>{rel.label}</span>
                          <span className="text-[12px] text-[var(--ink-muted)] ml-1">
                            ({rel.swahili})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11.5px] text-[var(--ink-muted)] mt-1">
                    Uhusiano wako na marehemu — mama, baba, mke/mume, au mtoto wako pekee.
                  </p>
                  {errors.relationship && (
                    <p className="text-[13px] text-[var(--danger)] mt-1">
                      {errors.relationship.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="deceasedName">
                    Full Name of Deceased <span className="text-[var(--danger)]">*</span>
                  </Label>
                  <Input
                    id="deceasedName"
                    placeholder="e.g. Mary Auma Wandera"
                    error={!!errors.deceasedName}
                    {...register("deceasedName")}
                  />
                  {errors.deceasedName && (
                    <p className="text-[13px] text-[var(--danger)] mt-1">
                      {errors.deceasedName.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="dateOfBereavement">
                    Date of Bereavement <span className="text-[var(--danger)]">*</span>
                  </Label>
                  <Input
                    id="dateOfBereavement"
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    error={!!errors.dateOfBereavement}
                    {...register("dateOfBereavement")}
                  />
                  <p className="text-[11.5px] text-[var(--ink-muted)] mt-1">
                    Must not exceed 180 days from occurrence.
                  </p>
                  {errors.dateOfBereavement && (
                    <p className="text-[13px] text-[var(--danger)] mt-1">
                      {errors.dateOfBereavement.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="burialDate" optional>Expected Burial Date</Label>
                  <Input
                    id="burialDate"
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    {...register("burialDate")}
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="burialPlace" optional>Place of Burial / Funeral Home</Label>
                  <Input
                    id="burialPlace"
                    placeholder="e.g. Bumutiru Village, Butula Sub-County"
                    {...register("burialPlace")}
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="details" optional>Additional Welfare Information</Label>
                    <span className="text-[12px] text-[var(--ink-muted)]">
                      {detailsValue.length} / 700 chars
                    </span>
                  </div>
                  <Textarea
                    id="details"
                    maxLength={700}
                    rows={4}
                    placeholder="Provide any other helpful details regarding the bereavement arrangement or contacts…"
                    {...register("details")}
                  />
                  {errors.details && (
                    <p className="text-[13px] text-[var(--danger)] mt-1">
                      {errors.details.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--line)] flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/bereavement")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
                loadingText="Submitting claim…"
              >
                Submit Bereavement Claim
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

