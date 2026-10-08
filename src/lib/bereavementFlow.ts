import type { BereavementStatus } from "@/lib/constants";

/** The five steps shown on the timeline (declined/closed sit outside the happy path). */
export const FLOW_STEPS: { key: BereavementStatus; label: string }[] = [
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "verified", label: "Verified" },
  { key: "support_approved", label: "Approved" },
  { key: "disbursed", label: "Disbursed" },
];

/** Queue tabs, grouped by what the admin has to do next. */
export const QUEUE_TABS = [
  { key: "needs_review", label: "Needs review", statuses: ["submitted", "under_review"] },
  { key: "awaiting_approval", label: "Awaiting approval", statuses: ["verified"] },
  { key: "ready_to_pay", label: "Ready to pay", statuses: ["support_approved"] },
  { key: "done", label: "Completed", statuses: ["disbursed", "closed"] },
  { key: "declined", label: "Declined", statuses: ["declined"] },
  { key: "all", label: "All", statuses: [] as string[] },
] as const;

export type QueueTabKey = (typeof QUEUE_TABS)[number]["key"];

export function tabForStatus(status: string): QueueTabKey {
  return QUEUE_TABS.find((t) => (t.statuses as readonly string[]).includes(status))?.key ?? "all";
}

/** Statuses where an admin still has something to do. */
export const ACTIONABLE = new Set<string>(["submitted", "under_review", "verified", "support_approved"]);

export interface FlowAction {
  to: BereavementStatus;
  label: string;
  /** What the admin is told this does, shown under the button. */
  hint: string;
}

export interface FlowPlan {
  primary?: FlowAction;
  secondary: FlowAction[];
  canDecline: boolean;
  /** Which inputs this step needs. */
  needs: { amount?: boolean; payment?: boolean; documentsChecked?: boolean };
}

export function planFor(status: string): FlowPlan {
  switch (status) {
    case "submitted":
      return {
        primary: {
          to: "verified",
          label: "Verify claim",
          hint: "Confirms the documents are in order and tells every member how to contribute.",
        },
        secondary: [{ to: "under_review", label: "Mark as under review", hint: "Tell the member you are looking at it." }],
        canDecline: true,
        needs: { documentsChecked: true },
      };
    case "under_review":
      return {
        primary: {
          to: "verified",
          label: "Verify claim",
          hint: "Confirms the documents are in order and tells every member how to contribute.",
        },
        secondary: [],
        canDecline: true,
        needs: { documentsChecked: true },
      };
    case "verified":
      return {
        primary: { to: "support_approved", label: "Approve relief", hint: "Set the amount the member will receive." },
        secondary: [],
        canDecline: true,
        needs: { amount: true },
      };
    case "support_approved":
      return {
        primary: { to: "disbursed", label: "Record payment", hint: "Log how and under what reference it was paid." },
        secondary: [{ to: "closed", label: "Close without payment", hint: "Close the case with nothing paid." }],
        canDecline: false,
        needs: { payment: true },
      };
    case "disbursed":
      return {
        primary: { to: "closed", label: "Close case", hint: "Files the case away. Nothing more to do." },
        secondary: [],
        canDecline: false,
        needs: {},
      };
    default:
      return { secondary: [], canDecline: false, needs: {} };
  }
}

export const PAYMENT_METHODS = ["M-Pesa", "Bank transfer", "Cheque", "Cash"] as const;

/** When the case entered its current status (falls back for older cases with no history). */
export function enteredStatusAt(c: {
  updatedAt: number;
  history?: { at: number }[];
}): number {
  const last = c.history?.[c.history.length - 1];
  return last ? last.at : c.updatedAt;
}

export function daysSince(ts: number, now = Date.now()): number {
  return Math.max(0, Math.floor((now - ts) / 86_400_000));
}
