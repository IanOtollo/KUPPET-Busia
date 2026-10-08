import { query, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";

/**
 * Pre-computed membership figures.
 *
 * Counting rows in a growing table on every dashboard load (and on every change,
 * because queries are reactive) costs O(members). Instead a scheduled job walks
 * the users table in fixed-size pages, tallies everything once, and stores the
 * result in one small document. Dashboards then read that single row, so their
 * cost stays flat as the membership grows. Figures can lag by up to the refresh
 * interval (15 minutes); the "pending approval" queue is read live elsewhere.
 */

const PAGE = 1000;

type SchoolStat = {
  count: number;
  head: { fullName: string; tscNumber: string; phone: string; email: string } | null;
  deputy: { fullName: string; tscNumber: string; phone: string; email: string } | null;
};

export type MemberStats = {
  total: number;
  byStatus: Record<string, number>;
  activeBySubCounty: Record<string, number>;
  activeByJobGroup: Record<string, number>;
  bySchool: Record<string, SchoolStat>;
};

const emptyStats = (): MemberStats => ({
  total: 0,
  byStatus: {},
  activeBySubCounty: {},
  activeByJobGroup: {},
  bySchool: {},
});

export const schoolKey = (name: string) => name.toLowerCase().trim();

export const refreshMembers = internalMutation({
  args: { cursor: v.union(v.string(), v.null()), acc: v.optional(v.any()) },
  handler: async (ctx: MutationCtx, args) => {
    const acc: MemberStats = args.acc ?? emptyStats();

    const page = await ctx.db.query("users").paginate({ numItems: PAGE, cursor: args.cursor });

    for (const u of page.page) {
      if (u.role !== "member") continue;
      acc.total += 1;
      acc.byStatus[u.status] = (acc.byStatus[u.status] ?? 0) + 1;
      if (u.status !== "active") continue;

      acc.activeBySubCounty[u.subCounty] = (acc.activeBySubCounty[u.subCounty] ?? 0) + 1;
      const jg = u.jobGroup ?? "none";
      acc.activeByJobGroup[jg] = (acc.activeByJobGroup[jg] ?? 0) + 1;

      const key = schoolKey(u.school);
      const s = (acc.bySchool[key] ??= { count: 0, head: null, deputy: null });
      s.count += 1;
      const contact = { fullName: u.fullName, tscNumber: u.tscNumber, phone: u.phone, email: u.email };
      if (!s.head && (u.schoolRole === "Principal / Headteacher" || u.designation === "Principal")) s.head = contact;
      if (!s.deputy && (u.schoolRole === "Deputy Principal" || u.designation === "Deputy Principal")) s.deputy = contact;
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.stats.refreshMembers, { cursor: page.continueCursor, acc });
      return;
    }

    const existing = await ctx.db
      .query("stats")
      .withIndex("by_key", (q) => q.eq("key", "members"))
      .first();
    if (existing) await ctx.db.patch(existing._id, { data: acc, updatedAt: Date.now() });
    else await ctx.db.insert("stats", { key: "members", data: acc, updatedAt: Date.now() });
  },
});

const MIN_REFRESH_GAP_MS = 20_000;
/** A recount reads every member, so the wait between recounts grows with the membership (~10ms per member). */
const refreshGapMs = (totalMembers: number) => Math.max(MIN_REFRESH_GAP_MS, totalMembers * 10);

/**
 * Call from any mutation that changes who is a member, their status or their
 * school. Schedules a tally right after the change commits (at most one per
 * gap, so a burst of sign-ups shares a single recount; the gap is 20 seconds for a small
 * branch and grows to about 8 minutes at 50,000 members). The 15-minute
 * cron stays as a safety net.
 */
export async function requestMembersRefresh(ctx: MutationCtx) {
  const now = Date.now();
  const row = await ctx.db
    .query("stats")
    .withIndex("by_key", (q) => q.eq("key", "members"))
    .first();
  // A refresh is already waiting to run later: it will see this change too.
  if (row?.queuedAt && row.queuedAt > now) return;

  const total = (row?.data as MemberStats | undefined)?.total ?? 0;
  const runAt = Math.max(now, (row?.updatedAt ?? 0) + refreshGapMs(total));
  if (row) await ctx.db.patch(row._id, { queuedAt: runAt });
  else await ctx.db.insert("stats", { key: "members", data: emptyStats(), updatedAt: 0, queuedAt: runAt });
  await ctx.scheduler.runAfter(runAt - now, internal.stats.startMembersRefresh, {});
}

/** For actions (which can't touch the database directly). */
export const requestRefresh = internalMutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    await requestMembersRefresh(ctx);
  },
});

/** Kicks off a fresh tally (called by the cron). */
export const startMembersRefresh = internalMutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    await ctx.scheduler.runAfter(0, internal.stats.refreshMembers, { cursor: null });
  },
});

export async function readMemberStats(ctx: QueryCtx): Promise<{ data: MemberStats; updatedAt: number } | null> {
  const row = await ctx.db
    .query("stats")
    .withIndex("by_key", (q) => q.eq("key", "members"))
    .first();
  return row ? { data: row.data as MemberStats, updatedAt: row.updatedAt } : null;
}

/** Membership totals for the admin dashboard and the Members page tabs. */
export const members = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    await requireRole(ctx, ["official", "admin", "superadmin"]);
    const row = await readMemberStats(ctx);
    if (!row) return null;
    const { bySchool: _omitted, ...rest } = row.data;
    return { ...rest, updatedAt: row.updatedAt };
  },
});
