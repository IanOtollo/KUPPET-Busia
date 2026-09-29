import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireRole, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { financialCategoryValidator, visibilityValidator } from "./lib/validators";
import { ConvexError } from "convex/values";

/**
 * List active financial reports for member download.
 */
export const listActive = query({
  args: {
    category: v.optional(financialCategoryValidator),
  },
  handler: async (ctx: QueryCtx, args) => {
    // Statements are for signed-in, active accounts only — storage URLs are
    // permanent and unauthenticated, so they must never reach an anonymous caller.
    await requireUser(ctx);
    let reports = await ctx.db
      .query("financialReports")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    if (args.category) {
      reports = reports.filter((r) => r.category === args.category);
    }

    const sorted = reports.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

    return await Promise.all(
      sorted.map(async (report) => ({
        ...report,
        fileUrl: await ctx.storage.getUrl(report.storageId),
      }))
    );
  },
});

/** Creates a short-lived upload URL for a financial statement PDF. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    await requireRole(ctx, ["admin", "superadmin"]);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Admin mutation to upload / record a new financial statement PDF.
 */
export const create = mutation({
  args: {
    title: v.string(),
    period: v.string(),
    category: financialCategoryValidator,
    summary: v.optional(v.string()),
    storageId: v.id("_storage"),
    fileSize: v.number(),
    visibility: visibilityValidator,
    publishedAt: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);

    const id = await ctx.db.insert("financialReports", {
      ...args,
      uploadedBy: admin._id,
      downloadCount: 0,
      isActive: true,
      createdAt: Date.now(),
    });

    await writeAudit(ctx, {
      action: "financial.published",
      entityType: "financialReports",
      entityId: id,
      actorId: admin._id,
      actorRole: admin.role,
      metadata: { title: args.title, period: args.period },
    });

    return id;
  },
});

/**
 * Record a report download and audit entry.
 */
export const recordDownload = mutation({
  args: { id: v.id("financialReports") },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);
    const report = await ctx.db.get(args.id);

    if (!report) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Report not found." });
    }

    await ctx.db.patch(report._id, {
      downloadCount: report.downloadCount + 1,
    });

    await writeAudit(ctx, {
      action: "financial.downloaded",
      entityType: "financialReports",
      entityId: report._id,
      actorId: user._id,
      actorRole: user.role,
      metadata: { title: report.title },
    });

    return { success: true };
  },
});
