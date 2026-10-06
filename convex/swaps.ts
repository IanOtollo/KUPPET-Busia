import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { subCountyValidator } from "./lib/validators";

const STAFF = ["official", "admin", "superadmin"];

/**
 * A teacher posts that they want to swap schools: where they are now, the
 * subjects they teach, and the sub-county (optionally a specific school) they
 * want to move to. One open request per teacher.
 */
export const create = mutation({
  args: {
    subjects: v.array(v.string()),
    targetSubCounty: subCountyValidator,
    targetSchool: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);

    if (args.subjects.length === 0) {
      throw new ConvexError({ code: "SUBJECTS_REQUIRED", message: "Select at least one subject you teach." });
    }

    const mine = await ctx.db
      .query("swapRequests")
      .withIndex("by_member", (q) => q.eq("memberId", user._id))
      .take(200);
    if (mine.some((r) => r.status === "open")) {
      throw new ConvexError({
        code: "ALREADY_OPEN",
        message: "You already have an open swap request. Close it before posting a new one.",
      });
    }

    const now = Date.now();
    const id = await ctx.db.insert("swapRequests", {
      memberId: user._id,
      memberName: user.fullName,
      tscNumber: user.tscNumber,
      school: user.school,
      subCounty: user.subCounty,
      jobGroup: user.jobGroup,
      subjects: args.subjects.slice(0, 10),
      targetSubCounty: args.targetSubCounty,
      targetSchool: args.targetSchool?.trim() || undefined,
      note: args.note?.trim().slice(0, 500) || undefined,
      status: "open",
      createdAt: now,
    });

    // Tell both teachers when two open requests point at each other's sub-county.
    const open = await ctx.db
      .query("swapRequests")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .take(500);
    for (const other of open) {
      if (other._id === id || other.memberId === user._id) continue;
      if (other.subCounty === args.targetSubCounty && other.targetSubCounty === user.subCounty) {
        await ctx.db.insert("notifications", {
          userId: other.memberId,
          type: "swap_match",
          title: "A possible swap partner was found",
          body: `${user.fullName} (${user.school}, ${user.subCounty}) wants to move to ${other.subCounty}, and you want ${user.subCounty}. Open School Swaps to get in touch.`,
          link: "/transfers",
          isRead: false,
          createdAt: now,
        });
        await ctx.db.insert("notifications", {
          userId: user._id,
          type: "swap_match",
          title: "A possible swap partner was found",
          body: `${other.memberName} (${other.school}, ${other.subCounty}) is looking to move to ${user.subCounty}. Open School Swaps to get in touch.`,
          link: "/transfers",
          isRead: false,
          createdAt: now,
        });
      }
    }

    await writeAudit(ctx, {
      action: "swap.requested",
      entityType: "swapRequests",
      entityId: id,
      actorId: user._id,
      actorRole: user.role,
    });
    return { success: true };
  },
});

/** Open swap requests from everyone, flagged where they mutually match the caller's own. */
export const listOpen = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const user = await requireUser(ctx);
    const isStaff = STAFF.includes(user.role);

    const open = await ctx.db
      .query("swapRequests")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .order("desc")
      .take(300);

    const mine = open.find((r) => r.memberId === user._id);

    const rows = [];
    for (const r of open) {
      const isMine = r.memberId === user._id;
      const isMatch =
        !!mine &&
        !isMine &&
        r.subCounty === mine.targetSubCounty &&
        r.targetSubCounty === mine.subCounty;
      const sharedSubjects = mine ? r.subjects.filter((s) => mine.subjects.includes(s)) : [];
      const owner = isStaff ? await ctx.db.get(r.memberId) : null;
      rows.push({
        _id: r._id,
        memberId: r.memberId,
        memberName: r.memberName,
        tscNumber: isStaff ? r.tscNumber : "",
        phone: owner?.phone ?? "",
        school: r.school,
        subCounty: r.subCounty,
        jobGroup: r.jobGroup ?? null,
        subjects: r.subjects,
        targetSubCounty: r.targetSubCounty,
        targetSchool: r.targetSchool ?? null,
        note: r.note ?? null,
        createdAt: r.createdAt,
        isMine,
        isMatch,
        sharedSubjects,
      });
    }
    // Mutual matches first, then newest.
    return rows.sort((a, b) => Number(b.isMatch) - Number(a.isMatch) || b.createdAt - a.createdAt);
  },
});

/** Close a swap request (the owner, once swapped or no longer needed; or an admin). */
export const close = mutation({
  args: { id: v.id("swapRequests") },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);
    const req = await ctx.db.get(args.id);
    if (!req) throw new ConvexError({ code: "NOT_FOUND", message: "Swap request not found." });
    if (req.memberId !== user._id && !["admin", "superadmin"].includes(user.role)) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You can only close your own swap request." });
    }
    if (req.status === "closed") return { success: true };
    await ctx.db.patch(req._id, { status: "closed", closedAt: Date.now() });
    await writeAudit(ctx, {
      action: "swap.closed",
      entityType: "swapRequests",
      entityId: req._id,
      actorId: user._id,
      actorRole: user.role,
    });
    return { success: true };
  },
});
