import * as React from "react";
import { Badge } from "@/components/ui/badge";

export type AnyStatus =
  | "pending_verification"
  | "pending_approval"
  | "active"
  | "suspended"
  | "rejected"
  | "submitted"
  | "under_review"
  | "verified"
  | "support_approved"
  | "disbursed"
  | "closed"
  | "declined"
  | "acknowledged"
  | "under_investigation"
  | "action_taken"
  | "resolved"
  | "referred"
  | "closed_no_action"
  | "requested"
  | "approved"
  | "confirmed"
  | "completed"
  | "cancelled";

const STATUS_CONFIG: Record<
  AnyStatus,
  { label: string; variant: "info" | "warning" | "success" | "danger" | "neutral" | "brass" }
> = {
  pending_verification: { label: "Pending Verification", variant: "info" },
  pending_approval: { label: "Pending Approval", variant: "warning" },
  active: { label: "Active", variant: "success" },
  suspended: { label: "Suspended", variant: "danger" },
  rejected: { label: "Rejected", variant: "danger" },

  submitted: { label: "Submitted", variant: "info" },
  under_review: { label: "Under Review", variant: "warning" },
  verified: { label: "Verified", variant: "success" },
  support_approved: { label: "Approved", variant: "success" },
  disbursed: { label: "Disbursed", variant: "success" },
  closed: { label: "Closed", variant: "neutral" },
  declined: { label: "Declined", variant: "danger" },

  acknowledged: { label: "Acknowledged", variant: "info" },
  under_investigation: { label: "Under Investigation", variant: "warning" },
  action_taken: { label: "Action Taken", variant: "success" },
  resolved: { label: "Resolved", variant: "success" },
  referred: { label: "Referred", variant: "neutral" },
  closed_no_action: { label: "Closed (No Action)", variant: "neutral" },

  requested: { label: "Requested", variant: "info" },
  approved: { label: "Approved", variant: "success" },
  confirmed: { label: "Confirmed", variant: "success" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "danger" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as AnyStatus] || {
    label: status.replace(/_/g, " "),
    variant: "neutral" as const,
  };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}

