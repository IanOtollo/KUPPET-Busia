import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireRole, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { subCountyValidator } from "./lib/validators";
import { readMemberStats, schoolKey, requestMembersRefresh } from "./stats";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";
import { BUSIA_SCHOOLS } from "./lib/busiaSchools";

/**
 * List all secondary schools in Busia County.
 */
export const list = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    return await ctx.db.query("schools").take(2000);
  },
});

/**
 * Schools with head / deputy contacts and staff counts for the directory.
 *
 * The counts and contacts come from the pre-computed membership summary
 * (see stats.ts), so this no longer reads every user for every school. The full
 * staff list of one school is fetched on demand with `roster`.
 */
export const listWithRosters = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    await requireRole(ctx, ["official", "admin", "superadmin"]);
    const schools = await ctx.db.query("schools").take(2000);
    const row = await readMemberStats(ctx);
    const bySchool = row?.data.bySchool ?? {};

    return schools.map((school) => {
      const stat = bySchool[schoolKey(school.name)];
      return {
        ...school,
        totalTeachers: stat?.count ?? 0,
        headTeacher: stat?.head ?? null,
        deputyHead: stat?.deputy ?? null,
      };
    });
  },
});

/** Staff roster of a single school (index lookup, capped). */
export const roster = query({
  args: { schoolName: v.string() },
  handler: async (ctx: QueryCtx, args) => {
    await requireRole(ctx, ["official", "admin", "superadmin"]);
    const staff = await ctx.db
      .query("users")
      .withIndex("by_school", (q) => q.eq("school", args.schoolName))
      .take(500);
    return staff
      .filter((u) => u.role === "member" && u.status === "active")
      .sort((x, y) => x.fullName.localeCompare(y.fullName))
      .map((t) => ({
        _id: t._id,
        fullName: t.fullName,
        tscNumber: t.tscNumber,
        phone: t.phone,
        email: t.email,
        designation: t.designation,
        schoolRole: t.schoolRole || t.designation,
        subjects: t.subjects || [],
        status: t.status,
      }));
  },
});

const SCHOOL_NAME_RE = /^[\p{L}\p{N} .,'&()\/-]+$/u;

/** Spelling-insensitive key: drops "secondary"/"school", case, spaces and punctuation. */
function schoolMatchKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(secondary|school|sec|sch|high)\b/g, " ")
    .replace(/[^a-z0-9]+/g, "");
}

function cleanSchoolName(raw: string): string {
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 3 || name.length > 120 || !SCHOOL_NAME_RE.test(name)) {
    throw new ConvexError({
      code: "INVALID_SCHOOL",
      message: "Enter the school's name using letters and numbers only (3–120 characters).",
    });
  }
  return name;
}

/**
 * Returns the directory's spelling of a school, adding it (flagged as
 * teacher-added) when it isn't there yet. Used wherever a teacher types a school.
 */
export async function ensureSchool(ctx: MutationCtx, rawName: string, subCounty: string) {
  const name = cleanSchoolName(rawName);
  const key = schoolMatchKey(name);
  const existing = await ctx.db.query("schools").take(3000);
  const match = existing.find((s) => schoolMatchKey(s.name) === key);
  if (match) {
    if (match.reviewStatus === "rejected") {
      throw new ConvexError({
        code: "SCHOOL_REJECTED",
        message: `"${match.name}" was rejected by the branch. Enter the correct, official name of your school.`,
      });
    }
    return { name: match.name, created: false };
  }

  await ctx.db.insert("schools", {
    name,
    subCounty: subCounty as any,
    isActive: true,
    addedBy: "teacher",
    addedAt: Date.now(),
    reviewStatus: "pending",
  });
  return { name, created: true };
}

export const ensureFromRegistration = internalMutation({
  args: { name: v.string(), subCounty: subCountyValidator },
  handler: async (ctx: MutationCtx, args) => ensureSchool(ctx, args.name, args.subCounty),
});

/** Moves a school's members to its corrected name, a batch at a time. */
export const renameMembers = internalMutation({
  args: { oldName: v.string(), newName: v.string(), subCounty: subCountyValidator },
  handler: async (ctx: MutationCtx, args) => {
    const batch = await ctx.db
      .query("users")
      .withIndex("by_school", (q) => q.eq("school", args.oldName))
      .take(200);
    for (const u of batch) {
      await ctx.db.patch(u._id, { school: args.newName, subCounty: args.subCounty, updatedAt: Date.now() });
    }
    if (batch.length === 200) {
      await ctx.scheduler.runAfter(0, internal.schools.renameMembers, args);
    }
  },
});

