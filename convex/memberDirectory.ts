import { query, QueryCtx } from "./_generated/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { Doc } from "./_generated/dataModel";

/**
 * Server-side member directory for the admin Members page.
 *
 * Reads one page at a time through indexes (alphabetical by name), so the cost
 * of opening the page is the same with 200 members or 200,000. Search uses a
 * search index for names and exact indexed lookups for TSC / ID / phone.
 */

const tabValidator = v.union(
  v.literal("all"),
  v.literal("pending_approval"),
  v.literal("active"),
  v.literal("inactive")
);

const filterArgs = {
  tab: tabValidator,
  subCounty: v.optional(v.string()),
  // A job group, or "none" for members who never set one.
  jobGroup: v.optional(v.string()),
  search: v.optional(v.string()),
};

type Filters = { tab: "all" | "pending_approval" | "active" | "inactive"; subCounty?: string; jobGroup?: string };

function matches(m: Doc<"users">, f: Filters): boolean {
  if (m.role !== "member") return false;
  if (f.tab === "pending_approval" && m.status !== "pending_approval") return false;
  if (f.tab === "active" && m.status !== "active") return false;
  if (f.tab === "inactive" && m.status !== "suspended" && m.status !== "rejected") return false;
  if (f.subCounty && m.subCounty !== f.subCounty) return false;
  if (f.jobGroup === "none" && m.jobGroup) return false;
  if (f.jobGroup && f.jobGroup !== "none" && m.jobGroup !== f.jobGroup) return false;
  return true;
}

/** Applies the sub-county / job-group filters to an index scan. */
function applyFilters<Q extends { filter: (fn: (q: any) => any) => Q }>(base: Q, f: Filters): Q {
  let out = base;
  if (f.subCounty) out = out.filter((q: any) => q.eq(q.field("subCounty"), f.subCounty));
  if (f.jobGroup === "none") out = out.filter((q: any) => q.eq(q.field("jobGroup"), undefined));
  else if (f.jobGroup) out = out.filter((q: any) => q.eq(q.field("jobGroup"), f.jobGroup));
  return out;
}

async function withPhoto(ctx: QueryCtx, rows: Doc<"users">[], includePhoto: boolean) {
  if (!includePhoto) return rows.map((r) => ({ ...r, photoUrl: null as string | null }));
  return await Promise.all(
    rows.map(async (r) => ({
      ...r,
      photoUrl: r.photoStorageId ? await ctx.storage.getUrl(r.photoStorageId) : null,
    }))
  );
}

async function pageOf(
  ctx: QueryCtx,
  args: { paginationOpts: { numItems: number; cursor: string | null; id?: number }; tab: Filters["tab"]; subCounty?: string; jobGroup?: string; search?: string },
  includePhoto: boolean
) {
  const f: Filters = { tab: args.tab, subCounty: args.subCounty, jobGroup: args.jobGroup };
  const term = (args.search ?? "").trim();

  if (term.length > 0) {
    // Exact lookups for identifiers (single small page).
    const compact = term.replace(/\s+/g, "");
    if (/^[0-9+\-]{5,}$/.test(compact)) {
      const tsc = compact.toUpperCase();
      const hits = new Map<string, Doc<"users">>();
      const byTsc = await ctx.db.query("users").withIndex("by_tsc", (q) => q.eq("tscNumber", tsc)).take(5);
      const byId = await ctx.db.query("users").withIndex("by_idNumber", (q) => q.eq("idNumber", compact)).take(5);
      const byPhone = await ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phone", compact)).take(5);
      for (const u of [...byTsc, ...byId, ...byPhone]) hits.set(u._id, u);
      const rows = [...hits.values()].filter((m) => matches(m, f));
      return { page: await withPhoto(ctx, rows, includePhoto), isDone: true, continueCursor: "" };
    }
    // Names: search index, paginated.
    const res = await ctx.db
      .query("users")
      .withSearchIndex("search_name", (q) => q.search("fullName", term).eq("role", "member"))
      .paginate(args.paginationOpts);
    const rows = res.page.filter((m) => matches(m, f));
    return { ...res, page: await withPhoto(ctx, rows, includePhoto) };
  }

  // Browse mode: alphabetical, straight off an index.
  let base;
  if (args.tab === "pending_approval" || args.tab === "active") {
    base = ctx.db
      .query("users")
      .withIndex("by_role_status_fullName", (q) => q.eq("role", "member").eq("status", args.tab as "active"));
  } else {
    base = ctx.db.query("users").withIndex("by_role_fullName", (q) => q.eq("role", "member"));
    if (args.tab === "inactive") {
      base = base.filter((q) => q.or(q.eq(q.field("status"), "suspended"), q.eq(q.field("status"), "rejected")));
    }
  }
  const res = await applyFilters(base as any, f).paginate(args.paginationOpts);
  return { ...(res as any), page: await withPhoto(ctx, (res as any).page, includePhoto) };
}

/** One page of members for the admin Members page. */
export const page = query({
  args: { paginationOpts: paginationOptsValidator, ...filterArgs },
  handler: async (ctx: QueryCtx, args) => {
    await requireRole(ctx, ["admin", "superadmin"]);
    return await pageOf(ctx, args, true);
  },
});

/** Larger photo-less pages used to stream a full export without loading everything at once. */
export const exportPage = query({
  args: { paginationOpts: paginationOptsValidator, ...filterArgs },
  handler: async (ctx: QueryCtx, args) => {
    await requireRole(ctx, ["admin", "superadmin"]);
    return await pageOf(ctx, args, false);
  },
});

/** One member by id (for deep links such as ?highlight=… from the global search). */
export const byId = query({
  args: { id: v.id("users") },
  handler: async (ctx: QueryCtx, args) => {
    await requireRole(ctx, ["admin", "superadmin"]);
    const m = await ctx.db.get(args.id);
    if (!m || m.role !== "member") return null;
    return (await withPhoto(ctx, [m], true))[0];
  },
});
