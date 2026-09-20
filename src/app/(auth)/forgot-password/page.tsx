"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";

const forgotSchema = z.object({
  email: z.string().email("Enter your registered email address"),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
  });

  const emailValue = watch("email");

  const onSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Simulate password reset email trigger via Resend
      setSubmitted(true);
      toast.success("Password reset instructions sent.");
    } catch {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <span className="eyebrow block mb-1">ACCOUNT RECOVERY</span>
        <h2 className="font-serif text-[26px] font-semibold text-[var(--ink)] leading-tight">
          Reset Password
        </h2>
        <p className="text-[14px] text-[var(--ink-muted)] mt-1">
          Enter your registered email address to receive password reset instructions.
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4">
          <div className="p-4 rounded-[var(--r-md)] bg-[var(--surface-sunk)] border border-[var(--line)] text-[13.5px] leading-relaxed text-[var(--ink-body)]">
            If an account exists for <strong>{emailValue}</strong>, we have sent instructions to reset your password. The link is valid for 1 hour.
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
            <Label htmlFor="email">Registered Email Address</Label>
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

          <Button
            type="submit"
            className="w-full"
            loading={isSubmitting}
            loadingText="Sending link…"
          >
            <Mail className="h-4 w-4 mr-2" />
            Send Reset Link
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
    </div>
  );
}

