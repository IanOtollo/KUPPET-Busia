"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, CheckCircle2 } from "lucide-react";

const forgotSchema = z.object({
  tscNumber: z
    .string()
    .trim()
    .min(1, "Enter your TSC number")
    .max(20, "TSC number is too long"),
  idNumber: z
    .string()
    .trim()
    .min(1, "Enter your National ID number")
    .max(20, "National ID number is too long"),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const requestReset = useMutation(api.passwordResets.request);
  const [pending, setPending] = useState<ForgotFormData | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
  });

  // Step 1: validate the form, then ask the teacher to confirm before anything is sent.
  const onSubmit = (data: ForgotFormData) => setPending(data);

  // Step 2: the teacher confirmed.
  const confirmRequest = async () => {
    if (!pending) return;
    setIsSubmitting(true);
    try {
      await requestReset(pending);
      setPending(null);
      setSubmitted(true);
    } catch {
      toast.error("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <span className="eyebrow block mb-1">ACCOUNT RECOVERY</span>
        <h2 className="font-serif text-[26px] font-semibold text-[var(--ink)] leading-tight">
          Forgot Password
        </h2>
        <p className="text-[14px] text-[var(--ink-muted)] mt-1">
          Enter your TSC number and National ID number. The Executive Secretary will
          verify and reset your account.
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4">
          <div className="p-4 rounded-[var(--r-md)] bg-[var(--surface-sunk)] border border-[var(--line)] text-[13.5px] leading-relaxed text-[var(--ink-body)]">
            <div className="flex items-center gap-2 font-semibold text-[var(--ink)] mb-2">
              <CheckCircle2 className="h-4 w-4 text-[var(--union)]" /> Request received
            </div>
            The Executive Secretary has received your password reset request and will
            attend to it shortly. Once it is approved, sign in with your{" "}
            <strong>TSC number as both your username and your password</strong>. You
            will then be asked to set a new password straight away.
            <p className="mt-2 text-[var(--ink-muted)]">
              If the details you entered don&apos;t match our records, no request is
              created — please contact the branch office.
            </p>
          </div>
          <Button variant="secondary" className="w-full" asChild>
            <Link href="/login">
              <ArrowLeft className="h-4 w-4 mr-2" /> Return to Sign In
            </Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="tscNumber">TSC Number</Label>
            <Input
              id="tscNumber"
              inputMode="numeric"
              placeholder="e.g. 456789"
              autoComplete="off"
              error={!!errors.tscNumber}
              {...register("tscNumber")}
            />
            {errors.tscNumber && (
              <p className="text-[13px] text-[var(--danger)] mt-1">{errors.tscNumber.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="idNumber">National ID Number</Label>
            <Input
              id="idNumber"
              inputMode="numeric"
              placeholder="As registered with the branch"
              autoComplete="off"
              error={!!errors.idNumber}
              {...register("idNumber")}
            />
            {errors.idNumber && (
              <p className="text-[13px] text-[var(--danger)] mt-1">{errors.idNumber.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full">
            <KeyRound className="h-4 w-4 mr-2" />
            Request Password Reset
          </Button>

          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="text-[13px] text-[var(--ink-muted)] hover:text-[var(--ink)] inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
            </Link>
          </div>
        </form>
      )}

      <Dialog open={!!pending} onOpenChange={(open) => !open && !isSubmitting && setPending(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a password reset?</DialogTitle>
            <DialogDescription>
              This sends a request for TSC number <strong>{pending?.tscNumber}</strong> to the
              Executive Secretary. Your current password will stop working once the request is
              approved, and you will sign in with your TSC number until you set a new password.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPending(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={confirmRequest} loading={isSubmitting} loadingText="Sending…">
              Yes, proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
