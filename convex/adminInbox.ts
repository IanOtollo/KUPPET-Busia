import { query, QueryCtx } from "./_generated/server";
import { requireRole } from "./lib/auth";

/**
 * Small, bounded "what needs attention" feed for the admin sidebar badges and
 * notification bell. Reads only rows in a pending status through indexes, so
 * it stays cheap no matter how large the full tables grow (the full lists are
 * only loaded on demand, e.g. when someone actually searches).
 */
export const pending = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const user = await requireRole(ctx, ["official", "admin", "superadmin"]);
    const isFullAdmin = ["admin", "superadmin"].includes(user.role);

    const bereavement = (
      await Promise.all(
        (["submitted", "under_review"] as const).map((status) =>
          ctx.db
            .query("bereavementCases")
            .withIndex("by_status", (q) => q.eq("status", status))
            .take(200)
        )
      )
    )
      .flat()
      .map((c) => ({
        _id: c._id,
        deceasedName: c.deceasedName,
        memberNameSnapshot: c.memberNameSnapshot,
        reference: c.reference,
        relationship: c.relationship,
        status: c.status,
        createdAt: c.createdAt,
      }));

    const bus = (
      await Promise.all(
        (["requested", "under_review", "payment_submitted"] as const).map((status) =>
          ctx.db
            .query("busBookings")
            .withIndex("by_status", (q) => q.eq("status", status))
            .take(200)
        )
      )
    )
      .flat()
      .map((b) => ({
        _id: b._id,
        destination: b.destination,
        reference: b.reference,
        requesterName: b.requesterName,
        status: b.status,
        createdAt: b.createdAt,
      }));

    if (!isFullAdmin) {
      return { members: [], harassment: [], bereavement, bus, issues: [] };
    }

    const members = (
      await ctx.db
        .query("users")
        .withIndex("by_role_status", (q) => q.eq("role", "member").eq("status", "pending_approval"))
        .take(200)
    ).map((m) => ({
      _id: m._id,
      fullName: m.fullName,
      tscNumber: m.tscNumber,
      createdAt: m.createdAt,
    }));

    const harassment = (
      await Promise.all(
        (["submitted", "acknowledged"] as const).map((status) =>
          ctx.db
            .query("harassmentReports")
            .withIndex("by_status", (q) => q.eq("status", status))
            .take(200)
        )
      )
    )
      .flat()
      .map((r) => ({
        _id: r._id,
        reference: r.reference,
        category: r.category,
        status: r.status,
        createdAt: r.createdAt,
      }));

    // Members' messages to officials: the admin is copied so nothing is raised unseen.
    const issues = (
      await ctx.db
        .query("notifications")
        .withIndex("by_user_unread", (q) => q.eq("userId", user._id).eq("isRead", false))
        .take(200)
    )
      .filter((n) => n.type === "member_issue")
      .map((n) => ({ _id: n._id, title: n.title, body: n.body, createdAt: n.createdAt }));

    return { members, harassment, bereavement, bus, issues };
  },
});
