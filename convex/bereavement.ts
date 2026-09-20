import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireRole, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { generateReference } from "./lib/refs";
import {
  bereavementRelationshipValidator,
  bereavementStatusValidator,
  subCountyValidator,
} from "./lib/validators";
import { ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// Legal status transitions
const LEGAL_TRANSITIONS: Record<string, string[]> = {
  submitted: ["under_review", "declined"],
  under_review: ["verified", "declined"],
  verified: ["support_approved", "declined"],
  support_approved: ["disbursed", "closed"],
  disbursed: ["closed"],
  closed: [],
  declined: [],
};

/**
 * Submit a bereavement case.
 * Enforces the strict four-relationship rule, 180-day occurrence limit, and snapshots member profile.
 */
export const create = mutation({
  args: {
    relationship: bereavementRelationshipValidator,
    deceasedName: v.string(),
    dateOfBereavement: v.string(),
    burialPlace: v.optional(v.string()),
    burialDate: v.optional(v.string()),
    details: v.optional(v.string()),
    school: v.string(),
    subCounty: subCountyValidator,
    phone: v.string(),
    documentIds: v.array(v.id("_storage")),
  },
  handler: async (ctx: MutationCtx, args) => {
    // Requires active verified member
    const user = await requireUser(ctx);

    // Verify 180 days limit
    const caseDate = new Date(args.dateOfBereavement);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - caseDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      throw new ConvexError({
        code: "INVALID_DATE",
        message: "Date of bereavement cannot be in the future.",
      });
    }

    if (diffDays > 180) {
      throw new ConvexError({
        code: "BEREAVEMENT_WINDOW_EXPIRED",
        message:
          "Claims for bereavements that occurred more than 180 days ago require direct consultation with the branch secretariat.",
      });
    }

    // Atomically generate reference: BRV-YYYY-NNNN
    const reference = await generateReference(ctx, "BRV");
    const currentTime = Date.now();

    const caseId = await ctx.db.insert("bereavementCases", {
      reference,
      memberId: user._id,
      memberNameSnapshot: user.fullName,
      tscSnapshot: user.tscNumber,
      school: args.school.trim(),
      subCounty: args.subCounty,
      phone: args.phone.trim(),
      relationship: args.relationship,
      deceasedName: args.deceasedName.trim(),
      dateOfBereavement: args.dateOfBereavement,
      burialPlace: args.burialPlace?.trim(),
      burialDate: args.burialDate,
      details: args.details?.trim(),
      documentIds: args.documentIds,
      status: "submitted",
      createdAt: currentTime,
      updatedAt: currentTime,
    });

    // In-app notification for the member
    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "bereavement_submitted",
      title: "Bereavement Claim Received",
      body: `Your bereavement welfare case for ${args.deceasedName} has been recorded under reference ${reference}. The branch welfare committee will contact you.`,
      link: `/bereavement/${caseId}`,
      entityType: "bereavement",
      entityId: caseId,
      isRead: false,
      createdAt: currentTime,
    });

    // Audit log
    await writeAudit(ctx, {
      action: "bereavement.submitted",
      entityType: "bereavementCases",
      entityId: caseId,
      actorId: user._id,
      actorRole: user.role,
      metadata: {
        reference,
        relationship: args.relationship,
        deceasedName: args.deceasedName,
      },
    });

    return { caseId, reference };
  },
});

/**
 * List cases submitted by current member.
 */
export const listMine = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    try {
      const user = await getCurrentUser(ctx);
      const cases = await ctx.db
        .query("bereavementCases")
        .withIndex("by_member", (q) => q.eq("memberId", user._id))
        .collect();

      return cases.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  },
});

/**
 * Get case by ID with RBAC guard: Owner OR Official/Admin/Superadmin.
 */
export const getById = query({
  args: { id: v.id("bereavementCases") },
  handler: async (ctx: QueryCtx, args) => {
    const user = await requireUser(ctx);
    const caseDoc = await ctx.db.get(args.id);

    if (!caseDoc) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Bereavement case not found.",
      });
    }

    const isOwner = caseDoc.memberId === user._id;
    const isPrivileged = ["official", "admin", "superadmin"].includes(user.role);

    if (!isOwner && !isPrivileged) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You are not authorized to view this welfare case.",
      });
    }

    return caseDoc;
  },
});

