import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { subCountyValidator } from "./lib/validators";
import { ConvexError } from "convex/values";

/**
 * List all secondary schools in Busia County.
 */
export const list = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    return await ctx.db.query("schools").collect();
  },
});

/**
 * Returns all schools with calculated staff rosters, principal, deputy principal, and total teacher counts.
 */
export const listWithRosters = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const schools = await ctx.db.query("schools").collect();
    const allUsers = await ctx.db.query("users").collect();

    return schools.map((school) => {
      const schoolTeachers = allUsers.filter(
        (u) => u.school.toLowerCase().trim() === school.name.toLowerCase().trim()
      );

      const headTeacher = schoolTeachers.find(
        (u) =>
          u.schoolRole === "Principal / Headteacher" ||
          u.designation === "Principal"
      );

      const deputyHead = schoolTeachers.find(
        (u) =>
          u.schoolRole === "Deputy Principal" ||
          u.designation === "Deputy Principal"
      );

      return {
        ...school,
        totalTeachers: schoolTeachers.length,
        headTeacher: headTeacher
          ? {
              fullName: headTeacher.fullName,
              tscNumber: headTeacher.tscNumber,
              phone: headTeacher.phone,
              email: headTeacher.email,
            }
          : null,
        deputyHead: deputyHead
          ? {
              fullName: deputyHead.fullName,
              tscNumber: deputyHead.tscNumber,
              phone: deputyHead.phone,
              email: deputyHead.email,
            }
          : null,
        teachers: schoolTeachers.map((t) => ({
          _id: t._id,
          fullName: t.fullName,
          tscNumber: t.tscNumber,
          phone: t.phone,
          email: t.email,
          designation: t.designation,
          schoolRole: t.schoolRole || t.designation,
          subjects: t.subjects || [],
          status: t.status,
        })),
      };
    });
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
