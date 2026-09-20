import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";

export const listRecentAdmin = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx: QueryCtx, args) => {
    await requireRole(ctx, ["admin", "superadmin"]);
    const limit = args.limit || 50;

    const logs = await ctx.db.query("auditLog").collect();
    return logs.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  },
});