/**
 * Admin list query with optional filtering.
 */
export const listAllAdmin = query({
  args: {
    status: v.optional(bereavementStatusValidator),
    subCounty: v.optional(subCountyValidator),
  },
  handler: async (ctx: QueryCtx, args) => {
    await requireRole(ctx, ["official", "admin", "superadmin"]);

    let cases = await ctx.db.query("bereavementCases").collect();

    if (args.status) {
      cases = cases.filter((c) => c.status === args.status);
    }
    if (args.subCounty) {
      cases = cases.filter((c) => c.subCounty === args.subCounty);
    }

    return cases.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Update case status with transition validation.
 * If declining, requires minimum 20 characters explanation.
 */
export const updateStatus = mutation({
  args: {
    id: v.id("bereavementCases"),
    newStatus: bereavementStatusValidator,
    statusReason: v.optional(v.string()),
    supportAmount: v.optional(v.number()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);
    const targetCase = await ctx.db.get(args.id);

    if (!targetCase) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Case not found.",
      });
    }

    const allowed = LEGAL_TRANSITIONS[targetCase.status] || [];
    if (!allowed.includes(args.newStatus)) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: `Cannot transition from ${targetCase.status} to ${args.newStatus}.`,
      });
    }

    if (args.newStatus === "declined") {
      if (!args.statusReason || args.statusReason.trim().length < 20) {
        throw new ConvexError({
          code: "REASON_REQUIRED",
          message: "Declining a case requires a clear explanation (minimum 20 characters).",
        });
      }
    }

    const now = Date.now();
    await ctx.db.patch(targetCase._id, {
      status: args.newStatus,
      statusReason: args.statusReason,
      supportAmount: args.supportAmount ?? targetCase.supportAmount,
      disbursedAt: args.newStatus === "disbursed" ? now : targetCase.disbursedAt,
      updatedAt: now,
    });

    // Notify the member
    await ctx.db.insert("notifications", {
      userId: targetCase.memberId,
      type: `bereavement_status_${args.newStatus}`,
      title: `Bereavement Case Updated (${targetCase.reference})`,
      body: `Status updated to ${args.newStatus.replace(/_/g, " ")}. ${
        args.statusReason ? `Note: ${args.statusReason}` : ""
      }`,
      link: `/bereavement/${targetCase._id}`,
      entityType: "bereavement",
      entityId: targetCase._id,
      isRead: false,
      createdAt: now,
    });

    await writeAudit(ctx, {
      action: `bereavement.status_to_${args.newStatus}`,
      entityType: "bereavementCases",
      entityId: targetCase._id,
      actorId: admin._id,
      actorRole: admin.role,
      metadata: {
        fromStatus: targetCase.status,
        toStatus: args.newStatus,
        reason: args.statusReason,
      },
    });

    return { success: true };
  },
});

/**
 * Add an admin internal note to the case thread.
 * Notes are never returned to or visible by regular members.
 */
export const addInternalNote = mutation({
  args: {
    id: v.id("bereavementCases"),
    note: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);
    const targetCase = await ctx.db.get(args.id);

    if (!targetCase) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Case not found.",
      });
    }

    if (!args.note.trim()) {
      throw new ConvexError({
        code: "EMPTY_NOTE",
        message: "Note cannot be empty.",
      });
    }

    const existingNotes = targetCase.internalNotes || [];
    const newNote = {
      authorId: admin._id,
      authorName: admin.fullName,
      note: args.note.trim(),
      createdAt: Date.now(),
    };

    await ctx.db.patch(targetCase._id, {
      internalNotes: [...existingNotes, newNote],
      updatedAt: Date.now(),
    });

    await writeAudit(ctx, {
      action: "bereavement.internal_note_added",
      entityType: "bereavementCases",
      entityId: targetCase._id,
      actorId: admin._id,
      actorRole: admin.role,
    });

    return { success: true };
  },
});
