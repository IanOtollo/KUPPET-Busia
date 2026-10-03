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
import { NativeSelect } from "@/components/ui/native-select";
import { Card, CardContent } from "@/components/ui/card";
import {
  BEREAVEMENT_RELATIONSHIPS,
  BereavementRelationship,
  CONTRIBUTION_METHODS,
  ContributionMethod,
} from "@/lib/constants";
import { toast } from "sonner";
import { Info, CheckCircle2, Home, FileText, Paperclip, X, Lock } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { useMemberBasePath } from "@/lib/memberPath";

const bereavementFormSchema = z.object({
  relationship: z.enum(["mother", "father", "spouse", "child"], {
    errorMap: () => ({
      message:
        "The union only recognises bereavement for mother, father, spouse, or child.",
    }),
  }),
  deceasedName: z.string().trim().min(1, "Deceased name is required").max(80),
  dateOfBereavement: z.string().refine((val) => {
    const d = new Date(val);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 180;
  }, "Date must not be in the future and cannot exceed 180 days ago"),
  burialPlace: z.string().max(120).optional(),
  burialDate: z.string().optional(),
  details: z.string().max(700, "Maximum 700 characters allowed").optional(),
  contributionMethod: z.enum(CONTRIBUTION_METHODS, {
    errorMap: () => ({ message: "Select how colleagues can contribute" }),
  }),
  contributionNumber: z.string().trim().min(1, "Enter the number colleagues should send to"),
  contributionAccount: z.string().max(80).optional(),
  contributionNote: z.string().max(300).optional(),
});

type BereavementFormData = z.infer<typeof bereavementFormSchema>;

