import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { announcementPriorityValidator, audienceTypeValidator } from "./lib/validators";

export const listActive = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const list = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return list.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    category: v.string(),
    priority: announcementPriorityValidator,
    audienceType: audienceTypeValidator,
    audienceValue: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);
    const now = new Date().toISOString();

    const id = await ctx.db.insert("announcements", {
      ...args,
      publishedAt: now,
      createdBy: admin._id,
      isActive: true,
    });

    await writeAudit(ctx, {
      action: "announcement.created",
      entityType: "announcements",
      entityId: id,
      actorId: admin._id,
      actorRole: admin.role,
      metadata: { title: args.title, priority: args.priority },
    });

    return id;
  },
});
