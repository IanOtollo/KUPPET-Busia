import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { announcementPriorityValidator, audienceTypeValidator } from "./lib/validators";

export const listActive = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const user = await requireUser(ctx);
    const list = await ctx.db
      .query("announcements")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .take(200);

    // Staff manage announcements, so they see everything. Members only get
    // announcements that are still current and addressed to them.
    const isStaff = ["official", "admin", "superadmin"].includes(user.role);
    const today = new Date().toISOString().slice(0, 10);
    const visible = isStaff
      ? list
      : list.filter((a) => {
          if (a.expiresAt && a.expiresAt.slice(0, 10) < today) return false;
          if (a.audienceType === "sub_county") return a.audienceValue === user.subCounty;
          if (a.audienceType === "designation") return a.audienceValue === user.designation;
          return true;
        });

    return visible.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
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
