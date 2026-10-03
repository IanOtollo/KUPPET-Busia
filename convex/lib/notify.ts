import { MutationCtx } from "../_generated/server";

/** In-app notification to every active admin and superadmin. */
export async function notifyAdmins(
  ctx: MutationCtx,
  n: {
    type: string;
    title: string;
    body: string;
    link?: string;
    entityType?: string;
    entityId?: string;
  }
) {
  const admins = [
    ...(await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).collect()),
    ...(await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "superadmin")).collect()),
  ].filter((a) => a.status === "active");

  const now = Date.now();
  for (const admin of admins) {
    await ctx.db.insert("notifications", { userId: admin._id, ...n, isRead: false, createdAt: now });
  }
  return admins.length;
}
