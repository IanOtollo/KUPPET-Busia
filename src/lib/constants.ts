export const SUB_COUNTIES = [
  "Teso North",
  "Teso South",
  "Teso Central",
  "Nambale",
  "Matayos",
  "Butula",
  "Samia (Funyula)",
  "Bunyala (Budalangi)",
] as const;

export type SubCounty = (typeof SUB_COUNTIES)[number];

export const USER_ROLES = ["member", "official", "admin", "superadmin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = [
  "pending_verification",
  "pending_approval",
  "active",
  "suspended",
  "rejected",
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const DESIGNATIONS = [
  "Teacher",
  "Deputy Principal",
  "Principal",
  "HOD",
  "Other",
] as const;

export type Designation = (typeof DESIGNATIONS)[number];

export const SCHOOL_ROLES = [
  "Principal / Headteacher",
  "Deputy Principal",
  "Senior Teacher",
  "Head of Department (HOD)",
  "Games Master / Sports Director",
  "Guidance & Counseling Master",
  "Subject Teacher",
  "Class Teacher",
  "Patron / Club Advisor",
  "Teacher / Tutor",
] as const;

export type SchoolRole = (typeof SCHOOL_ROLES)[number];

export const TEACHING_SUBJECTS = [
  "Mathematics",
  "English",
  "Kiswahili",
  "Biology",
  "Chemistry",
  "Physics",
  "History & Government",
  "Geography",
  "CRE / IRE / HRE",
  "Agriculture",
  "Business Studies",
  "Computer Studies",
  "Home Science",
  "Music",
  "Art & Design",
  "French / Foreign Language",
  "Physical Education",
] as const;

export type TeachingSubject = (typeof TEACHING_SUBJECTS)[number];

export const GENDERS = ["Female", "Male", "Prefer not to say"] as const;
export type Gender = (typeof GENDERS)[number];

export const BEREAVEMENT_RELATIONSHIPS = [
  { value: "mother", label: "Mother", swahili: "Mama mzazi" },
  { value: "father", label: "Father", swahili: "Baba mzazi" },
  { value: "spouse", label: "Spouse", swahili: "Mke au mume wa ndoa" },
  { value: "child", label: "Child", swahili: "Mtoto wako mzazi au wa kisheria" },
] as const;

export type BereavementRelationship = (typeof BEREAVEMENT_RELATIONSHIPS)[number]["value"];

export const CONTRIBUTION_METHODS = [
  "Paybill",
  "Till Number",
  "Send Money (M-Pesa)",
  "Bank Account",
  "Other",
] as const;
export type ContributionMethod = (typeof CONTRIBUTION_METHODS)[number];

export const BEREAVEMENT_STATUSES = [
  "submitted",
  "under_review",
  "verified",
  "support_approved",
  "disbursed",
  "closed",
  "declined",
] as const;
export type BereavementStatus = (typeof BEREAVEMENT_STATUSES)[number];

// Mirrors convex/bereavement.ts's LEGAL_TRANSITIONS — kept here so the admin UI
// can offer only legal next-states instead of the full enum.
export const BEREAVEMENT_TRANSITIONS: Record<string, BereavementStatus[]> = {
  submitted: ["under_review", "declined"],
  under_review: ["verified", "declined"],
  verified: ["support_approved", "declined"],
  support_approved: ["disbursed", "closed"],
  disbursed: ["closed"],
  closed: [],
  declined: [],
};

export const HARASSMENT_CATEGORIES = [
  "Verbal abuse or intimidation",
  "Sexual harassment",
  "Physical assault",
  "Gender-based discrimination",
  "Victimisation over union activity",
  "Unfair workload or duty assignment",
  "Withholding of salary, leave or entitlements",
  "Bullying by a supervisor",
  "Bullying by a colleague",
  "Other",
] as const;

export type HarassmentCategory = (typeof HARASSMENT_CATEGORIES)[number];

export const HARASSMENT_INVOLVED_ROLES = [
  "Principal",
  "Deputy Principal",
  "HOD",
  "Fellow teacher",
  "Board member",
  "Parent",
  "Student",
  "Other",
] as const;

export type HarassmentInvolvedRole = (typeof HARASSMENT_INVOLVED_ROLES)[number];

export const HARASSMENT_STATUSES = [
  "submitted",
  "acknowledged",
  "under_investigation",
  "action_taken",
  "resolved",
  "referred",
  "closed_no_action",
] as const;
export type HarassmentStatus = (typeof HARASSMENT_STATUSES)[number];

// Mirrors convex/harassment.ts's LEGAL_HARASSMENT_TRANSITIONS.
export const HARASSMENT_TRANSITIONS: Record<string, HarassmentStatus[]> = {
  submitted: ["acknowledged", "under_investigation", "closed_no_action"],
  acknowledged: ["under_investigation", "referred", "closed_no_action"],
  under_investigation: ["action_taken", "referred", "resolved", "closed_no_action"],
  action_taken: ["resolved", "referred", "closed_no_action"],
  referred: ["resolved", "closed_no_action"],
  resolved: [],
  closed_no_action: [],
};

export const HARASSMENT_SUPPORT_OPTIONS = [
  "Legal advice & union representation",
  "Official dispute escalation with TSC / Ministry",
  "Conciliation / Internal mediation panel",
  "Psychosocial support / Counseling referral",
  "Inter-school transfer support",
  "Information / Guidance only",
] as const;

export type HarassmentSupportOption = (typeof HARASSMENT_SUPPORT_OPTIONS)[number];

export const BUS_PURPOSES = [
  "School Academic Trip / Symposium",
  "Sports / Athletics Competition",
  "Teachers Welfare / AGM Delegation",
  "Funeral / Bereavement Procession",
  "Union Member Educational Seminar",
  "Community / Institutional Event",
  "Other",
] as const;

export type BusPurpose = (typeof BUS_PURPOSES)[number];

export const BUS_BOOKING_STATUSES = [
  "requested",
  "under_review",
  "awaiting_payment",
  "payment_submitted",
  "approved",
  "confirmed",
  "completed",
  "declined",
  "cancelled",
] as const;
export type BusBookingStatus = (typeof BUS_BOOKING_STATUSES)[number];

// Admin-driven transitions; mirrors convex/busBookings.ts's LEGAL_BUS_TRANSITIONS.
// awaiting_payment -> payment_submitted is done by the member (busBookings.submitPayment).
export const BUS_TRANSITIONS: Record<string, BusBookingStatus[]> = {
  requested: ["awaiting_payment", "under_review", "declined", "cancelled"],
  under_review: ["awaiting_payment", "declined", "cancelled"],
  awaiting_payment: ["declined", "cancelled"],
  payment_submitted: ["confirmed", "awaiting_payment", "cancelled"],
  approved: ["confirmed", "declined", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  declined: [],
  cancelled: [],
};

export const BUS_STATUS_LABELS: Record<string, string> = {
  awaiting_payment: "Approve — member must pay",
  payment_submitted: "Payment received",
  confirmed: "Confirm payment & release bus",
};

export const BUS_CAPACITY = 62;

export const FINANCIAL_REPORT_CATEGORIES = [
  "Annual Accounts",
  "Quarterly Statement",
  "Audit Report",
  "Budget",
  "Project Statement",
  "AGM Minutes",
] as const;

export type FinancialReportCategory = (typeof FINANCIAL_REPORT_CATEGORIES)[number];

export const ANNOUNCEMENT_PRIORITIES = ["normal", "important", "urgent"] as const;
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number];

export const OFFICIAL_POSITIONS = [
  "Executive Secretary",
  "Assistant Executive Secretary",
  "Chairman",
  "Vice Chairman",
  "Treasurer",
  "Assistant Treasurer",
  "Organizing Secretary",
  "Secretary Secondary",
  "Secretary Junior Secondary",
  "Secretary Tertiary",
  "Gender Secretary",
  "Gender 1",
  "Gender 2 (PLWD)",
  "Gender 3 (Youths and Sports)",
] as const;

export type OfficialPosition = (typeof OFFICIAL_POSITIONS)[number];

export const JOB_GROUPS = ["C1", "C2", "C3", "C4", "C5", "D1", "D2", "D3", "D4", "D5"] as const;
export type JobGroup = (typeof JOB_GROUPS)[number];
