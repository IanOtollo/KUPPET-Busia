import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import {
  userRoleValidator,
  userStatusValidator,
  subCountyValidator,
  designationValidator,
  bereavementRelationshipValidator,
  bereavementStatusValidator,
  harassmentCategoryValidator,
  harassmentRoleValidator,
  harassmentStatusValidator,
  busPurposeValidator,
  busBookingStatusValidator,
  officialTierValidator,
  financialCategoryValidator,
  visibilityValidator,
  announcementPriorityValidator,
  audienceTypeValidator,
  jobGroupValidator,
  contributionMethodValidator,
} from "./lib/validators";

export default defineSchema({
  ...authTables,

  users: defineTable({
    authId: v.optional(v.string()),
    fullName: v.string(),
    idNumber: v.string(),
    tscNumber: v.string(),
    phone: v.string(),
    email: v.string(),
    school: v.string(),
    subCounty: subCountyValidator,
    designation: designationValidator,
    schoolRole: v.optional(v.string()),
    subjects: v.optional(v.array(v.string())),
    gender: v.optional(v.string()),
    jobGroup: v.optional(jobGroupValidator),
    // ISO date (YYYY-MM-DD) the teacher reported to their current school; drives "length of stay".
    schoolStartDate: v.optional(v.string()),
    role: userRoleValidator,
    status: userStatusValidator,
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    photoStorageId: v.optional(v.id("_storage")),
    lastLoginAt: v.optional(v.number()),
    failedLoginCount: v.number(),
    lockedUntil: v.optional(v.number()),
    // Set when an admin approves a password reset: the account then uses the
    // teacher's TSC number as a one-time password and must be changed on first
    // login (enforced server-side in requireUser). Expires so an unused
    // temporary password can't be picked up later by someone else.
    mustChangePassword: v.optional(v.boolean()),
    // Staff account created without a usable password: the first sign-in
    // attempt prompts the person to create one (passwordSetup.completeFirstSetup).
    passwordSetupPending: v.optional(v.boolean()),
    tempPasswordExpiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_tsc", ["tscNumber"])
    .index("by_idNumber", ["idNumber"])
    .index("by_phone", ["phone"])
    .index("by_role", ["role"])
    .index("by_role_status", ["role", "status"])
    .index("by_status", ["status"])
    .index("by_subCounty", ["subCounty"])
    .index("by_authId", ["authId"])
    // Alphabetical, paginated member lists without loading the whole table.
    .index("by_role_fullName", ["role", "fullName"])
    .index("by_role_status_fullName", ["role", "status", "fullName"])
    // A school's staff roster, fetched one school at a time.
    .index("by_school", ["school"])
    // Name search for the admin Members page and global search.
    .searchIndex("search_name", { searchField: "fullName", filterFields: ["role", "status"] }),

  // Small pre-computed figures (member totals etc.) refreshed by a cron, so
  // dashboards read one row instead of counting thousands.
  stats: defineTable({
    key: v.string(),
    data: v.any(),
    updatedAt: v.number(),
    // When a refresh is already scheduled (so bursts of changes share one).
    queuedAt: v.optional(v.number()),
  }).index("by_key", ["key"]),

  // Fixed-window counters used to throttle anonymous / high-abuse endpoints.
  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_key", ["key"]),

  // Password-reset requests raised by teachers and actioned by an admin.
  passwordResets: defineTable({
    userId: v.id("users"),
    tscNumber: v.string(),
    memberName: v.string(),
    status: v.union(
      v.literal("requested"),
      v.literal("approved"),
      v.literal("completed"),
      v.literal("declined")
    ),
    requestedAt: v.number(),
    handledBy: v.optional(v.id("users")),
    handledAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // Teacher-reported school transfers / promotions. The change is applied to the
  // member's record immediately; this row is the admin-facing notice + history.
  transfers: defineTable({
    memberId: v.id("users"),
    memberName: v.string(),
    tscNumber: v.string(),
    fromSchool: v.string(),
    toSchool: v.string(),
    fromSubCounty: subCountyValidator,
    toSubCounty: subCountyValidator,
    fromDesignation: designationValidator,
    toDesignation: designationValidator,
    effectiveDate: v.optional(v.string()),
    reason: v.optional(v.string()),
    fromJobGroup: v.optional(jobGroupValidator),
    toJobGroup: v.optional(jobGroupValidator),
    // Days the teacher spent at fromSchool (null when their start date was never recorded).
    previousStayDays: v.optional(v.number()),
    previousSchoolStartDate: v.optional(v.string()),
    acknowledgedBy: v.optional(v.id("users")),
    acknowledgedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_member", ["memberId"])
    .index("by_createdAt", ["createdAt"]),

  bereavementCases: defineTable({
    reference: v.string(),
    memberId: v.id("users"),
    memberNameSnapshot: v.string(),
    tscSnapshot: v.string(),
    school: v.string(),
    subCounty: subCountyValidator,
    phone: v.string(),
    relationship: bereavementRelationshipValidator,
    deceasedName: v.string(),
    dateOfBereavement: v.string(),
    burialPlace: v.optional(v.string()),
    burialDate: v.optional(v.string()),
    details: v.optional(v.string()),
    documentIds: v.array(v.id("_storage")),
    burialPermitId: v.optional(v.id("_storage")),
    payslipId: v.optional(v.id("_storage")),
    // Where colleagues should send contributions towards the burial. Shared
    // with every member once an admin approves (verifies) the claim.
    contributionMethod: v.optional(contributionMethodValidator),
    contributionNumber: v.optional(v.string()),
    contributionAccount: v.optional(v.string()),
    contributionNote: v.optional(v.string()),
    contributionBroadcastAt: v.optional(v.number()),
    status: bereavementStatusValidator,
    // Coarse queue bucket derived from status, so the admin queue can page through
    // one bucket at a time without scanning every claim.
    stage: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("declined"))
    ),
    statusReason: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    supportAmount: v.optional(v.number()),
    disbursedAt: v.optional(v.number()),
    // How and under what reference the relief was paid out (set at disbursement).
    paymentMethod: v.optional(v.string()),
    paymentReference: v.optional(v.string()),
    // One entry per step taken, so the admin timeline can show who and when.
    history: v.optional(
      v.array(
        v.object({
          status: bereavementStatusValidator,
          at: v.number(),
          actorName: v.string(),
          note: v.optional(v.string()),
        })
      )
    ),
    internalNotes: v.optional(
      v.array(
        v.object({
          authorId: v.id("users"),
          authorName: v.string(),
          note: v.string(),
          createdAt: v.number(),
        })
      )
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_member", ["memberId"])
    .index("by_status", ["status"])
    .index("by_stage", ["stage", "createdAt"])
    .index("by_subCounty", ["subCounty"])
    .index("by_createdAt", ["createdAt"])
    .index("by_reference", ["reference"]),

  // Teachers looking to swap schools with a colleague.
  swapRequests: defineTable({
    memberId: v.id("users"),
    memberName: v.string(),
    tscNumber: v.string(),
    school: v.string(),
    subCounty: subCountyValidator,
    jobGroup: v.optional(jobGroupValidator),
    subjects: v.array(v.string()),
    targetSubCounty: subCountyValidator,
    targetSchool: v.optional(v.string()),
    note: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("closed")),
    createdAt: v.number(),
    closedAt: v.optional(v.number()),
  })
    .index("by_member", ["memberId"])
    .index("by_status", ["status", "createdAt"]),

  harassmentReports: defineTable({
    reference: v.string(),
    memberId: v.optional(v.id("users")),
    isAnonymous: v.boolean(),
    reporterName: v.optional(v.string()),
    reporterContact: v.optional(v.string()),
    school: v.string(),
    subCounty: subCountyValidator,
    category: harassmentCategoryValidator,
    categoryOther: v.optional(v.string()),
    involvedRole: harassmentRoleValidator,
    involvedName: v.optional(v.string()),
    occurredAt: v.string(),
    isOngoing: v.boolean(),
    narrative: v.string(),
    reportedElsewhere: v.boolean(),
    reportedElsewhereDetail: v.optional(v.string()),
    supportNeeded: v.array(v.string()),
    evidenceIds: v.array(v.id("_storage")),
    status: harassmentStatusValidator,
    statusReason: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    internalNotes: v.optional(
      v.array(
        v.object({
          authorId: v.id("users"),
          authorName: v.string(),
          note: v.string(),
          createdAt: v.number(),
        })
      )
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_member", ["memberId"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_createdAt", ["createdAt"])
    .index("by_reference", ["reference"]),

  busBookings: defineTable({
    reference: v.string(),
    memberId: v.id("users"),
    requesterName: v.string(),
    phone: v.string(),
    school: v.string(),
    purpose: busPurposeValidator,
    reason: v.string(),
    departureAt: v.string(),
    returnAt: v.string(),
    departurePoint: v.string(),
    destination: v.string(),
    distanceKm: v.optional(v.number()),
    passengers: v.number(),
    tripContactName: v.string(),
    tripContactPhone: v.string(),
    extraRequirements: v.optional(v.string()),
    status: busBookingStatusValidator,
    statusReason: v.optional(v.string()),
    driverName: v.optional(v.string()),
    driverPhone: v.optional(v.string()),
    // Amount the member must pay once the admin approves the request.
    contributionKes: v.optional(v.number()),
    adminRemarks: v.optional(v.string()),
    paymentReference: v.optional(v.string()),
    paymentSubmittedAt: v.optional(v.number()),
    paymentConfirmedAt: v.optional(v.number()),
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_member", ["memberId"])
    .index("by_status", ["status"])
    .index("by_departureAt", ["departureAt"])
    .index("by_reference", ["reference"]),

  officials: defineTable({
    fullName: v.string(),
    position: v.string(),
    responsibilities: v.string(),
    portfolioArea: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    photoStorageId: v.optional(v.id("_storage")),
    displayOrder: v.number(),
    tier: officialTierValidator,
    termStart: v.optional(v.string()),
    termEnd: v.optional(v.string()),
    canHandleHarassment: v.boolean(),
    linkedUserId: v.optional(v.id("users")),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_order", ["displayOrder"])
    .index("by_active", ["isActive"])
    .index("by_tier", ["tier"]),

  financialReports: defineTable({
    title: v.string(),
    period: v.string(),
    category: financialCategoryValidator,
    summary: v.optional(v.string()),
    storageId: v.id("_storage"),
    fileSize: v.number(),
    visibility: visibilityValidator,
    publishedAt: v.string(),
    uploadedBy: v.id("users"),
    downloadCount: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_publishedAt", ["publishedAt"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  announcements: defineTable({
    title: v.string(),
    body: v.string(),
    category: v.string(),
    priority: announcementPriorityValidator,
    audienceType: audienceTypeValidator,
    audienceValue: v.optional(v.string()),
    attachmentId: v.optional(v.id("_storage")),
    publishedAt: v.string(),
    expiresAt: v.optional(v.string()),
    createdBy: v.id("users"),
    isActive: v.boolean(),
  })
    .index("by_publishedAt", ["publishedAt"])
    .index("by_active", ["isActive"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    body: v.string(),
    link: v.optional(v.string()),
    entityType: v.optional(v.string()),
    entityId: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_createdAt", ["createdAt"]),

  auditLog: defineTable({
    actorId: v.optional(v.id("users")),
    actorRole: v.optional(v.string()),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    ipHash: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_actor", ["actorId"])
    .index("by_entity", ["entityType", "entityId"])
    .index("by_createdAt", ["createdAt"]),

  counters: defineTable({
    key: v.string(),
    value: v.number(),
  }).index("by_key", ["key"]),

  schools: defineTable({
    name: v.string(),
    subCounty: subCountyValidator,
    isActive: v.boolean(),
    // "teacher" when the school was added automatically by a teacher registering
    // under a name that wasn't in the directory yet; absent for admin-added schools.
    addedBy: v.optional(v.literal("teacher")),
    addedAt: v.optional(v.number()),
  })
    .index("by_subCounty", ["subCounty"])
    .index("by_name", ["name"]),

  settings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),

  messages: defineTable({
    threadId: v.string(),        // sorted "userId1_userId2"
    senderId: v.id("users"),
    recipientId: v.id("users"),
    body: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_thread", ["threadId", "createdAt"])
    .index("by_sender", ["senderId", "createdAt"])
    .index("by_recipient", ["recipientId", "createdAt"])
    .index("by_recipient_unread", ["recipientId", "isRead"]),
});
