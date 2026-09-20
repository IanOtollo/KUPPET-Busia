import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireRole, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import {
  userRoleValidator,
  userStatusValidator,
  subCountyValidator,
  designationValidator,
} from "./lib/validators";
import { ConvexError } from "convex/values";

/**
 * Returns the currently authenticated user's profile, or null if not logged in.
 */
export const getMyProfile = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    try {
      return await getCurrentUser(ctx);
    } catch {
      return null;
    }
  },
});

/**
 * Register a new member account with pending_verification status.
 * Enforces uniqueness of national ID, TSC number, email, and phone.
 */
export const register = mutation({
  args: {
    fullName: v.string(),
    idNumber: v.string(),
    tscNumber: v.string(),
    phone: v.string(),
    email: v.string(),
    school: v.string(),
    subCounty: subCountyValidator,
    designation: designationValidator,
    schoolRole: v.optional(v.string()),
    subjects: v.optional(v.array(v.string())),
    gender: v.optional(v.string()),
    authId: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const cleanEmail = args.email.toLowerCase().trim();
    const cleanIdNumber = args.idNumber.trim();
    const cleanTscNumber = args.tscNumber.toUpperCase().trim();
    const cleanPhone = args.phone.trim();

    // Check unique national ID
    const existingId = await ctx.db
      .query("users")
      .withIndex("by_idNumber", (q) => q.eq("idNumber", cleanIdNumber))
      .first();
    if (existingId) {
      throw new ConvexError({
        code: "DUPLICATE_ID",
        message: "National ID number is already registered with another account.",
      });
    }

    // Check unique TSC number
    const existingTsc = await ctx.db
      .query("users")
      .withIndex("by_tsc", (q) => q.eq("tscNumber", cleanTscNumber))
      .first();
    if (existingTsc) {
      throw new ConvexError({
        code: "DUPLICATE_TSC",
        message: "TSC number is already registered with another account.",
      });
    }

    // Check unique Email
    const existingEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", cleanEmail))
      .first();
    if (existingEmail) {
      throw new ConvexError({
        code: "DUPLICATE_EMAIL",
        message: "Email address is already in use.",
      });
    }

    // Check unique Phone
    const existingPhone = await ctx.db
      .query("users")
      .withIndex("by_phone", (q) => q.eq("phone", cleanPhone))
      .first();
    if (existingPhone) {
      throw new ConvexError({
        code: "DUPLICATE_PHONE",
        message: "Phone number is already associated with another account.",
      });
    }

    const now = Date.now();
    const newUserId = await ctx.db.insert("users", {
      authId: args.authId,
      fullName: args.fullName.trim(),
      idNumber: cleanIdNumber,
      tscNumber: cleanTscNumber,
      phone: cleanPhone,
      email: cleanEmail,
      school: args.school.trim(),
      subCounty: args.subCounty,
      designation: args.designation,
      schoolRole: args.schoolRole,
      subjects: args.subjects,
      gender: args.gender,
      role: "member",
      status: "pending_verification",
      failedLoginCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    await writeAudit(ctx, {
      action: "user.register",
      entityType: "users",
      entityId: newUserId,
      actorRole: "member",
      metadata: {
        email: cleanEmail,
        tscNumber: cleanTscNumber,
        subCounty: args.subCounty,
      },
    });

    return { userId: newUserId };
  },
});

/**
 * Marks an account as verified after email confirmation.
 * Moves status from pending_verification to pending_approval.
 */
export const verifyEmail = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx: MutationCtx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "User account record not found.",
      });
    }

    if (user.status !== "pending_verification") {
      return { status: user.status };
    }

    await ctx.db.patch(user._id, {
      status: "pending_approval",
      updatedAt: Date.now(),
    });

    await writeAudit(ctx, {
      action: "user.email_verified",
      entityType: "users",
      entityId: user._id,
      actorId: user._id,
      actorRole: user.role,
    });

    return { status: "pending_approval" };
  },
});

/**
 * Admin query to list all members with filtering by status or subCounty.
 */
