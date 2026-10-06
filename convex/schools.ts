import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { subCountyValidator } from "./lib/validators";
import { readMemberStats, schoolKey } from "./stats";
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

/**
 * Called when a teacher registers. Returns the directory's spelling of their
 * school, and adds the school to the directory (flagged as teacher-added) when
 * it isn't there yet, so the admin's School Directory grows as teachers join.
 */
export const ensureFromRegistration = internalMutation({
  args: { name: v.string(), subCounty: subCountyValidator },
  handler: async (ctx: MutationCtx, args) => {
    // Tidy spacing only; keep the teacher's capitalisation.
    const name = args.name.replace(/\s+/g, " ").trim();
    if (name.length < 3 || name.length > 120 || !/^[\p{L}\p{N} .,'&()\/-]+$/u.test(name)) {
      throw new ConvexError({
        code: "INVALID_SCHOOL",
        message: "Enter your school's name using letters and numbers only (3–120 characters).",
      });
    }

    const key = name.toLowerCase();
    const existing = await ctx.db.query("schools").take(3000);
    const match = existing.find((s) => s.name.toLowerCase().replace(/\s+/g, " ").trim() === key);
    if (match) return { name: match.name, created: false };

    await ctx.db.insert("schools", {
      name,
      subCounty: args.subCounty,
      isActive: true,
      addedBy: "teacher",
      addedAt: Date.now(),
    });
    return { name, created: true };
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
    const cleanName = args.name.trim();

    if (!cleanName || cleanName.length < 3) {
      throw new ConvexError({
        code: "INVALID_NAME",
        message: "School name must be at least 3 characters.",
      });
    }

    // Check duplicate
    const existing = await ctx.db.query("schools").collect();
    const isDuplicate = existing.some(
      (s) => s.name.toLowerCase() === cleanName.toLowerCase()
    );

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
