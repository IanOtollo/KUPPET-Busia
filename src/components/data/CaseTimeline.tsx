import { Check, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/format";
import { FLOW_STEPS } from "@/lib/bereavementFlow";

interface HistoryEntry {
  status: string;
  at: number;
  actorName: string;
}

interface CaseTimelineProps {
  status: string;
  createdAt: number;
  disbursedAt?: number;
  history?: HistoryEntry[];
}

/** Admin welfare timeline: each step shows when it happened and who did it. */
export function CaseTimeline({ status, createdAt, disbursedAt, history }: CaseTimelineProps) {
  const stepIdx = (s: string) => FLOW_STEPS.findIndex((f) => f.key === s);
  const reachedIdx = Math.max(
    stepIdx(status),
    disbursedAt ? stepIdx("disbursed") : -1,
    ...(history ?? []).map((h) => stepIdx(h.status))
  );
  const declined = status === "declined";

  const entryFor = (key: string) => [...(history ?? [])].reverse().find((h) => h.status === key);

  return (
    <ol className="grid grid-cols-5 gap-1 sm:gap-2" aria-label="Welfare processing timeline">
      {FLOW_STEPS.map((step, idx) => {
        const done = idx <= reachedIdx;
        const current = !declined && idx === stepIdx(status);
        const entry = entryFor(step.key);
        const at = entry?.at ?? (step.key === "submitted" ? createdAt : step.key === "disbursed" ? disbursedAt : undefined);
        return (
          <li key={step.key} className="relative flex flex-col items-center text-center">
            {idx > 0 && (
              <span
                aria-hidden
                className={cn(
                  "absolute top-3.5 right-1/2 h-0.5 w-full -z-0",
                  done ? "bg-[var(--union)]" : "bg-[var(--line)]"
                )}
              />
            )}
            <span
              className={cn(
                "relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-[13.5px] font-semibold mb-1.5",
                done
                  ? "bg-[var(--union)] text-white"
                  : "bg-[var(--surface-sunk)] text-[var(--ink-muted)] border border-[var(--line)]",
                current && "ring-2 ring-offset-2 ring-[var(--brass)]"
              )}
            >
              {done && !current ? <Check className="h-4 w-4" /> : idx + 1}
            </span>
            <span
              className={cn(
                "text-[13px] sm:text-[14px] leading-tight",
                done ? "font-semibold text-[var(--ink)]" : "text-[var(--ink-muted)]"
              )}
            >
              {step.label}
            </span>
            {at && (
              <span className="mt-0.5 text-[12px] text-[var(--ink-muted)]">{formatShortDate(at)}</span>
            )}
            {entry && idx > 0 && (
              <span className="hidden sm:block text-[12px] text-[var(--ink-muted)] truncate max-w-full">
                {entry.actorName.split(" ")[0]}
              </span>
            )}
          </li>
        );
      })}
      {declined && (
        <li className="col-span-5 mt-3 flex items-center justify-center gap-2 text-[14.5px] font-semibold text-[var(--danger)]">
          <XCircle className="h-4 w-4" /> Declined
          {entryFor("declined") ? ` on ${formatShortDate(entryFor("declined")!.at)}` : ""}
        </li>
      )}
    </ol>
  );
}
