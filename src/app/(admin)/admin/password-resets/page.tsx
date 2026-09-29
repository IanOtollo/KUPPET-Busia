"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { KeyRound, CheckCircle2, Clock } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRelativeTime } from "@/lib/format";

type Row = NonNullable<ReturnType<typeof useOpen>>[number];
const useOpen = () => useQuery(api.passwordResets.listOpen);

export default function PasswordResetsPage() {
  const rows = useOpen();
  const approve = useAction(api.passwordResets.approve);
  const decline = useMutation(api.passwordResets.decline);
  const [target, setTarget] = useState<{ row: Row; mode: "approve" | "decline" } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!target) return;
    setBusy(true);
    try {
      const id = target.row._id as Id<"passwordResets">;
      if (target.mode === "approve") {
        await approve({ requestId: id });
        toast.success(
          `Reset approved. ${target.row.memberName} can now sign in with their TSC number as both username and password.`
        );
      } else {
        await decline({ requestId: id });
        toast.success("Request declined.");
      }
      setTarget(null);
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string } })?.data?.message;
      toast.error(message || "That didn't work. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-[26px] font-semibold text-[var(--ink)] leading-tight">
          Password Resets
        </h1>
        <p className="text-[14px] text-[var(--ink-muted)] mt-1 max-w-2xl">
          Teachers who forgot their password appear here, having proved their TSC and National ID
          numbers. Approving sets that one teacher&apos;s password to their TSC number and forces
          them to choose a new one on first sign-in. The temporary password expires after 48 hours.
        </p>
      </div>

      {rows === undefined ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] p-8 text-center text-[14px] text-[var(--ink-muted)]">
          No open password reset requests.
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r._id}
              className="rounded-[var(--r-lg)] border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
            >
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-[var(--ink)] truncate">{r.memberName}</p>
                <p className="text-[13px] text-[var(--ink-muted)]">
                  TSC {r.tscNumber} • {r.school || "—"}
                </p>
                <p className="text-[12px] text-[var(--ink-muted)] mt-1 flex items-center gap-1.5">
                  {r.status === "requested" ? (
                    <>
                      <Clock className="h-3.5 w-3.5" /> Requested {formatRelativeTime(r.requestedAt)}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-[var(--union)]" /> Approved — waiting
                      for the teacher to sign in and set a new password
                      {r.tempPasswordExpiresAt
                        ? ` (expires ${new Date(r.tempPasswordExpiresAt).toLocaleString()})`
                        : ""}
                    </>
                  )}
                </p>
              </div>

              {r.status === "requested" && (
                <div className="flex gap-2 shrink-0">
                  <Button variant="secondary" onClick={() => setTarget({ row: r, mode: "decline" })}>
                    Decline
                  </Button>
                  <Button onClick={() => setTarget({ row: r, mode: "approve" })}>
                    <KeyRound className="h-4 w-4 mr-2" /> Approve reset
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!target} onOpenChange={(open) => !open && !busy && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {target?.mode === "approve" ? "Approve this password reset?" : "Decline this request?"}
            </DialogTitle>
            <DialogDescription>
              {target?.mode === "approve" ? (
                <>
                  <strong>{target?.row.memberName}</strong> (TSC {target?.row.tscNumber}) will be
                  signed out everywhere. Their password becomes their TSC number until they set a new
                  one, which they&apos;ll be forced to do on their next sign-in. Only approve if you
                  are satisfied the request is genuine.
                </>
              ) : (
                <>
                  The request from <strong>{target?.row.memberName}</strong> will be closed and their
                  current password stays unchanged.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={run} loading={busy} loadingText="Working…">
              {target?.mode === "approve" ? "Yes, approve" : "Yes, decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
