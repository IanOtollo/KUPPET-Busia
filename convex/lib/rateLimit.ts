import { ConvexError } from "convex/values";
import { MutationCtx } from "../_generated/server";

/**
 * Fixed-window counter. Convex mutations can't see the caller's IP, so limits
 * are per key (a user id, or a global key for anonymous endpoints) — enough to
 * stop floods without blocking normal use. Throws when the limit is exceeded.
 */
export async function consumeRateLimit(
  ctx: MutationCtx,
  key: string,
  max: number,
  windowMs: number
) {
  const now = Date.now();
  const row = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();

  if (!row || now - row.windowStart >= windowMs) {
    if (row) await ctx.db.patch(row._id, { windowStart: now, count: 1 });
    else await ctx.db.insert("rateLimits", { key, windowStart: now, count: 1 });
    return;
  }

  if (row.count >= max) {
    throw new ConvexError({
      code: "RATE_LIMITED",
      message: "Too many requests right now. Please wait a while and try again.",
    });
  }
  await ctx.db.patch(row._id, { count: row.count + 1 });
}
