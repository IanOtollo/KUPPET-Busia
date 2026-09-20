"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SUB_COUNTIES,
  DESIGNATIONS,
  SCHOOL_ROLES,
  TEACHING_SUBJECTS,
  GENDERS,
} from "@/lib/constants";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, ArrowRight, ShieldCheck, BookOpen, Check } from "lucide-react";

// Step 1 Validation Schema
const step1Schema = z.object({
  fullName: z
    .string()
    .min(3, "Full name must be at least 3 characters")
    .max(80, "Full name cannot exceed 80 characters")
    .regex(/^[a-zA-Z\s\-']+$/, "Letters, spaces, hyphens, and apostrophes only"),
  idNumber: z
    .string()
    .regex(/^\d{7,8}$/, "National ID must be exactly 7 or 8 digits"),
  tscNumber: z
    .string()
    .min(6, "TSC number must be 6–9 characters")
    .max(9, "TSC number cannot exceed 9 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Alphanumeric characters only"),
  phone: z
    .string()
    .regex(
      /^(?:\+254|0)?(7\d{8}|1\d{8})$/,
      "Enter a valid Kenyan mobile number (e.g. 0712345678 or 0112345678)"
    ),
  email: z.string().email("Enter a valid email address"),
  school: z
    .string()
    .min(3, "School name is required")
    .max(120, "School name cannot exceed 120 characters"),
  subCounty: z.enum(SUB_COUNTIES, {
    errorMap: () => ({ message: "Select your sub-county" }),
  }),
  designation: z.enum(DESIGNATIONS, {
    errorMap: () => ({ message: "Select your designation" }),
  }),
  schoolRole: z.string().optional(),
  gender: z.enum(GENDERS).optional(),
});

// Step 2 Validation Schema
const step2Schema = z
  .object({
    password: z
      .string()
      .min(10, "Password must be at least 10 characters")
      .regex(/[A-Z]/, "Must include at least one uppercase letter")
      .regex(/[a-z]/, "Must include at least one lowercase letter")
      .regex(/[0-9]/, "Must include at least one digit"),
    confirmPassword: z.string(),
    consent: z.boolean().refine((val) => val === true, {
      message: "You must consent to continue",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type FormData = Step1Data & Step2Data;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // Convex registration mutation
  const registerMember = useMutation(api.users.register);

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(step === 1 ? step1Schema : step2Schema) as any,
    mode: "onTouched",
    defaultValues: {
      consent: false,
    },
  });

  const passwordValue = watch("password") || "";

  // Compute password strength 0–4
  const computePasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    return score;
  };
  const strength = computePasswordStrength(passwordValue);

  const toggleSubject = (sub: string) => {
    if (selectedSubjects.includes(sub)) {
      setSelectedSubjects(selectedSubjects.filter((s) => s !== sub));
    } else {
      setSelectedSubjects([...selectedSubjects, sub]);
    }
  };

  const onNextStep = async () => {
    const valid = await trigger([
      "fullName",
      "idNumber",
      "tscNumber",
      "phone",
      "email",
      "school",
      "subCounty",
      "designation",
    ]);
    if (valid) {
      setStep(2);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await registerMember({
        fullName: data.fullName,
        idNumber: data.idNumber,
        tscNumber: data.tscNumber,
        phone: data.phone,
        email: data.email,
        school: data.school,
        subCounty: data.subCounty,
        designation: data.designation,
        schoolRole: data.schoolRole || data.designation,
        subjects: selectedSubjects,
        gender: data.gender,
      });

      toast.success("Account created successfully! Please verify your email.");
      router.push("/login?registered=1");
    } catch (err: any) {
      const msg =
        err.data?.message || err.message || "Registration failed. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <Link href="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-[var(--r-md)] bg-[var(--navy)] text-white flex items-center justify-center font-serif font-bold text-xl">
            K
          </div>
          <span className="font-serif font-bold text-xl text-[var(--navy)] tracking-tight">
            KUPPET BUSIA
          </span>
        </Link>
        <h2 className="text-center text-2xl sm:text-3xl font-bold tracking-tight text-[var(--navy)] font-serif">
          Teacher Membership Registration
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-[var(--muted)]">
          Join Busia County Post-Primary Teachers Union. Step {step} of 2.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-[var(--line)]">
          {/* Progress Indicator */}
          <div className="mb-6 flex items-center justify-between border-b border-[var(--line)] pb-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 1
                    ? "bg-[var(--navy)] text-white"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                1
              </span>
              <span className="text-xs font-semibold text-[var(--navy)]">
                Personal & School Details
              </span>
            </div>

            <div className="h-[2px] w-12 bg-slate-200" />

            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 2
                    ? "bg-[var(--navy)] text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                2
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Security & Consent
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {step === 1 && (
              <>
                <div>
                  <Label htmlFor="fullName">Full Official Name (As per National ID)</Label>
                  <Input
                    id="fullName"
                    placeholder="e.g. John Wandera Ouma"
                    error={!!errors.fullName}
                    {...register("fullName")}
                  />
                  {errors.fullName && (
                    <p className="text-[13px] text-[var(--danger)] mt-1">
                      {errors.fullName.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="idNumber">National ID Number</Label>
                    <Input
                      id="idNumber"
                      placeholder="e.g. 28459102"
                      maxLength={8}
                      error={!!errors.idNumber}
                      {...register("idNumber")}
                    />
                    {errors.idNumber && (
                      <p className="text-[13px] text-[var(--danger)] mt-1">
                        {errors.idNumber.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="tscNumber">TSC Number</Label>
                    <Input
                      id="tscNumber"
                      placeholder="e.g. 456789"
                      maxLength={9}
                      error={!!errors.tscNumber}
                      {...register("tscNumber")}
                    />
                    {errors.tscNumber && (
                      <p className="text-[13px] text-[var(--danger)] mt-1">
                        {errors.tscNumber.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="phone">Mobile Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="0712345678"
                      error={!!errors.phone}
                      {...register("phone")}
                    />
                    {errors.phone && (
                      <p className="text-[13px] text-[var(--danger)] mt-1">
                        {errors.phone.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="teacher@example.com"
                      error={!!errors.email}
                      {...register("email")}
                    />
                    {errors.email && (
                      <p className="text-[13px] text-[var(--danger)] mt-1">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="school">Current School / Institution</Label>
                  <Input
                    id="school"
                    placeholder="e.g. Busia Girls Secondary School"
                    error={!!errors.school}
                    {...register("school")}
                  />
                  {errors.school && (
                    <p className="text-[13px] text-[var(--danger)] mt-1">
                      {errors.school.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="subCounty">Sub-County</Label>
                    <Select
                      onValueChange={(val) =>
                        setValue("subCounty", val as (typeof SUB_COUNTIES)[number], {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger error={!!errors.subCounty}>
                        <SelectValue placeholder="Select Sub-County" />
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
                    <Label htmlFor="designation">TSC Designation</Label>
                    <Select
                      onValueChange={(val) =>
                        setValue("designation", val as (typeof DESIGNATIONS)[number], {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger error={!!errors.designation}>
                        <SelectValue placeholder="Select Designation" />
                      </SelectTrigger>
                      <SelectContent>
                        {DESIGNATIONS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.designation && (
                      <p className="text-[13px] text-[var(--danger)] mt-1">
                        {errors.designation.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* School Specific Responsibility Role */}
                <div>
                  <Label htmlFor="schoolRole">Institutional Responsibility / Specific Role</Label>
                  <Select
                    onValueChange={(val) => setValue("schoolRole", val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specific school role (e.g. Games Master, HOD)" />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHOOL_ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11.5px] text-[var(--muted)] mt-1">
                    Select your exact position at school (e.g., Games Master, HOD, Deputy Principal).
                  </p>
                </div>

                {/* Teaching Subjects */}
                <div>
                  <Label className="flex items-center gap-1.5 mb-1">
                    <BookOpen className="h-4 w-4 text-[var(--navy)]" /> Teaching Subject(s)
                  </Label>
                  <p className="text-[11.5px] text-[var(--muted)] mb-2">
                    Click to select all subjects you teach:
                  </p>
                  <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 border border-slate-200 rounded-lg max-h-36 overflow-y-auto">
                    {TEACHING_SUBJECTS.map((sub) => {
                      const isSelected = selectedSubjects.includes(sub);
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => toggleSubject(sub)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 cursor-pointer ${
                            isSelected
                              ? "bg-[var(--navy)] text-white border-[var(--navy)] font-semibold"
                              : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Button
                  type="button"
                  className="w-full mt-6 bg-[var(--navy)] text-white hover:bg-[var(--navy-light)]"
                  onClick={onNextStep}
                >
                  <span>Continue to Security</span>
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="password">Create Password</Label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[12px] text-[var(--navy)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" /> Show
                        </>
                      )}
                    </button>
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 10 characters"
                    error={!!errors.password}
                    {...register("password")}
                  />
                  <div className="grid grid-cols-4 gap-1.5 mt-2">
                    {[1, 2, 3, 4].map((index) => (
                      <div
                        key={index}
                        className={`h-1.5 rounded-full transition-all ${
                          strength >= index
                            ? strength <= 2
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                            : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-[11.5px] text-[var(--muted)] mt-1.5">
                    Must contain at least 10 characters, including uppercase, lowercase, and a digit.
                  </p>
                  {errors.password && (
                    <p className="text-[13px] text-[var(--danger)] mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    error={!!errors.confirmPassword}
                    {...register("confirmPassword")}
                  />
                  {errors.confirmPassword && (
                    <p className="text-[13px] text-[var(--danger)] mt-1">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="consent"
                      onCheckedChange={(checked) =>
                        setValue("consent", checked === true, { shouldValidate: true })
                      }
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="consent"
                        className="text-xs text-[var(--navy)] font-medium leading-normal cursor-pointer"
                      >
                        I confirm that my TSC and National ID credentials are authentic and accurate, and I consent to KUPPET Busia Branch processing my membership record.
                      </label>
                    </div>
                  </div>
                  {errors.consent && (
                    <p className="text-[13px] text-[var(--danger)] mt-1">
                      {errors.consent.message}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-1/3"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 bg-[var(--navy)] text-white hover:bg-[var(--navy-light)]"
                  >
                    {isSubmitting ? "Creating Account..." : "Complete Registration"}
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

