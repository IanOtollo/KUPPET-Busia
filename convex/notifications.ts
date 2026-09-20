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
        .collect();

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