/** Admin: correct a school's spelling and/or sub-county. Its teachers follow automatically. */
export const update = mutation({
  args: { id: v.id("schools"), name: v.string(), subCounty: subCountyValidator },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);
    const school = await ctx.db.get(args.id);
    if (!school) throw new ConvexError({ code: "NOT_FOUND", message: "School record not found." });

    const name = cleanSchoolName(args.name);
    const all = await ctx.db.query("schools").take(3000);
    if (all.some((s) => s._id !== args.id && schoolMatchKey(s.name) === schoolMatchKey(name))) {
      throw new ConvexError({ code: "DUPLICATE_SCHOOL", message: `"${name}" already exists in the directory.` });
    }
    if (name === school.name && args.subCounty === school.subCounty) return { changed: false };

    await ctx.db.patch(args.id, { name, subCounty: args.subCounty });
    await ctx.scheduler.runAfter(0, internal.schools.renameMembers, {
      oldName: school.name,
      newName: name,
      subCounty: args.subCounty,
    });
    await requestMembersRefresh(ctx);

    await writeAudit(ctx, {
      actorId: admin._id,
      actorRole: admin.role,
      action: "UPDATE_SCHOOL",
      entityType: "schools",
      entityId: args.id,
      metadata: { from: { name: school.name, subCounty: school.subCounty }, to: { name, subCounty: args.subCounty } },
    });
    return { changed: true };
  },
});

/**
 * Add a new secondary school to the directory (Admin / Superadmin only).
 */
export const create = mutation({
  args: {
    name: v.string(),
    subCounty: subCountyValidator,
  },
  handler: async (ctx: MutationCtx, args) => {
    const adminUser = await requireRole(ctx, ["admin", "superadmin"]);
    const cleanName = cleanSchoolName(args.name);

    // Check duplicate (spelling-insensitive, same rule as registration)
    const existing = await ctx.db.query("schools").take(3000);
    const isDuplicate = existing.some((s) => schoolMatchKey(s.name) === schoolMatchKey(cleanName));

    if (isDuplicate) {
      throw new ConvexError({
        code: "DUPLICATE_SCHOOL",
        message: `School "${cleanName}" already exists in the directory.`,
      });
    }

    const schoolId = await ctx.db.insert("schools", {
      name: cleanName,
      subCounty: args.subCounty,
      isActive: true,
    });

    await writeAudit(ctx, {
      actorId: adminUser._id,
      actorRole: adminUser.role,
      action: "CREATE_SCHOOL",
      entityType: "schools",
      entityId: schoolId,
      metadata: { schoolName: cleanName, subCounty: args.subCounty },
    });

    return schoolId;
  },
});

/**
 * Toggle active status of a school (Admin / Superadmin only).
 */
export const toggleActive = mutation({
  args: {
    id: v.id("schools"),
  },
  handler: async (ctx: MutationCtx, args) => {
    const adminUser = await requireRole(ctx, ["admin", "superadmin"]);
    const school = await ctx.db.get(args.id);

    if (!school) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "School record not found.",
      });
    }

    const nextState = !school.isActive;
    await ctx.db.patch(args.id, { isActive: nextState });

    await writeAudit(ctx, {
      actorId: adminUser._id,
      actorRole: adminUser.role,
      action: "TOGGLE_SCHOOL_STATUS",
      entityType: "schools",
      entityId: args.id,
      metadata: { schoolName: school.name, isActive: nextState },
    });

    return nextState;
  },
});

/**
 * Admin: remove a school from the directory. Refused while any teacher is still
 * registered at it (deactivate it instead, which hides it from new sign-ups).
 */
export const remove = mutation({
  args: { id: v.id("schools") },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);
    const school = await ctx.db.get(args.id);
    if (!school) throw new ConvexError({ code: "NOT_FOUND", message: "School record not found." });

    const teacher = await ctx.db
      .query("users")
      .withIndex("by_school", (q) => q.eq("school", school.name))
      .first();
    if (teacher) {
      throw new ConvexError({
        code: "SCHOOL_IN_USE",
        message: `${school.name} still has teachers registered. Edit the school or deactivate it instead of removing it.`,
      });
    }

    await ctx.db.delete(args.id);
    await writeAudit(ctx, {
      actorId: admin._id,
      actorRole: admin.role,
      action: "DELETE_SCHOOL",
      entityType: "schools",
      entityId: args.id,
      metadata: { schoolName: school.name, subCounty: school.subCounty },
    });
    return { removed: true };
  },
});

/**
 * One-off, CLI only: loads the Busia secondary schools list. Skips any school
 * already in the directory (same spelling-insensitive match as registration), so
 * it is safe to re-run.
 */
export const importDirectory = internalMutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const existing = await ctx.db.query("schools").take(3000);
    const known = new Set(existing.map((s) => schoolMatchKey(s.name)));
    let added = 0;
    for (const [name, subCounty] of BUSIA_SCHOOLS) {
      const key = schoolMatchKey(name);
      if (known.has(key)) continue;
      known.add(key);
      await ctx.db.insert("schools", { name, subCounty, isActive: true });
      added++;
    }
    return { added, skipped: BUSIA_SCHOOLS.length - added, total: existing.length + added };
  },
});

