import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireRole, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { generateReference } from "./lib/refs";
import {
  harassmentCategoryValidator,
  harassmentRoleValidator,
  harassmentStatusValidator,
  subCountyValidator,
} from "./lib/validators";
import { ConvexError } from "convex/values";

const LEGAL_HARASSMENT_TRANSITIONS: Record<string, string[]> = {
  submitted: ["acknowledged", "under_investigation", "closed_no_action"],
  acknowledged: ["under_investigation", "referred", "closed_no_action"],
  under_investigation: ["action_taken", "referred", "resolved", "closed_no_action"],
  action_taken: ["resolved", "referred", "closed_no_action"],
  referred: ["resolved", "closed_no_action"],
  resolved: [],
  closed_no_action: [],
};

/**
 * Check if the caller is authorized to view sensitive harassment reports.
 * Caller must be admin, superadmin, or an official with canHandleHarassment === true.
 */
async function requireHarassmentHandler(ctx: QueryCtx | MutationCtx) {
  const user = await requireUser(ctx);

  if (["admin", "superadmin"].includes(user.role)) {
    return user;
  }

  if (user.role === "official") {
    const officialDoc = await ctx.db
      .query("officials")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .filter((q) => q.eq(q.field("linkedUserId"), user._id))
      .first();

    if (officialDoc && officialDoc.canHandleHarassment) {
      return user;
    }
  }

  throw new ConvexError({
    code: "FORBIDDEN",
    message: "You are not an authorized harassment grievance officer.",
  });
}

/**
 * Submit a safe harassment report.
 * If isAnonymous is true, reporterName, reporterContact, and memberId are omitted entirely from DB record.
 */
export const create = mutation({
  args: {
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
  },
  handler: async (ctx: MutationCtx, args) => {
    // Narrative 50 to 2500 chars
    const cleanNarrative = args.narrative.trim();
    if (cleanNarrative.length < 50 || cleanNarrative.length > 2500) {
      throw new ConvexError({
        code: "INVALID_NARRATIVE",
        message: "Report narrative must be between 50 and 2,500 characters.",
      });
    }

    let memberId = undefined;
    let reporterName = undefined;
    let reporterContact = undefined;

    if (!args.isAnonymous) {
      try {
        const user = await getCurrentUser(ctx);
        memberId = user._id;
        reporterName = args.reporterName || user.fullName;
        reporterContact = args.reporterContact || user.phone;
      } catch {
        // Unauthenticated non-anonymous provided details
        reporterName = args.reporterName;
        reporterContact = args.reporterContact;
      }
    }

    const reference = await generateReference(ctx, "HAR");
    const currentTime = Date.now();

    const reportId = await ctx.db.insert("harassmentReports", {
      reference,
      memberId,
      isAnonymous: args.isAnonymous,
      reporterName,
      reporterContact,
      school: args.school.trim(),
      subCounty: args.subCounty,
      category: args.category,
      categoryOther: args.categoryOther?.trim(),
      involvedRole: args.involvedRole,
      involvedName: args.involvedName?.trim(),
      occurredAt: args.occurredAt,
      isOngoing: args.isOngoing,
      narrative: cleanNarrative,
      reportedElsewhere: args.reportedElsewhere,
      reportedElsewhereDetail: args.reportedElsewhereDetail?.trim(),
      supportNeeded: args.supportNeeded,
      evidenceIds: args.evidenceIds,
      status: "submitted",
      createdAt: currentTime,
      updatedAt: currentTime,
    });

    await writeAudit(ctx, {
      action: "harassment.reported",
      entityType: "harassmentReports",
      entityId: reportId,
      metadata: {
        reference,
        isAnonymous: args.isAnonymous,
        category: args.category,
        subCounty: args.subCounty,
      },
    });

    return { reportId, reference };
  },
});

/**
 * Member query for own non-anonymous reports.
 */