export const listMembers = query({
  args: {
    status: v.optional(userStatusValidator),
    subCounty: v.optional(subCountyValidator),
  },
  handler: async (ctx: QueryCtx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    await requireRole(ctx, ["admin", "superadmin"]);

    let members = await ctx.db.query("users").collect();

    if (args.status) {
      members = members.filter((m) => m.status === args.status);
    }
    if (args.subCounty) {
      members = members.filter((m) => m.subCounty === args.subCounty);
    }

    return members.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Admin action to approve a registered member after verifying TSC records.
 */
export const approveMember = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "Target member not found.",
      });
    }

    const now = Date.now();
    await ctx.db.patch(targetUser._id, {
      status: "active",
      approvedBy: admin._id,
      approvedAt: now,
      updatedAt: now,
    });

    // In-app notification to member
    await ctx.db.insert("notifications", {
      userId: targetUser._id,
      type: "account_approved",
      title: "Membership Approved",
      body: "Your KUPPET Busia Branch portal registration has been verified and approved by the branch office. You now have full access to union welfare and services.",
      link: "/dashboard",
      isRead: false,
      createdAt: now,
    });

    await writeAudit(ctx, {
      action: "user.approved",
      entityType: "users",
      entityId: targetUser._id,
      actorId: admin._id,
      actorRole: admin.role,
      metadata: {
        memberTsc: targetUser.tscNumber,
        memberName: targetUser.fullName,
      },
    });

    return { success: true };
  },
});

/**
 * Admin action to suspend, reject, or change user status.
 */
export const setMemberStatus = mutation({
  args: {
    userId: v.id("users"),
    newStatus: userStatusValidator,
    reason: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "Target member not found.",
      });
    }

    await ctx.db.patch(targetUser._id, {
      status: args.newStatus,
      updatedAt: Date.now(),
    });

    await writeAudit(ctx, {
      action: `user.status_changed_to_${args.newStatus}`,
      entityType: "users",
      entityId: targetUser._id,
      actorId: admin._id,
      actorRole: admin.role,
      metadata: { reason: args.reason },
    });

    return { success: true };
  },
});

/**
 * Superadmin action to assign roles.
 */
export const assignRole = mutation({
  args: {
    userId: v.id("users"),
    role: userRoleValidator,
  },
  handler: async (ctx: MutationCtx, args) => {
    const superadmin = await requireRole(ctx, ["superadmin"]);

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "User not found.",
      });
    }

    await ctx.db.patch(targetUser._id, {
      role: args.role,
      updatedAt: Date.now(),
    });

    await writeAudit(ctx, {
      action: "user.role_assigned",
      entityType: "users",
      entityId: targetUser._id,
      actorId: superadmin._id,
      actorRole: superadmin.role,
      metadata: { newRole: args.role },
    });

    return { success: true };
  },
});

/**
 * Updates the current authenticated user's profile information.
 */
export const updateMyProfile = mutation({
  args: {
    schoolRole: v.optional(v.string()),
    subjects: v.optional(v.array(v.string())),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    gender: v.optional(v.string()),
    school: v.optional(v.string()),
    subCounty: v.optional(subCountyValidator),
    designation: v.optional(designationValidator),
  },
  handler: async (ctx: MutationCtx, args) => {
    const currentUser = await requireUser(ctx);

    const updates: Partial<typeof currentUser> = {
      updatedAt: Date.now(),
    };

    if (args.schoolRole !== undefined) updates.schoolRole = args.schoolRole;
    if (args.subjects !== undefined) updates.subjects = args.subjects;
    if (args.phone !== undefined) updates.phone = args.phone.trim();
    if (args.email !== undefined) updates.email = args.email.toLowerCase().trim();
    if (args.gender !== undefined) updates.gender = args.gender;
    if (args.school !== undefined) updates.school = args.school.trim();
    if (args.subCounty !== undefined) updates.subCounty = args.subCounty;
    if (args.designation !== undefined) updates.designation = args.designation;

    await ctx.db.patch(currentUser._id, updates);

    await writeAudit(ctx, {
      action: "user.update_profile",
      entityType: "users",
      entityId: currentUser._id,
      actorId: currentUser._id,
      actorRole: currentUser.role,
      metadata: { updatedFields: Object.keys(args) },
    });

    return { success: true };
  },
});

