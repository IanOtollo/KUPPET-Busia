/** Statuses where the admin has not yet decided. (Older claims may sit in the retired review steps.) */
export const OPEN_STATUSES = ["submitted", "under_review", "verified"] as const;
/** Statuses that count as approved. */
export const APPROVED_STATUSES = ["support_approved", "disbursed", "closed"] as const;

export const isOpen = (status: string) => (OPEN_STATUSES as readonly string[]).includes(status);
export const isApproved = (status: string) => (APPROVED_STATUSES as readonly string[]).includes(status);

/** Queue tabs. The admin's whole job is: Pending -> Approved or Declined. */
export const QUEUE_TABS = [
  { key: "pending", label: "Pending", match: isOpen },
  { key: "approved", label: "Approved", match: isApproved },
  { key: "declined", label: "Declined", match: (s: string) => s === "declined" },
  { key: "all", label: "All", match: () => true },
] as const;

export type QueueTabKey = (typeof QUEUE_TABS)[number]["key"];

export function daysSince(ts: number, now = Date.now()): number {
  return Math.max(0, Math.floor((now - ts) / 86_400_000));
}
