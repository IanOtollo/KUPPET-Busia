"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildMemberPrefix } from "@/lib/memberPath";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    idNumber: z.string().trim().max(20).optional(),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .max(128)
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[0-9]/, "Include a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });

type FormData = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const profile = useQuery(api.users.getMyProfile);
  const changePassword = useAction(api.passwordResets.changeMyPassword);
  const [saving, setSaving] = useState(false);

  const forced = !!profile?.mustChangePassword;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) router.replace("/login");
  }, [authLoading, isAuthenticated, router]);

  if (!isAuthenticated || !profile) {
    return <p className="text-[14px] text-[var(--ink-muted)]">Checking your account…</p>;
  }

  const destination = () =>
    profile.role !== "member"
      ? "/admin"
      : `${buildMemberPrefix(profile.fullName, profile.tscNumber)}/dashboard`;

  const onSubmit = async (data: FormData) => {
    if (forced && !data.idNumber?.trim()) {
      toast.error("Enter your National ID number to confirm it's you.");
      return;
    }
    setSaving(true);
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        idNumber: forced ? data.idNumber : undefined,
      });
      toast.success("Password updated.");
      router.replace(destination());
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string } })?.data?.message;
      toast.error(message || "Couldn't update your password. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <div>
      <div className="mb-6">
        <span className="eyebrow block mb-1">{forced ? "ACTION REQUIRED" : "ACCOUNT SECURITY"}</span>
        <h2 className="font-serif text-[26px] font-semibold text-[var(--ink)] leading-tight">
          {forced ? "Set a New Password" : "Change Password"}
        </h2>
        <p className="text-[14px] text-[var(--ink-muted)] mt-1">
          {forced
            ? "Your password was reset by the Executive Secretary. Choose a new password to continue — you can't use the portal until you do."
            : "Enter your current password and choose a new one."}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="currentPassword">
            {forced ? "Temporary password (your TSC number)" : "Current password"}
          </Label>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            error={!!errors.currentPassword}
            {...register("currentPassword")}
          />
          {errors.currentPassword && (
            <p className="text-[13px] text-[var(--danger)] mt-1">{errors.currentPassword.message}</p>
          )}
        </div>

        {forced && (
          <div>
            <Label htmlFor="idNumber">National ID number</Label>
            <Input
              id="idNumber"
              inputMode="numeric"
              autoComplete="off"
              placeholder="To confirm it's really you"
              {...register("idNumber")}
            />
          </div>
        )}

        <div>
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            error={!!errors.newPassword}
            {...register("newPassword")}
          />
          {errors.newPassword && (
            <p className="text-[13px] text-[var(--danger)] mt-1">{errors.newPassword.message}</p>
          )}
          <p className="text-[12px] text-[var(--ink-muted)] mt-1">
            8+ characters with an uppercase letter, a lowercase letter and a number. It can&apos;t be
            your TSC number.
          </p>
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            error={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-[13px] text-[var(--danger)] mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" loading={saving} loadingText="Saving…">
          <ShieldCheck className="h-4 w-4 mr-2" />
          Update Password
        </Button>

        <Button type="button" variant="ghost" className="w-full" onClick={handleCancel} disabled={saving}>
          {forced ? "Sign out" : "Cancel"}
        </Button>
      </form>
    </div>
  );
}
