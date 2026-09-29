"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { buildMemberPrefix } from "@/lib/memberPath";
import { Eye, EyeOff, LogIn } from "lucide-react";

const INVALID_CREDENTIALS = "Invalid TSC number or password. Please try again.";

const BLOCKED_MESSAGES: Record<string, string> = {
  pending_verification: "Please verify your email address to continue.",
  pending_approval:
    "Your membership registration is awaiting branch office approval. You'll be able to sign in once a branch administrator verifies your details.",
  suspended: "Your account has been suspended. Please contact the branch office.",
  rejected: "Your membership registration was not approved. Please contact the branch office.",
  wrong_role: "That account isn't a teacher-member account. Use the admin sign-in link below.",
};

const loginSchema = z.object({
  tscNumber: z.string().min(1, "Enter your TSC number"),
  password: z.string().min(1, "Enter your password"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const convex = useConvex();
  const { signIn, signOut } = useAuthActions();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { tscNumber: "", password: "" },
  });

  useEffect(() => {
    const blocked = searchParams.get("blocked") || (searchParams.get("pending") ? "pending_approval" : null);
    if (blocked) {
      toast.error(BLOCKED_MESSAGES[blocked] || "Your account cannot sign in right now. Please contact the branch office.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const account = await convex.query(api.users.getEmailByTsc, {
        tscNumber: data.tscNumber,
      });

      if (!account) {
        // Same wording as a wrong password so this screen can't be used to
        // discover which TSC numbers are registered.
        toast.error(INVALID_CREDENTIALS);
        return;
      }

      // Never let a previous session (e.g. an admin who signed in earlier in
      // this browser) linger — its token could answer the profile query below
      // and send this user to the wrong portal.
      try {
        await signOut();
      } catch {
        // No existing session to clear.
      }

      try {
        await signIn("password", {
          email: account.email,
          password: data.password,
          flow: "signIn",
        });
      } catch {
        // The TSC number itself is valid (we just resolved it above) — any
        // failure from the sign-in call itself against a known account can
        // only be an incorrect password.
        toast.error(INVALID_CREDENTIALS);
        return;
      }

      // Read the fresh profile directly rather than relying on the reactive
      // subscription to have caught up. There's still a brief window right
      // after signIn() resolves where the Convex client hasn't finished
      // attaching the new auth token yet, in which this query would come
      // back unauthenticated (null) — retry a few times rather than guess
      // the wrong destination from a null profile.
      // Only accept a profile that belongs to the TSC number just entered — a
      // profile from any other account (stale token) is treated as "not yet".
      const typedTsc = data.tscNumber.toUpperCase().trim();
      const fetchOwnProfile = async () => {
        const p = await convex.query(api.users.getMyProfile);
        return p && p.tscNumber?.toUpperCase().trim() === typedTsc ? p : null;
      };
      let profile = await fetchOwnProfile();
      for (let attempt = 0; !profile && attempt < 10; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        profile = await fetchOwnProfile();
      }

      if (!profile) {
        await signOut();
        toast.error("Couldn't verify your account. Please try signing in again.");
        return;
      }

      // The Password provider only verifies the credential — it has no idea
      // about our own approval workflow, so a not-yet-approved (or suspended
      // / rejected) account still signs in successfully here. Never let that
      // reach an authenticated route: sign back out immediately and surface
      // the same blocked message the destination layout would otherwise show
      // a beat later.
      if (profile && profile.status !== "active") {
        await signOut();
        toast.error(
          BLOCKED_MESSAGES[profile.status] ||
            "Your account cannot sign in right now. Please contact the branch office."
        );
        return;
      }

      // Admin-approved reset: nothing else works until a new password is set.
      if (profile.mustChangePassword) {
        router.push("/change-password");
        return;
      }

      if (profile && profile.role !== "member") {
        router.push("/admin");
      } else if (profile) {
        router.push(`${buildMemberPrefix(profile.fullName, profile.tscNumber)}/dashboard`);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      // Only ever surface messages our own backend deliberately wrote
      // (ConvexError({ message })) — anything else (network hiccups, an
      // internal auth-provider error like "InvalidSecret", etc.) must never
      // be shown to the user raw.
      const friendly = err?.data?.message;
      toast.error(friendly || "Sign in failed. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-[26px] font-semibold text-[var(--ink)] leading-tight">
          Sign In
        </h2>
        <p className="text-[14px] text-[var(--ink-muted)] mt-1">
          Use your TSC number and password.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="tscNumber">TSC Number</Label>
          <Input
            id="tscNumber"
            inputMode="numeric"
            placeholder="e.g. 456789"
            autoComplete="username"
            error={!!errors.tscNumber}
            {...register("tscNumber")}
          />
          {errors.tscNumber && (
            <p className="text-[13px] text-[var(--danger)] mt-1">
              {errors.tscNumber.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-[12.5px] text-[var(--union)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              error={!!errors.password}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-[13px] text-[var(--danger)] mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={isLoading}
          loadingText="Signing in…"
        >
          <LogIn className="h-4 w-4 mr-2" />
          Sign In
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-[var(--line)] text-center text-[13.5px] text-[var(--ink-muted)]">
        New teacher?{" "}
        <Link
          href="/register"
          className="text-[var(--union)] font-medium hover:underline"
        >
          Create an account
        </Link>
      </div>
    </div>
  );
}
