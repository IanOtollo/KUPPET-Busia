import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireRole, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { announcementPriorityValidator, audienceTypeValidator } from "./lib/validators";

/** Durations an admin may choose before sending a notice. */
const ANNOUNCEMENT_DURATION_HOURS = [24, 48, 72, 96];

/** Legacy notices stored a date-only expiry (YYYY-MM-DD); new ones store a full ISO timestamp. */
function isExpired(expiresAt: string | undefined, nowIso: string): boolean {
  if (!expiresAt) return false;
  return expiresAt.length <= 10 ? expiresAt < nowIso.slice(0, 10) : expiresAt <= nowIso;
}

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
    const nowIso = new Date().toISOString();
    const visible = isStaff
      ? list
      : list.filter((a) => {
          if (isExpired(a.expiresAt, nowIso)) return false;
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
    durationHours: v.number(),
  },
  handler: async (ctx: MutationCtx, { durationHours, ...args }) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);
    if (!ANNOUNCEMENT_DURATION_HOURS.includes(durationHours)) {
      throw new Error("Choose how long this notice stays visible: 24, 48, 72 or 96 hours.");
    }
    const nowMs = Date.now();
    const now = new Date(nowMs).toISOString();

    const id = await ctx.db.insert("announcements", {
      ...args,
      publishedAt: now,
      expiresAt: new Date(nowMs + durationHours * 3600_000).toISOString(),
      createdBy: admin._id,
      isActive: true,
    });

    await writeAudit(ctx, {
      action: "announcement.created",
      entityType: "announcements",
      entityId: id,
      actorId: admin._id,
      actorRole: admin.role,
      metadata: { title: args.title, priority: args.priority, durationHours },
    });

    return id;
  },
});
