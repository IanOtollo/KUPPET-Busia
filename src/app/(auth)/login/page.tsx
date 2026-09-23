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
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Eye, EyeOff, LogIn } from "lucide-react";

const loginSchema = z.object({
  tscNumber: z.string().min(1, "Enter your TSC number"),
  password: z.string().min(1, "Enter your password"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const convex = useConvex();
  const { signIn } = useAuthActions();
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

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const account = await convex.query(api.users.getEmailByTsc, {
        tscNumber: data.tscNumber,
      });

      if (!account) {
        toast.error("Invalid TSC number or password.");
        return;
      }

      await signIn("password", {
        email: account.email,
        password: data.password,
        flow: "signIn",
      });

      router.push("/dashboard");
    } catch (err: any) {
      const raw = err?.data?.message || err?.message || "";
      toast.error(
        /invalid credentials/i.test(raw)
          ? "Invalid TSC number or password."
          : raw || "Sign in failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-serif text-[26px] font-semibold text-[var(--ink)] leading-tight">
          Teacher Sign In
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

      <div className="mt-3 text-center">
        <Link
          href="/admin-login"
          className="text-[12.5px] text-[var(--ink-muted)] hover:text-[var(--union)] hover:underline"
        >
          Admin &amp; Officials sign in
        </Link>
      </div>
    </div>
  );
}
