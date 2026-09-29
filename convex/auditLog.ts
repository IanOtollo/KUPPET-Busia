import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";

export const listRecentAdmin = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx: QueryCtx, args) => {
    await requireRole(ctx, ["admin", "superadmin"]);
    const limit = Math.min(Math.max(Math.floor(args.limit || 50), 1), 200);

    return await ctx.db
      .query("auditLog")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);
  },
});
