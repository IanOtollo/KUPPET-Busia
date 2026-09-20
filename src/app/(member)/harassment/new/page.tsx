"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
  HARASSMENT_CATEGORIES,
  HARASSMENT_INVOLVED_ROLES,
  HARASSMENT_SUPPORT_OPTIONS,
  HarassmentCategory,
  HarassmentInvolvedRole,
  SubCounty,
} from "@/lib/constants";
import { toast } from "sonner";
import { Lock, ShieldAlert, PhoneCall, CheckCircle2, Home, FileText } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";

const harassmentFormSchema = z.object({
  isAnonymous: z.boolean(),
  reporterName: z.string().optional(),
  reporterContact: z.string().optional(),
  school: z.string().min(3, "School where it occurred is required"),
  subCounty: z.enum(SUB_COUNTIES, {
    errorMap: () => ({ message: "Select sub-county" }),
  }),
  category: z.enum(HARASSMENT_CATEGORIES, {
    errorMap: () => ({ message: "Select harassment category" }),
  }),
  categoryOther: z.string().optional(),
  involvedRole: z.enum(HARASSMENT_INVOLVED_ROLES, {
    errorMap: () => ({ message: "Select role of person involved" }),
  }),
  involvedName: z.string().optional(),
  occurredAt: z.string().min(1, "Date of occurrence is required"),
  isOngoing: z.boolean(),
  narrative: z
    .string()
    .min(50, "Narrative must be at least 50 characters describing what happened")
    .max(2500, "Narrative cannot exceed 2500 characters"),
  reportedElsewhere: z.boolean(),
  reportedElsewhereDetail: z.string().optional(),
  supportNeeded: z.array(z.string()).min(1, "Select at least one support type requested"),
  confidentialityConsent: z.boolean().refine((v) => v === true, {
    message: "You must acknowledge confidentiality terms",
  }),
});

type HarassmentFormData = z.infer<typeof harassmentFormSchema>;

