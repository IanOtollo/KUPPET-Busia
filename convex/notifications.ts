import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./lib/auth";

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

      return list.sort((a, b) => b.createdAt - a.createdAt);
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
