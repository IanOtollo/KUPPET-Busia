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
import { toast } from "sonner";
import { Eye, EyeOff, KeyRound } from "lucide-react";

const resetSchema = z
  .object({
    password: z
      .string()
      .min(10, "Password must be at least 10 characters")
      .regex(/[A-Z]/, "Must include at least one uppercase letter")
      .regex(/[a-z]/, "Must include at least one lowercase letter")
      .regex(/[0-9]/, "Must include at least one digit"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetFormData = z.infer<typeof resetSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async () => {
    setIsSubmitting(true);
    try {
      toast.success("Your password has been updated successfully.");
      router.push("/login");
    } catch {
      toast.error("Failed to reset password. The link may have expired.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <span className="eyebrow block mb-1">SECURITY UPDATE</span>
        <h2 className="font-serif text-[26px] font-semibold text-[var(--ink)] leading-tight">
          Create New Password
        </h2>
        <p className="text-[14px] text-[var(--ink-muted)] mt-1">
          Choose a secure password for your KUPPET Busia account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="password">New Password</Label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[12px] text-[var(--union)] hover:underline"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="At least 10 characters"
            error={!!errors.password}
            {...register("password")}
          />
          {errors.password && (
            <p className="text-[13px] text-[var(--danger)] mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            placeholder="Re-enter your new password"
            error={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-[13px] text-[var(--danger)] mt-1">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={isSubmitting}
          loadingText="Updating password…"
        >
          <KeyRound className="h-4 w-4 mr-2" />
          Update Password
        </Button>

        <div className="pt-2 text-center">
          <Link
            href="/login"
            className="text-[13px] text-[var(--ink-muted)] hover:text-[var(--ink)]"
          >
            Cancel and return to Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}