export const listMine = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    try {
      const user = await getCurrentUser(ctx);
      const reports = await ctx.db
        .query("harassmentReports")
        .withIndex("by_member", (q) => q.eq("memberId", user._id))
        .collect();

      return reports.map((r) => ({
        _id: r._id,
        reference: r.reference,
        category: r.category,
        school: r.school,
        subCounty: r.subCounty,
        occurredAt: r.occurredAt,
        status: r.status,
        createdAt: r.createdAt,
      }));
    } catch {
      return [];
    }
  },
});

/**
 * Public/Member lookup by Reference Code (essential for anonymous reporters!).
 */
export const getByReference = query({
  args: { reference: v.string() },
  handler: async (ctx: QueryCtx, args) => {
    const report = await ctx.db
      .query("harassmentReports")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference.trim()))
      .first();

    if (!report) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Report not found." });
    }

    // Return redacted tracking info ONLY for non-handlers
    return {
      reference: report.reference,
      category: report.category,
      subCounty: report.subCounty,
      status: report.status,
      statusReason: report.statusReason,
      occurredAt: report.occurredAt,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  },
});

/**
 * Admin list query — returns summary fields ONLY (NO narrative, NO reporter name in list view).
 */
export const listAllAdmin = query({
  args: {
    status: v.optional(harassmentStatusValidator),
    category: v.optional(harassmentCategoryValidator),
  },
  handler: async (ctx: QueryCtx, args) => {
    await requireHarassmentHandler(ctx);

    let reports = await ctx.db.query("harassmentReports").collect();

    if (args.status) {
      reports = reports.filter((r) => r.status === args.status);
    }
    if (args.category) {
      reports = reports.filter((r) => r.category === args.category);
    }

    // Return sanitized summary array (no narrative, no reporter name in list view!)
    return reports
      .map((r) => ({
        _id: r._id,
        reference: r.reference,
        isAnonymous: r.isAnonymous,
        category: r.category,
        school: r.school,
        subCounty: r.subCounty,
        involvedRole: r.involvedRole,
        occurredAt: r.occurredAt,
        status: r.status,
        createdAt: r.createdAt,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Admin detail query — MUST audit every single open!
 */
export const getByIdAdmin = mutation({
  args: { id: v.id("harassmentReports") },
  handler: async (ctx: MutationCtx, args) => {
    const handlerUser = await requireHarassmentHandler(ctx);

    const report = await ctx.db.get(args.id);
    if (!report) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Report not found." });
    }

    // Audit-on-view rule: Every view is recorded in audit log
    await writeAudit(ctx, {
      action: "harassment.view",
      entityType: "harassmentReports",
      entityId: report._id,
      actorId: handlerUser._id,
      actorRole: handlerUser.role,
      metadata: { reference: report.reference, viewerName: handlerUser.fullName },
    });

    return report;
  },
});

/**
 * Admin mutation to update status of a harassment report.
 */
export const updateStatus = mutation({
  args: {
    id: v.id("harassmentReports"),
    newStatus: harassmentStatusValidator,
    statusReason: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const handlerUser = await requireHarassmentHandler(ctx);
    const report = await ctx.db.get(args.id);

    if (!report) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Report not found." });
    }

    const allowed = LEGAL_HARASSMENT_TRANSITIONS[report.status] || [];
    if (!allowed.includes(args.newStatus)) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: `Cannot transition from ${report.status} to ${args.newStatus}.`,
      });
    }

    if (args.newStatus === "closed_no_action" && (!args.statusReason || args.statusReason.trim().length < 20)) {
      throw new ConvexError({
        code: "REASON_REQUIRED",
        message: "Closing a report with no action requires a reason (minimum 20 characters).",
      });
    }

    const now = Date.now();
    await ctx.db.patch(report._id, {
      status: args.newStatus,
      statusReason: args.statusReason?.trim(),
      updatedAt: now,
    });

    await writeAudit(ctx, {
      action: `harassment.status_to_${args.newStatus}`,
      entityType: "harassmentReports",
      entityId: report._id,
      actorId: handlerUser._id,
      actorRole: handlerUser.role,
      metadata: { fromStatus: report.status, toStatus: args.newStatus },
    });

    return { success: true };
  },
});