export default function NewBereavementPage() {
  const router = useRouter();
  const basePath = useMemberBasePath();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReference, setCreatedReference] = useState<string | null>(null);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);

  const createCase = useMutation(api.bereavement.create);
  const generateUploadUrl = useMutation(api.bereavement.generateDocumentUploadUrl);
  const userProfile = useQuery(api.users.getMyProfile);
  const locks = useQuery(api.bereavement.myLocks);
  const [documents, setDocuments] = useState<File[]>([]);
  const [burialPermit, setBurialPermit] = useState<File | null>(null);
  const [payslip, setPayslip] = useState<File | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  // Relatives already claimed are locked: a mother or father only once, a
  // spouse or child by name (checked again server-side).
  const lockedRelationships = new Set(
    (locks ?? [])
      .filter((l) => l.relationship === "mother" || l.relationship === "father")
      .map((l) => l.relationship as string)
  );
  const lockedNames = (locks ?? [])
    .filter((l) => l.relationship === "spouse" || l.relationship === "child")
    .map((l) => ({ relationship: l.relationship as string, name: l.deceasedName }));

  const uploadFile = async (file: File) => {
    const uploadUrl = await generateUploadUrl();
    const result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!result.ok) throw new Error(`Could not upload ${file.name}. Please try again.`);
    const { storageId } = await result.json();
    return storageId as Id<"_storage">;
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setDocuments((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BereavementFormData>({
    resolver: zodResolver(bereavementFormSchema),
    defaultValues: {
      relationship: "mother",
      contributionMethod: "Paybill",
      deceasedName: "",
      dateOfBereavement: new Date().toISOString().split("T")[0],
      details: "",
    },
  });

  const detailsValue = watch("details") || "";
  const selectedRelationship = watch("relationship");
  const enteredName = (watch("deceasedName") || "").trim().toLowerCase().replace(/\s+/g, " ");
  const relationshipLocked = lockedRelationships.has(selectedRelationship);
  const nameLocked = lockedNames.some(
    (l) => l.relationship === selectedRelationship && l.name.trim().toLowerCase().replace(/\s+/g, " ") === enteredName
  );

  const onSubmit = async (data: BereavementFormData) => {
    if (!burialPermit || !payslip) {
      setDocError("Attach both your burial permit and your payslip before submitting.");
      return;
    }
    setDocError(null);
    setIsSubmitting(true);
    try {
      const burialPermitId = await uploadFile(burialPermit);
      const payslipId = await uploadFile(payslip);
      const documentIds: Id<"_storage">[] = [];
      for (const file of documents) documentIds.push(await uploadFile(file));

      const res = await createCase({
        relationship: data.relationship as BereavementRelationship,
        deceasedName: data.deceasedName,
        dateOfBereavement: data.dateOfBereavement,
        burialPlace: data.burialPlace,
        burialDate: data.burialDate,
        details: data.details,
        burialPermitId,
        payslipId,
        documentIds,
        contributionMethod: data.contributionMethod as ContributionMethod,
        contributionNumber: data.contributionNumber,
        contributionAccount: data.contributionAccount?.trim() || undefined,
        contributionNote: data.contributionNote?.trim() || undefined,
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
              <Link href={`${basePath}/bereavement/${createdCaseId}`}>
                <FileText className="h-4 w-4 mr-1.5" /> View Case Record
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href={`${basePath}/dashboard`}>
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
          { label: "Dashboard", href: `${basePath}/dashboard` },
          { label: "Bereavement", href: `${basePath}/bereavement` },
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
            {/* Section 1: Member details — locked, taken from the member's profile */}
            <div>
              <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-1 flex items-center gap-2">
                1. Your Details <Lock className="h-4 w-4 text-[var(--ink-muted)]" />
              </h3>
              <p className="text-[12.5px] text-[var(--ink-muted)] mb-4">
                Filled in from your profile. You only need to enter the deceased&apos;s details below.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ["Member Full Name", userProfile?.fullName],
                  ["TSC / Membership Number", userProfile?.tscNumber],
                  ["Current School / Institution", userProfile?.school],
                  ["Sub-County", userProfile?.subCounty],
                  ["Contact Mobile Number", userProfile?.phone],
                ].map(([label, value]) => (
                  <div key={label}>
                    <Label>{label}</Label>
                    <Input disabled readOnly value={value ?? ""} className="bg-[var(--surface-sunk)]" />
                  </div>
                ))}
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
                  <NativeSelect
                    id="relationship"
                    error={!!errors.relationship}
                    value={selectedRelationship}
                    onChange={(e) =>
                      setValue("relationship", e.target.value as BereavementRelationship, {
                        shouldValidate: true,
                      })
                    }
                  >
                    {BEREAVEMENT_RELATIONSHIPS.map((rel) => (
                      <option key={rel.value} value={rel.value} disabled={lockedRelationships.has(rel.value)}>
                        {rel.label} ({rel.swahili}){lockedRelationships.has(rel.value) ? " — already claimed" : ""}
                      </option>
                    ))}
                  </NativeSelect>
                  {(relationshipLocked || nameLocked) && (
                    <p className="text-[13px] text-[var(--danger)] mt-1 flex items-start gap-1.5">
                      <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {relationshipLocked
                        ? `A bereavement for your ${selectedRelationship} is already on record, so it cannot be claimed again.`
                        : "A bereavement for this person is already on record."}
                    </p>
                  )}
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
                    placeholder="First name Last name"
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
                  <Label htmlFor="burialPlace" optional>Place of Burial (Village &amp; Sub-County)</Label>
                  <Input
                    id="burialPlace"
                    placeholder="Village, Sub-County"
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

                <div className="md:col-span-2 space-y-4">
                  <div className="p-3 rounded-[var(--r-md)] bg-[var(--info-soft)] border border-[var(--info)]/20 text-[13px] text-[var(--ink-body)]">
                    <strong className="text-[var(--ink)]">Both documents are required.</strong> The burial permit proves the
                    bereavement. The payslip (your latest, showing the KUPPET deduction) confirms you are a paying member.
                    PDF, JPG or PNG, up to 10 MB each.
                  </div>

                  {[
                    { id: "burialPermit", label: "Burial Permit", file: burialPermit, set: setBurialPermit },
                    { id: "payslip", label: "Latest Payslip", file: payslip, set: setPayslip },
                  ].map(({ id, label, file, set }) => (
                    <div key={id}>
                      <Label htmlFor={id}>
                        {label} <span className="text-[var(--danger)]">*</span>
                      </Label>
                      <label
                        htmlFor={id}
                        className="mt-1 flex cursor-pointer items-center gap-2 rounded-[var(--r-md)] border border-dashed border-[var(--line-strong)] bg-[var(--surface-sunk)] p-3 text-[13.5px] text-[var(--ink-muted)] hover:bg-[var(--surface)]"
                      >
                        <Paperclip className="h-4 w-4 shrink-0" />
                        <span className="truncate">{file ? file.name : `Attach ${label.toLowerCase()} (PDF, JPG, PNG)`}</span>
                        {file && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              set(null);
                            }}
                            className="ml-auto text-[var(--ink-muted)] hover:text-[var(--danger)] shrink-0"
                            aria-label={`Remove ${label}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </label>
                      <input
                        id={id}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={(e) => {
                          set(e.target.files?.[0] ?? null);
                          setDocError(null);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  ))}
                  {docError && <p className="text-[13px] text-[var(--danger)]">{docError}</p>}

                  <div>
                    <Label optional>Other Supporting Documents (e.g. Death Certificate)</Label>
                    <label
                      htmlFor="documents"
                      className="mt-1 flex cursor-pointer items-center gap-2 rounded-[var(--r-md)] border border-dashed border-[var(--line-strong)] bg-[var(--surface-sunk)] p-3 text-[13.5px] text-[var(--ink-muted)] hover:bg-[var(--surface)]"
                    >
                      <Paperclip className="h-4 w-4 shrink-0" />
                      Attach files (PDF, JPG, PNG)
                    </label>
                    <input
                      id="documents"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={handleFilesSelected}
                    />
                    {documents.length > 0 && (
                      <ul className="mt-2 space-y-1.5">
                        {documents.map((file, idx) => (
                          <li
                            key={`${file.name}-${idx}`}
                            className="flex items-center justify-between rounded-[var(--r-sm)] bg-[var(--surface-sunk)] px-3 py-1.5 text-[13px] text-[var(--ink-body)]"
                          >
                            <span className="truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => removeDocument(idx)}
                              className="text-[var(--ink-muted)] hover:text-[var(--danger)] shrink-0"
                              aria-label={`Remove ${file.name}`}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px bg-[var(--line)] w-full" />

            {/* Section 3: Contribution form */}
            <div>
              <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-1">
                3. Contribution Details
              </h3>
              <p className="text-[12.5px] text-[var(--ink-muted)] mb-4">
                Where should colleagues send money towards the burial? Once the branch office approves your claim,
                every member is notified of the bereavement together with these details.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contributionMethod">
                    Contribution method <span className="text-[var(--danger)]">*</span>
                  </Label>
                  <NativeSelect
                    id="contributionMethod"
                    error={!!errors.contributionMethod}
                    value={watch("contributionMethod")}
                    onChange={(e) =>
                      setValue("contributionMethod", e.target.value as ContributionMethod, {
                        shouldValidate: true,
                      })
                    }
                  >
                    {CONTRIBUTION_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div>
                  <Label htmlFor="contributionNumber">
                    Paybill / Till / Phone / Account number <span className="text-[var(--danger)]">*</span>
                  </Label>
                  <Input
                    id="contributionNumber"
                    placeholder="e.g. 247247 or 0712 345 678"
                    error={!!errors.contributionNumber}
                    {...register("contributionNumber")}
                  />
                  {errors.contributionNumber && (
                    <p className="text-[13px] text-[var(--danger)] mt-1">{errors.contributionNumber.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="contributionAccount" optional>
                    Account number / account name
                  </Label>
                  <Input
                    id="contributionAccount"
                    placeholder="e.g. Paybill account, or name the money is registered to"
                    {...register("contributionAccount")}
                  />
                </div>

                <div>
                  <Label htmlFor="contributionNote" optional>
                    Note to contributors
                  </Label>
                  <Input id="contributionNote" maxLength={300} {...register("contributionNote")} />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--line)] flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={() => router.push(`${basePath}/bereavement`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                loading={isSubmitting}
                disabled={relationshipLocked || nameLocked}
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

