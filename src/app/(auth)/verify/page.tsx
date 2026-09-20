"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Mail, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email") || "your registered email";
  const userId = searchParams.get("userId");

  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const verifyEmailMutation = useMutation(api.users.verifyEmail);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResend = () => {
    setCountdown(60);
    setCanResend(false);
    toast.success(`Verification link re-sent to ${email}`);
  };

  const handleConfirmVerification = async () => {
    if (!userId) {
      toast.success("Email verified! Redirecting to login.");
      router.push("/login");
      return;
    }

    setIsVerifying(true);
    try {
      await verifyEmailMutation({ userId: userId as Id<"users"> });
      setIsVerified(true);
      toast.success("Email successfully verified!");
    } catch {
      toast.error("Failed to verify email. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <span className="eyebrow block mb-1">EMAIL VERIFICATION</span>
        <h2 className="font-serif text-[26px] font-semibold text-[var(--ink)] leading-tight">
          Verify Your Email
        </h2>
        <p className="text-[14px] text-[var(--ink-muted)] mt-1">
          We have sent a confirmation link to <span className="font-medium text-[var(--ink)]">{email}</span>.
        </p>
      </div>

      <div className="p-4 rounded-[var(--r-md)] bg-[var(--surface-sunk)] border border-[var(--line)] mb-6 space-y-3">
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-[var(--brass)] shrink-0 mt-0.5" />
          <p className="text-[13.5px] leading-relaxed text-[var(--ink-body)]">
            The verification link expires in <strong>24 hours</strong>. Please check your inbox and spam folders.
          </p>
        </div>
        <div className="flex items-start gap-3 pt-2 border-t border-[var(--line)]">
          <CheckCircle2 className="h-5 w-5 text-[var(--union)] shrink-0 mt-0.5" />
          <p className="text-[13.5px] leading-relaxed text-[var(--ink-body)]">
            Once verified, your account will be submitted to the branch office for final TSC membership confirmation.
          </p>
        </div>
      </div>

      {isVerified ? (
        <div className="p-4 rounded-[var(--r-md)] bg-[var(--success-soft)] border border-[var(--success)] text-center space-y-3 mb-4">
          <p className="text-[14px] font-medium text-[var(--success)]">
            Your email has been confirmed!
          </p>
          <p className="text-[12.5px] text-[var(--ink-body)]">
            Your registration is now pending administrative verification by the branch secretary.
          </p>
          <Button className="w-full" asChild>
            <Link href="/login">
              Proceed to Sign In <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Button
            type="button"
            variant="primary"
            className="w-full"
            loading={isVerifying}
            loadingText="Verifying…"
            onClick={handleConfirmVerification}
          >
            Confirm Email Link Clicked
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled={!canResend}
            onClick={handleResend}
          >
            <Mail className="h-4 w-4 mr-2" />
            {canResend ? "Resend Verification Email" : `Resend in ${countdown}s`}
          </Button>
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-[var(--line)] text-center text-[13.5px] text-[var(--ink-muted)]">
        Wrong email?{" "}
        <Link href="/register" className="text-[var(--union)] font-medium hover:underline">
          Re-register with correct email
        </Link>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[var(--ink-muted)]">Loading verification…</div>}>
      <VerifyContent />
    </Suspense>
  );
}

