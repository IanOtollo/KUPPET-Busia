import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireRole, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { subCountyValidator, designationValidator } from "./lib/validators";

/**
 * A teacher reports a school transfer and/or promotion. The new school,
 * sub-county and designation take effect on their record immediately; every
 * admin/superadmin gets an in-app notification and the change is kept as a
 * history row they can acknowledge.
 */
export const report = mutation({
  args: {
    school: v.string(),
    subCounty: subCountyValidator,
    designation: designationValidator,
    effectiveDate: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);

    const school = args.school.trim();
    if (school.length < 3 || school.length > 120) {
      throw new ConvexError({
        code: "INVALID_SCHOOL",
        message: "Enter the school name (3-120 characters).",
      });
    }

    const unchanged =
      school.toLowerCase() === user.school.trim().toLowerCase() &&
      args.subCounty === user.subCounty &&
      args.designation === user.designation;
    if (unchanged) {
      throw new ConvexError({
        code: "NO_CHANGE",
        message: "These details match your current record. Change the school, sub-county or designation first.",
      });
    }

    const now = Date.now();
    await ctx.db.patch(user._id, {
      school,
      subCounty: args.subCounty,
      designation: args.designation,
      updatedAt: now,
    });

    const transferId = await ctx.db.insert("transfers", {
      memberId: user._id,
      memberName: user.fullName,
      tscNumber: user.tscNumber,
      fromSchool: user.school,
      toSchool: school,
      fromSubCounty: user.subCounty,
      toSubCounty: args.subCounty,
      fromDesignation: user.designation,
      toDesignation: args.designation,
      effectiveDate: args.effectiveDate?.trim() || undefined,
      reason: args.reason?.trim() || undefined,
      createdAt: now,
    });

    const movedSchool = school.toLowerCase() !== user.school.trim().toLowerCase();
    const promoted = args.designation !== user.designation;
    const kind = movedSchool && promoted ? "Transfer & promotion" : promoted ? "Promotion" : "Transfer";
    const body = [
      movedSchool ? `${user.school} (${user.subCounty}) → ${school} (${args.subCounty})` : null,
      promoted ? `${user.designation} → ${args.designation}` : null,
    ]
      .filter(Boolean)
      .join(" • ");

    const admins = [
      ...(await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).collect()),
      ...(await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "superadmin")).collect()),
    ].filter((a) => a.status === "active");

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        type: "member_transfer",
        title: `${kind}: ${user.fullName} (TSC ${user.tscNumber})`,
        body,
        link: "/admin/members",
        entityType: "transfers",
        entityId: transferId,
        isRead: false,
        createdAt: now,
      });
    }

    await writeAudit(ctx, {
      action: "user.transfer_reported",
      entityType: "users",
      entityId: user._id,
      actorId: user._id,
      actorRole: user.role,
      metadata: {
        from: { school: user.school, subCounty: user.subCounty, designation: user.designation },
        to: { school, subCounty: args.subCounty, designation: args.designation },
      },
    });

    return { success: true };
  },
});

/** Admin: recent transfer/promotion reports, newest first. */
export const listAll = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    await requireRole(ctx, ["admin", "superadmin"]);
    const rows = await ctx.db.query("transfers").withIndex("by_createdAt").order("desc").take(100);
    return rows;
  },
});

/** Admin: mark a reported transfer as reviewed. */
export const acknowledge = mutation({
  args: { id: v.id("transfers") },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError({ code: "NOT_FOUND", message: "Transfer record not found." });
    if (row.acknowledgedAt) return { success: true };

    await ctx.db.patch(row._id, { acknowledgedBy: admin._id, acknowledgedAt: Date.now() });
    await writeAudit(ctx, {
      action: "user.transfer_acknowledged",
      entityType: "transfers",
      entityId: row._id,
      actorId: admin._id,
      actorRole: admin.role,
    });
    return { success: true };
  },
});