/** Admin: confirm a teacher-added school so it stays in the directory. */
export const approve = mutation({
  args: { id: v.id("schools") },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);
    const school = await ctx.db.get(args.id);
    if (!school) throw new ConvexError({ code: "NOT_FOUND", message: "School record not found." });
    await ctx.db.patch(args.id, { reviewStatus: "approved" });
    await writeAudit(ctx, {
      actorId: admin._id,
      actorRole: admin.role,
      action: "APPROVE_SCHOOL",
      entityType: "schools",
      entityId: args.id,
      metadata: { schoolName: school.name },
    });
    return { approved: true };
  },
});

/**
 * Admin: reject a teacher-added school. It leaves the suggestions, and every teacher
 * registered at it is told to submit the correct, official school the next time they sign in.
 */
export const reject = mutation({
  args: { id: v.id("schools") },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);
    const school = await ctx.db.get(args.id);
    if (!school) throw new ConvexError({ code: "NOT_FOUND", message: "School record not found." });

    await ctx.db.patch(args.id, { reviewStatus: "rejected", isActive: false });

    const teachers = await ctx.db
      .query("users")
      .withIndex("by_school", (q) => q.eq("school", school.name))
      .take(500);
    const now = Date.now();
    for (const t of teachers) {
      await ctx.db.insert("notifications", {
        userId: t._id,
        type: "school_rejected",
        title: "Your school was not accepted",
        body: `"${school.name}" could not be confirmed as an official school. Please submit the correct, official name of your school.`,
        isRead: false,
        createdAt: now,
      });
    }

    // Nobody registered at it: nothing to correct, so drop the record.
    if (teachers.length === 0) await ctx.db.delete(args.id);

    await writeAudit(ctx, {
      actorId: admin._id,
      actorRole: admin.role,
      action: "REJECT_SCHOOL",
      entityType: "schools",
      entityId: args.id,
      metadata: { schoolName: school.name, teachersNotified: teachers.length },
    });
    return { rejected: true, teachers: teachers.length };
  },
});

/** The signed-in teacher's school, if the branch rejected it. Drives the "submit the correct school" prompt. */
export const myRejectedSchool = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    try {
      const user = await getCurrentUser(ctx);
      const school = await ctx.db
        .query("schools")
        .withIndex("by_name", (q) => q.eq("name", user.school))
        .first();
      return school?.reviewStatus === "rejected" ? { name: school.name } : null;
    } catch {
      return null;
    }
  },
});

/** A teacher whose school was rejected submits the correct one. */
export const correctMySchool = mutation({
  args: { name: v.string(), subCounty: subCountyValidator },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);
    const current = await ctx.db
      .query("schools")
      .withIndex("by_name", (q) => q.eq("name", user.school))
      .first();
    if (current?.reviewStatus !== "rejected") {
      throw new ConvexError({
        code: "NOT_REJECTED",
        message: "Your school is fine. To move schools, use Transfers & Swaps.",
      });
    }

    const next = await ensureSchool(ctx, args.name, args.subCounty);
    await ctx.db.patch(user._id, { school: next.name, subCounty: args.subCounty, updatedAt: Date.now() });

    // The rejected record has served its purpose once its last teacher has moved.
    const remaining = await ctx.db
      .query("users")
      .withIndex("by_school", (q) => q.eq("school", current.name))
      .first();
    if (!remaining) await ctx.db.delete(current._id);

    await requestMembersRefresh(ctx);
    await writeAudit(ctx, {
      actorId: user._id,
      actorRole: user.role,
      action: "CORRECT_REJECTED_SCHOOL",
      entityType: "users",
      entityId: user._id,
      metadata: { from: current.name, to: next.name },
    });
    return { name: next.name };
  },
});

/**
 * One-off, CLI only: folds duplicate school records into the one to keep. Teachers
 * registered at a duplicate are moved to the kept school, then the duplicate is deleted.
 * Pass `{ pairs: [{ keep: "<name>", drop: "<name>" }] }`.
 */
export const mergeDuplicates = internalMutation({
  args: { pairs: v.array(v.object({ keep: v.string(), drop: v.string() })) },
  handler: async (ctx: MutationCtx, args) => {
    const done: string[] = [];
    for (const { keep, drop } of args.pairs) {
      const kept = await ctx.db.query("schools").withIndex("by_name", (q) => q.eq("name", keep)).first();
      const dupe = await ctx.db.query("schools").withIndex("by_name", (q) => q.eq("name", drop)).first();
      if (!kept || !dupe || kept._id === dupe._id) continue;
      await ctx.scheduler.runAfter(0, internal.schools.renameMembers, {
        oldName: dupe.name,
        newName: kept.name,
        subCounty: kept.subCounty,
      });
      await ctx.db.delete(dupe._id);
      done.push(`${drop} -> ${keep}`);
    }
    if (done.length) await requestMembersRefresh(ctx);
    return done;
  },
});
