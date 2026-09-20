export const SUB_COUNTIES = [
  "Teso North",
  "Teso South",
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
  "approved",
  "confirmed",
  "completed",
  "declined",
  "cancelled",
] as const;
export type BusBookingStatus = (typeof BUS_BOOKING_STATUSES)[number];

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
  "Chairperson",
  "Vice Chairperson",
  "Assistant Executive Secretary",
  "Treasurer",
  "Organising Secretary",
  "Gender/Women Representative",
  "Youth Representative",
] as const;

export type OfficialPosition = (typeof OFFICIAL_POSITIONS)[number];
