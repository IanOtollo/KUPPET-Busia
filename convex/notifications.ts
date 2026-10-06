import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getCurrentUser } from "./lib/auth";

/** Notifications disappear 24 hours after they are created. */
const NOTIFICATION_TTL_MS = 24 * 3600_000;

export const listMine = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    try {
      const user = await getCurrentUser(ctx);
      const list = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(100);

      const cutoff = Date.now() - NOTIFICATION_TTL_MS;
      return list.filter((n) => n.createdAt > cutoff).sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  },
});

export const markAsRead = mutation({
  args: { id: v.id("notifications") },
  handler: async (ctx: MutationCtx, args) => {
    const user = await getCurrentUser(ctx);
    const notif = await ctx.db.get(args.id);

    if (notif && notif.userId === user._id) {
      await ctx.db.patch(notif._id, { isRead: true });
    }
    return { success: true };
  },
});

/** Hourly cleanup: permanently delete notifications older than 24 hours. */
export const purgeExpired = internalMutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const cutoff = Date.now() - NOTIFICATION_TTL_MS;
    const stale = await ctx.db
      .query("notifications")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(500);
    for (const n of stale) await ctx.db.delete(n._id);
    if (stale.length === 500) {
      await ctx.scheduler.runAfter(0, internal.notifications.purgeExpired, {});
    }
  },
});

/** Mark all of the caller's unread notifications of one type as read. */
export const markTypeRead = mutation({
  args: { type: v.string() },
  handler: async (ctx: MutationCtx, args) => {
    const user = await getCurrentUser(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) => q.eq("userId", user._id).eq("isRead", false))
      .take(200);
    for (const n of unread.filter((n) => n.type === args.type)) {
      await ctx.db.patch(n._id, { isRead: true });
    }
    return { success: true };
  },
});
