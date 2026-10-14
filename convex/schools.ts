import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { subCountyValidator } from "./lib/validators";
import { readMemberStats, schoolKey, requestMembersRefresh } from "./stats";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";

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
 * Returns the directory's spelling of a school, adding it when it isn't there yet
 * (spelling-insensitive, so the same school is never listed twice). Used wherever a
 * teacher types a school.
 */
export async function ensureSchool(ctx: MutationCtx, rawName: string, subCounty: string) {
  const name = cleanSchoolName(rawName);
  const key = schoolMatchKey(name);
  const existing = await ctx.db.query("schools").take(3000);
  const match = existing.find((s) => schoolMatchKey(s.name) === key);
  if (match) return { name: match.name, created: false };

  await ctx.db.insert("schools", { name, subCounty: subCounty as any, isActive: true });
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
 * One-off, CLI only: empties the directory down to the one school to keep. Schools that
 * still have teachers registered are never deleted (they are reported instead), and the
 * kept school is stripped of any teacher-added / review flags.
 */
export const resetDirectory = internalMutation({
  args: { keep: v.string() },
  handler: async (ctx: MutationCtx, args) => {
    const keepKey = schoolMatchKey(args.keep);
    const all = await ctx.db.query("schools").take(3000);
    let removed = 0;
    const inUse: string[] = [];
    for (const s of all) {
      if (schoolMatchKey(s.name) === keepKey) {
        await ctx.db.replace(s._id, { name: s.name, subCounty: s.subCounty, isActive: true });
        continue;
      }
      const teacher = await ctx.db.query("users").withIndex("by_school", (q) => q.eq("school", s.name)).first();
      if (teacher) {
        inUse.push(s.name);
        continue;
      }
      await ctx.db.delete(s._id);
      removed++;
    }
    await requestMembersRefresh(ctx);
    return { removed, inUse };
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