export default function NewHarassmentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReference, setCreatedReference] = useState<string | null>(null);

  const createReport = useMutation(api.harassment.create);
  const userProfile = useQuery(api.users.getMyProfile);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<HarassmentFormData>({
    resolver: zodResolver(harassmentFormSchema),
    defaultValues: {
      isAnonymous: false,
      reporterName: userProfile?.fullName || "",
      reporterContact: userProfile?.phone || "",
      school: userProfile?.school || "",
      subCounty: userProfile?.subCounty || "Matayos",
      category: "Verbal abuse or intimidation",
      involvedRole: "Principal",
      occurredAt: new Date().toISOString().split("T")[0],
      isOngoing: false,
      narrative: "",
      reportedElsewhere: false,
      supportNeeded: ["Branch intervention"],
      confidentialityConsent: false,
    },
  });

  const isAnonymous = watch("isAnonymous");
  const narrativeValue = watch("narrative") || "";
  const selectedSupport = watch("supportNeeded") || [];

  // Autosave narrative draft to localStorage every 10 seconds
  useEffect(() => {
    const saved = localStorage.getItem("kuppet_harassment_draft");
    if (saved && !narrativeValue) {
      setValue("narrative", saved);
    }
  }, []);

  useEffect(() => {
    if (narrativeValue) {
      const timer = setTimeout(() => {
        localStorage.setItem("kuppet_harassment_draft", narrativeValue);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [narrativeValue]);

  const toggleSupportOption = (option: string) => {
    const current = [...selectedSupport];
    const idx = current.indexOf(option);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(option);
    }
    setValue("supportNeeded", current, { shouldValidate: true });
  };

  const onSubmit = async (data: HarassmentFormData) => {
    setIsSubmitting(true);
    try {
      const res = await createReport({
        isAnonymous: data.isAnonymous,
        reporterName: data.isAnonymous ? undefined : data.reporterName,
        reporterContact: data.isAnonymous ? undefined : data.reporterContact,
        school: data.school,
        subCounty: data.subCounty as SubCounty,
        category: data.category as HarassmentCategory,
        categoryOther: data.categoryOther,
        involvedRole: data.involvedRole as HarassmentInvolvedRole,
        involvedName: data.involvedName,
        occurredAt: data.occurredAt,
        isOngoing: data.isOngoing,
        narrative: data.narrative,
        reportedElsewhere: data.reportedElsewhere,
        reportedElsewhereDetail: data.reportedElsewhereDetail,
        supportNeeded: data.supportNeeded,
        evidenceIds: [],
      });

      localStorage.removeItem("kuppet_harassment_draft");
      setCreatedReference(res.reference);
      toast.success("Safe harassment report filed successfully.");
    } catch (err: unknown) {
      const error = err as { message?: string; data?: { message?: string } };
      toast.error(
        error.data?.message || error.message || "Failed to submit harassment report."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirmation View
  if (createdReference) {
    return (
      <div className="max-w-[640px] mx-auto py-8">
        <div className="p-6 sm:p-8 rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-panel)] text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--brass-soft)] text-[var(--brass)] flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 stroke-[2]" />
          </div>

          <span className="eyebrow block mb-2">REPORT CONFIDENTIALLY FILED</span>
          <h2 className="font-serif text-[26px] sm:text-[32px] font-bold text-[var(--ink)] mb-2">
            Safe Harassment Report Received
          </h2>
          <p className="text-[15px] text-[var(--ink-muted)] mb-6">
            Your report has been encrypted and assigned strictly to authorized branch grievance officers.
          </p>

          <div className="p-4 rounded-[var(--r-md)] bg-[var(--surface-sunk)] border border-[var(--line)] mb-6 text-center">
            <span className="text-[12px] uppercase tracking-wider text-[var(--ink-muted)] font-semibold block">
              Unique Tracking Reference Code
            </span>
            <span className="mono-ref text-[22px] sm:text-[26px] font-bold text-[var(--union)] block mt-1">
              {createdReference}
            </span>
            <p className="text-[12px] text-[var(--ink-muted)] mt-1.5">
              Keep this reference code safe. You can use it anytime on the protection portal to track your investigation status.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link href="/harassment">
                <FileText className="h-4 w-4 mr-1.5" /> Return to Protection Portal
              </Link>
            </Button>
            <Button variant="secondary" asChild>
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-1.5" /> Dashboard
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[840px] mx-auto">
      <PageHeader
        eyebrow="SAFE REPORTING"
        title="File a Confidential Harassment Report"
        lead="Report harassment experienced at the school where you teach. You can choose to remain completely anonymous."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Harassment Protection", href: "/harassment" },
          { label: "File Report" },
        ]}
      />

      {/* Confidentiality & Immediate Danger Helpline Panel (§15) */}
      <div className="p-5 rounded-[var(--r-lg)] bg-[var(--brass-soft)] border border-[var(--brass)]/40 mb-8 flex items-start gap-4">
        <Lock className="h-6 w-6 text-[var(--brass)] shrink-0 mt-0.5" />
        <div className="text-[14px] leading-relaxed text-[var(--ink-body)] space-y-1">
          <p className="font-semibold text-[var(--ink)] text-[15px]">
            Confidentiality Guarantee & Immediate Danger Hotline:
          </p>
          <p className="text-[var(--ink-muted)]">
            This report is handled with strict confidentiality under Section 15 of KUPPET Busia charter and accessed strictly by designated officers.
          </p>
          <div className="pt-2 flex items-center gap-2 font-medium text-[var(--danger)]">
            <PhoneCall className="h-4 w-4" />
            <span>If you are in immediate physical danger, contact police (999/112) or call the Executive Secretary directly: </span>
            <a href="tel:+254722000004" className="underline font-bold">0722 000 004</a>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Anonymity Option */}
            <div className="p-4 rounded-[var(--r-md)] bg-[var(--surface-sunk)] border border-[var(--line)]">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif text-[16px] font-semibold text-[var(--ink)]">
                    Report Anonymously?
                  </h4>
                  <p className="text-[13px] text-[var(--ink-muted)] mt-0.5">
                    When toggled ON, your name, email, and phone are completely omitted from the database record.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isAnonToggle"
                    className="w-5 h-5 accent-[var(--union)] cursor-pointer"
                    checked={isAnonymous}
                    onChange={(e) => setValue("isAnonymous", e.target.checked)}
                  />
                  <Label htmlFor="isAnonToggle" className="cursor-pointer font-semibold">
                    {isAnonymous ? "ANONYMOUS ON" : "Named Report"}
                  </Label>
                </div>
              </div>
            </div>

            {/* Reporter Info (if not anonymous) */}
            {!isAnonymous && (
              <div>
                <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-4">
                  1. Your Identity & Contact (Optional)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="repName" optional>Your Name</Label>
                    <Input
                      id="repName"
                      placeholder="e.g. Teacher Jane"
                      {...register("reporterName")}
                    />
                  </div>
                  <div>
                    <Label htmlFor="repContact" optional>Phone / Email Contact</Label>
                    <Input
                      id="repContact"
                      placeholder="e.g. 0712345678"
                      {...register("reporterContact")}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="h-px bg-[var(--line)] w-full" />

            {/* School & Category */}
            <div>
              <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-4">
                2. School & Category of Harassment
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="school">
                    School Where It Occurred <span className="text-[var(--danger)]">*</span>
                  </Label>
                  <Input
                    id="school"
                    placeholder="e.g. St. Mathias Boys High School"
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
                  <Label htmlFor="subCounty">
                    Sub-County <span className="text-[var(--danger)]">*</span>
                  </Label>
                  <Select
                    defaultValue="Matayos"
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

                <div className="md:col-span-2">
                  <Label htmlFor="category">
                    Category of Harassment Experienced <span className="text-[var(--danger)]">*</span>
                  </Label>
                  <Select
                    defaultValue="Verbal abuse or intimidation"
                    onValueChange={(val) =>
                      setValue("category", val as HarassmentCategory, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger id="category" error={!!errors.category}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HARASSMENT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-[13px] text-[var(--danger)] mt-1">
                      {errors.category.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="involvedRole">
                    Role of Person(s) Involved <span className="text-[var(--danger)]">*</span>
                  </Label>
                  <Select
                    defaultValue="Principal"
                    onValueChange={(val) =>
                      setValue("involvedRole", val as HarassmentInvolvedRole, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger id="involvedRole" error={!!errors.involvedRole}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HARASSMENT_INVOLVED_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="involvedName" optional>Name of Person Involved</Label>
                  <Input
                    id="involvedName"
                    placeholder="Optional name"
                    {...register("involvedName")}
                  />
                </div>

                <div>
                  <Label htmlFor="occurredAt">
                    Date of Occurrence <span className="text-[var(--danger)]">*</span>
                  </Label>
                  <Input
                    id="occurredAt"
                    type="date"
                    max={new Date().toISOString().split("T")[0]}
                    error={!!errors.occurredAt}
                    {...register("occurredAt")}
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="isOngoing"
                    className="w-4 h-4 accent-[var(--union)] cursor-pointer"
                    onChange={(e) => setValue("isOngoing", e.target.checked)}
                  />
                  <Label htmlFor="isOngoing" className="cursor-pointer">
                    This harassment is currently ongoing
                  </Label>
                </div>
              </div>
            </div>

            <div className="h-px bg-[var(--line)] w-full" />

            {/* Narrative (50–2500 chars with 10s draft autosave) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="narrative">
                  Detailed Incident Narrative <span className="text-[var(--danger)]">*</span>
                </Label>
                <span className="text-[12px] text-[var(--ink-muted)]">
                  {narrativeValue.length} / 2500 chars (Min 50)
                </span>
              </div>
              <Textarea
                id="narrative"
                rows={6}
                maxLength={2500}
                placeholder="Describe what happened in detail, including specific actions, verbal remarks, dates, and locations… (Draft is automatically saved locally every 10 seconds)"
                error={!!errors.narrative}
                {...register("narrative")}
              />
              <p className="text-[11.5px] text-[var(--ink-muted)] mt-1">
                Hapa ana report ka anaharasiwa kwa shule yenye anafunza na the kind of harassment anapitia.
              </p>
              {errors.narrative && (
                <p className="text-[13px] text-[var(--danger)] mt-1">
                  {errors.narrative.message}
                </p>
              )}
            </div>

            <div className="h-px bg-[var(--line)] w-full" />

            {/* Support Needed Multi-select */}
            <div>
              <h3 className="font-serif text-[18px] font-semibold text-[var(--ink)] mb-2">
                3. What Support Do You Need from the Branch? <span className="text-[var(--danger)]">*</span>
              </h3>
              <p className="text-[13px] text-[var(--ink-muted)] mb-3">
                Select all options that apply to your situation:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {HARASSMENT_SUPPORT_OPTIONS.map((opt) => {
                  const checked = selectedSupport.includes(opt);
                  return (
                    <div
                      key={opt}
                      onClick={() => toggleSupportOption(opt)}
                      className={`p-3 rounded-[var(--r-md)] border cursor-pointer flex items-center gap-3 transition-colors ${
                        checked
                          ? "bg-[var(--union-soft)] border-[var(--union)] text-[var(--union)] font-semibold"
                          : "bg-[var(--surface)] border-[var(--line)] text-[var(--ink-body)] hover:bg-[var(--surface-sunk)]"
                      }`}
                    >
                      <Checkbox checked={checked} />
                      <span className="text-[13.5px]">{opt}</span>
                    </div>
                  );
                })}
              </div>
              {errors.supportNeeded && (
                <p className="text-[13px] text-[var(--danger)] mt-1">
                  {errors.supportNeeded.message}
                </p>
              )}
            </div>

            <div className="pt-2">
              <div className="flex items-start gap-3 p-3 rounded-[var(--r-md)] bg-[var(--surface-sunk)] border border-[var(--line)]">
                <Checkbox
                  id="confidentialityConsent"
                  onCheckedChange={(c) =>
                    setValue("confidentialityConsent", !!c, { shouldValidate: true })
                  }
                />
                <label
                  htmlFor="confidentialityConsent"
                  className="text-[13px] leading-relaxed text-[var(--ink-body)] cursor-pointer"
                >
                  I acknowledge that this report will be processed confidentially by authorized KUPPET Busia Branch grievance officers to provide union representation and welfare protection.
                </label>
              </div>
              {errors.confidentialityConsent && (
                <p className="text-[13px] text-[var(--danger)] mt-1">
                  {errors.confidentialityConsent.message}
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-[var(--line)] flex justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/harassment")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={isSubmitting}
                loadingText="Filing report…"
              >
                <ShieldAlert className="h-4 w-4 mr-1.5" /> File Confidential Report
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

