import { query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";

/**
 * Header search box for the admin portal. Everything here is an indexed lookup
 * with a hard cap on rows, so a search costs the same however large the tables
 * grow (the old version streamed every member and case to the browser).
 */
export const search = query({
  args: { term: v.string() },
  handler: async (ctx: QueryCtx, args) => {
    const user = await requireRole(ctx, ["official", "admin", "superadmin"]);
    const isFullAdmin = ["admin", "superadmin"].includes(user.role);
    const term = args.term.trim();
    if (term.length < 2) return { members: [], bereavement: [], bus: [], harassment: [] };

    const upper = term.toUpperCase();
    const q = term.toLowerCase();

    let members: { _id: string; fullName: string; tscNumber: string; idNumber: string }[] = [];
    if (isFullAdmin) {
      const found = new Map<string, any>();
      const byName = await ctx.db
        .query("users")
        .withSearchIndex("search_name", (s) => s.search("fullName", term).eq("role", "member"))
        .take(8);
      byName.forEach((u) => found.set(u._id, u));
      if (/^[0-9a-zA-Z+\-]{4,}$/.test(term)) {
        const byTsc = await ctx.db.query("users").withIndex("by_tsc", (i) => i.eq("tscNumber", upper)).take(3);
        const byId = await ctx.db.query("users").withIndex("by_idNumber", (i) => i.eq("idNumber", term)).take(3);
        const byPhone = await ctx.db.query("users").withIndex("by_phone", (i) => i.eq("phone", term)).take(3);
        [...byTsc, ...byId, ...byPhone].filter((u) => u.role === "member").forEach((u) => found.set(u._id, u));
      }
      members = [...found.values()].slice(0, 8).map((u) => ({
        _id: u._id,
        fullName: u.fullName,
        tscNumber: u.tscNumber,
        idNumber: u.idNumber,
      }));
    }

    // Cases: match against the most recent ones only (bounded window).
    const bereavementRecent = await ctx.db.query("bereavementCases").withIndex("by_createdAt").order("desc").take(300);
    const bereavement = bereavementRecent
      .filter((c) =>
        [c.reference, c.deceasedName, c.memberNameSnapshot, c.tscSnapshot, c.school].some((x) => x?.toLowerCase().includes(q))
      )
      .slice(0, 8)
      .map((c) => ({
        _id: c._id,
        reference: c.reference,
        deceasedName: c.deceasedName,
        memberNameSnapshot: c.memberNameSnapshot,
        tscSnapshot: c.tscSnapshot,
        school: c.school,
      }));

    const busRecent = await ctx.db.query("busBookings").order("desc").take(300);
    const bus = busRecent
      .filter((b) => [b.reference, b.destination, b.requesterName, b.school].some((x) => x?.toLowerCase().includes(q)))
      .slice(0, 8)
      .map((b) => ({
        _id: b._id,
        reference: b.reference,
        destination: b.destination,
        requesterName: b.requesterName,
        school: b.school,
      }));

    // Harassment reports are confidential: admins/superadmins only, summary fields only.
    let harassment: { _id: string; reference: string; category: string; school: string }[] = [];
    if (isFullAdmin) {
      const recent = await ctx.db.query("harassmentReports").withIndex("by_createdAt").order("desc").take(300);
      harassment = recent
        .filter((r) => [r.reference, r.category, r.school].some((x) => x?.toLowerCase().includes(q)))
        .slice(0, 8)
        .map((r) => ({ _id: r._id, reference: r.reference, category: r.category, school: r.school }));
    }

    return { members, bereavement, bus, harassment };
  },
});
