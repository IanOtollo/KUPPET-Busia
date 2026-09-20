import { v } from "convex/values";

export const userRoleValidator = v.union(
  v.literal("member"),
  v.literal("official"),
  v.literal("admin"),
  v.literal("superadmin")
);

export const userStatusValidator = v.union(
  v.literal("pending_verification"),
  v.literal("pending_approval"),
  v.literal("active"),
  v.literal("suspended"),
  v.literal("rejected")
);

export const subCountyValidator = v.union(
  v.literal("Teso North"),
  v.literal("Teso South"),
  v.literal("Nambale"),
  v.literal("Matayos"),
  v.literal("Butula"),
  v.literal("Samia (Funyula)"),
  v.literal("Bunyala (Budalangi)")
);

export const designationValidator = v.union(
  v.literal("Teacher"),
  v.literal("Deputy Principal"),
  v.literal("Principal"),
  v.literal("HOD"),
  v.literal("Other")
);

// Non-negotiable requirement: ONLY these four relationships.
export const bereavementRelationshipValidator = v.union(
  v.literal("mother"),
  v.literal("father"),
  v.literal("spouse"),
  v.literal("child")
);

export const bereavementStatusValidator = v.union(
  v.literal("submitted"),
  v.literal("under_review"),
  v.literal("verified"),
  v.literal("support_approved"),
  v.literal("disbursed"),
  v.literal("closed"),
  v.literal("declined")
);

export const harassmentCategoryValidator = v.union(
  v.literal("Verbal abuse or intimidation"),
  v.literal("Sexual harassment"),
  v.literal("Physical assault"),
  v.literal("Gender-based discrimination"),
  v.literal("Victimisation over union activity"),
  v.literal("Unfair workload or duty assignment"),
  v.literal("Withholding of salary, leave or entitlements"),
  v.literal("Bullying by a supervisor"),
  v.literal("Bullying by a colleague"),
  v.literal("Other")
);

export const harassmentRoleValidator = v.union(
  v.literal("Principal"),
  v.literal("Deputy Principal"),
  v.literal("HOD"),
  v.literal("Fellow teacher"),
  v.literal("Board member"),
  v.literal("Parent"),
  v.literal("Student"),
  v.literal("Other")
);

export const harassmentStatusValidator = v.union(
  v.literal("submitted"),
  v.literal("acknowledged"),
  v.literal("under_investigation"),
  v.literal("action_taken"),
  v.literal("resolved"),
  v.literal("referred"),
  v.literal("closed_no_action")
);

export const busPurposeValidator = v.union(
  v.literal("Funeral / Bereavement Procession"),
  v.literal("Union Member Educational Seminar"),
  v.literal("School Academic Trip / Symposium"),
  v.literal("Sports / Athletics Competition"),
  v.literal("Teachers Welfare / AGM Delegation"),
  v.literal("Community / Institutional Event"),
  v.literal("Other")
);

export const busBookingStatusValidator = v.union(
  v.literal("requested"),
  v.literal("under_review"),
  v.literal("approved"),
  v.literal("confirmed"),
  v.literal("completed"),
  v.literal("declined"),
  v.literal("cancelled")
);

export const officialTierValidator = v.union(
  v.literal("executive"),
  v.literal("official"),
  v.literal("subcounty")
);

export const financialCategoryValidator = v.union(
  v.literal("Annual Accounts"),
  v.literal("Quarterly Statement"),
  v.literal("Audit Report"),
  v.literal("Budget"),
  v.literal("Project Statement"),
  v.literal("AGM Minutes")
);

export const visibilityValidator = v.union(
  v.literal("members_only"),
  v.literal("public")
);

export const announcementPriorityValidator = v.union(
  v.literal("normal"),
  v.literal("important"),
  v.literal("urgent")
);

export const audienceTypeValidator = v.union(
  v.literal("all"),
  v.literal("sub_county"),
  v.literal("designation")
);
