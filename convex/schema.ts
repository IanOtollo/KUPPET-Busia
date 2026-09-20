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
    role: userRoleValidator,
    status: userStatusValidator,
    approvedBy: v.optional(v.id("users")),
    approvedAt: v.optional(v.number()),
    photoStorageId: v.optional(v.id("_storage")),
    lastLoginAt: v.optional(v.number()),
    failedLoginCount: v.number(),
    lockedUntil: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_tsc", ["tscNumber"])
    .index("by_idNumber", ["idNumber"])
    .index("by_phone", ["phone"])
    .index("by_role", ["role"])
    .index("by_status", ["status"])
    .index("by_subCounty", ["subCounty"])
    .index("by_authId", ["authId"]),

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
    status: bereavementStatusValidator,
    statusReason: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    supportAmount: v.optional(v.number()),
    disbursedAt: v.optional(v.number()),
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
    .index("by_subCounty", ["subCounty"])
    .index("by_createdAt", ["createdAt"])
    .index("by_reference", ["reference"]),

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
    contributionKes: v.optional(v.number()),
    adminRemarks: v.optional(v.string()),
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
    .index("by_user_unread", ["userId", "isRead"]),

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
    .index("by_recipient_unread", ["recipientId", "isRead"]),
});
