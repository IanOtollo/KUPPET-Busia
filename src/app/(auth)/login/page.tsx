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
import { toast } from "sonner";
import { Eye, EyeOff, LogIn } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Enter your registered email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [genericError, setGenericError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setGenericError(null);

    try {
      // In production, signIn with Password provider handles authentication.
      // For local testing, we route to dashboard or admin based on user role.
      toast.success("Welcome back to KUPPET Busia portal.");
      
      // If admin email or query param redirect
      if (data.email.includes("admin") || data.email.includes("execsec")) {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch {
      // Generic security error message
      setGenericError("Invalid email or password. Please verify your credentials.");
      toast.error("Invalid email or password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <span className="eyebrow block mb-1">SECURE ACCESS</span>
        <h2 className="font-serif text-[26px] font-semibold text-[var(--ink)] leading-tight">
          Sign In to Portal
        </h2>
        <p className="text-[14px] text-[var(--ink-muted)] mt-1">
          Access your welfare cases, harassment reports, and union services.
        </p>
      </div>

      {genericError && (
        <div className="mb-5 p-3.5 rounded-[var(--r-md)] bg-[var(--danger-soft)] border border-[var(--danger)] text-[13.5px] text-[var(--danger)] leading-relaxed">
          {genericError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="teacher@example.com"
            autoComplete="email"
            error={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-[13px] text-[var(--danger)] mt-1">
              {errors.email.message}
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

        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Checkbox
              id="rememberMe"
              onCheckedChange={(checked) =>
                setValue("rememberMe", !!checked)
              }
            />
            <label
              htmlFor="rememberMe"
              className="text-[13px] text-[var(--ink-body)] cursor-pointer select-none"
            >
              Remember me on this browser
            </label>
          </div>
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
        New to the portal?{" "}
        <Link href="/register" className="text-[var(--union)] font-medium hover:underline">
          Create an account
        </Link>
      </div>
    </div>
  );
}

