import {
  query,
  mutation,
  action,
  internalQuery,
  internalMutation,
  QueryCtx,
  MutationCtx,
  ActionCtx,
} from "./_generated/server";
import { createAccount } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getCurrentUser, requireRole, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { loginAliasForTsc } from "./lib/loginAlias";
import { consumeRateLimit } from "./lib/rateLimit";
import {
  userRoleValidator,
  userStatusValidator,
  subCountyValidator,
  designationValidator,
  jobGroupValidator,
} from "./lib/validators";
import { ConvexError } from "convex/values";

/**
 * Returns the currently authenticated user's profile, or null if not logged in.
 */
export const getMyProfile = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    try {
      const user = await getCurrentUser(ctx);
      return {
        ...user,
        photoUrl: user.photoStorageId
          ? await ctx.storage.getUrl(user.photoStorageId)
          : null,
      };
    } catch {
      return null;
    }
  },
});

/**
 * Returns the first duplicated identity field, if any. A teacher may only hold
 * one account, so National ID, TSC number, mobile phone and email are unique.
 */
async function findDuplicate(
  ctx: QueryCtx,
  values: { idNumber: string; tscNumber: string; phone: string; email: string }
): Promise<{ field: string; message: string } | null> {
  const { idNumber, tscNumber, phone, email } = values;

  const existingId = await ctx.db
    .query("users")
    .withIndex("by_idNumber", (q) => q.eq("idNumber", idNumber))
    .first();
  if (existingId) {
    return {
      field: "idNumber",
      message: "A teacher with this National ID number is already registered.",
    };
  }

  const existingTsc = await ctx.db
    .query("users")
    .withIndex("by_tsc", (q) => q.eq("tscNumber", tscNumber))
    .first();
  if (existingTsc) {
    return {
      field: "tscNumber",
      message: "A teacher with this TSC number is already registered.",
    };
  }

  const existingPhone = await ctx.db
    .query("users")
    .withIndex("by_phone", (q) => q.eq("phone", phone))
    .first();
  if (existingPhone) {
    return {
      field: "phone",
      message: "A teacher with this mobile phone number is already registered.",
    };
  }

  const existingEmail = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  if (existingEmail) {
    return {
      field: "email",
      message: "A teacher with this email address is already registered.",
    };
  }

  return null;
}

/**
 * Creates a teacher account (Convex auth credentials + user record).
 * Uniqueness of National ID, TSC number, phone and email is enforced here,
 * server-side, before any account is written.
 */
/**
 * Server-side password policy (the browser checks are only a convenience).
 * 8+ characters with upper, lower and a digit.
 */
export function assertStrongPassword(password: string) {
  if (
    password.length < 8 ||
    password.length > 128 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    throw new ConvexError({
      code: "WEAK_PASSWORD",
      message:
        "Password must be 8–128 characters and include an uppercase letter, a lowercase letter and a number.",
    });
  }
}

/** Global throttle on sign-ups so the public endpoint can't be used to flood the system. */
export const consumeRegistrationSlot = internalMutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    await consumeRateLimit(ctx, "register:global", 60, 60 * 60 * 1000);
  },
});

export const registerMember = action({
  args: {
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
    idNumber: v.string(),
    tscNumber: v.string(),
    phone: v.string(),
    school: v.string(),
    subCounty: subCountyValidator,
    designation: designationValidator,
    schoolRole: v.optional(v.string()),
    subjects: v.optional(v.array(v.string())),
    gender: v.optional(v.string()),
    jobGroup: jobGroupValidator,
    // Date the teacher reported to their current school (YYYY-MM-DD); used for length of stay.
    schoolStartDate: v.optional(v.string()),
  },
  handler: async (ctx: ActionCtx, args) => {
    const email = args.email.toLowerCase().trim();
    const idNumber = args.idNumber.trim();
    const tscNumber = args.tscNumber.toUpperCase().trim();
    const phone = args.phone.trim();

    await ctx.runMutation(internal.users.consumeRegistrationSlot, {});

    assertStrongPassword(args.password);
    if (args.password.toUpperCase() === tscNumber) {
      throw new ConvexError({
        code: "WEAK_PASSWORD",
        message: "Your password cannot be the same as your TSC number.",
      });
    }

    const duplicate = await ctx.runQuery(internal.users.checkDuplicates, {
      idNumber,
      tscNumber,
      phone,
      email,
    });

    if (duplicate) {
      throw new ConvexError({
        code: `DUPLICATE_${duplicate.field.toUpperCase()}`,
        message: duplicate.message,
      });
    }

    const now = Date.now();

    await createAccount(ctx as any, {
      provider: "password",
      account: { id: loginAliasForTsc(tscNumber), secret: args.password },
      profile: {
        email,
        fullName: args.fullName.trim(),
        idNumber,
        tscNumber,
        phone,
        school: args.school.trim(),
        subCounty: args.subCounty,
        designation: args.designation,
        ...(args.schoolRole ? { schoolRole: args.schoolRole } : {}),
        ...(args.subjects ? { subjects: args.subjects } : {}),
        ...(args.gender ? { gender: args.gender } : {}),
        jobGroup: args.jobGroup,
        ...(args.schoolStartDate ? { schoolStartDate: args.schoolStartDate } : {}),
        role: "member",
        status: "pending_approval",
        failedLoginCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      shouldLinkViaEmail: false,
      shouldLinkViaPhone: false,
    });

    return { success: true };
  },
});

/**
 * Public pre-check used by the registration form so the applicant gets an
 * immediate, friendly message instead of a failed sign-up.
 */
export const checkRegistrationAvailability = query({
  args: {
    idNumber: v.string(),
    tscNumber: v.string(),
    phone: v.string(),
    email: v.string(),
  },
  handler: async (ctx: QueryCtx, args) =>
    findDuplicate(ctx, {
      idNumber: args.idNumber.trim(),
      tscNumber: args.tscNumber.toUpperCase().trim(),
      phone: args.phone.trim(),
      email: args.email.toLowerCase().trim(),
    }),
});

/**
 * Authoritative uniqueness backstop, called from the auth profile callback
 * (which runs in an action context without direct database access).
 */
export const checkDuplicates = internalQuery({
  args: {
    idNumber: v.string(),
    tscNumber: v.string(),
    phone: v.string(),
    email: v.string(),
  },
  handler: async (ctx: QueryCtx, args) => findDuplicate(ctx, args),
});

/**
 * DEPRECATED — delete right after `migrations:aliasLogins` has been run on the
 * live deployment. Only here so the previously deployed login page keeps working
 * during the rollout; the new login page derives the account id from the TSC and
 * never calls this.
 */
export const getEmailByTsc = query({
  args: { tscNumber: v.string() },
  handler: async (ctx: QueryCtx, args) => {
    const tscNumber = args.tscNumber.toUpperCase().trim();
    if (!tscNumber) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_tsc", (q) => q.eq("tscNumber", tscNumber))
      .first();

    return user ? { email: user.email } : null;
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
    if (targetUser.role !== "member") {
      throw new ConvexError({
        code: "INVALID_TARGET",
        message: "Only teacher-member registrations are approved here.",
      });
    }
    if (targetUser.status === "active") {
      return { success: true };
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
    // Staff accounts are never suspended/rejected through the member workflow,
    // and nobody can change their own status.
    if (targetUser.role !== "member" || targetUser._id === admin._id) {
      throw new ConvexError({
        code: "INVALID_TARGET",
        message: "You can't change the status of this account.",
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
    // The branch has exactly one administrator (the Executive Chairman, set up
    // by adminSetup.setupChairman). Nobody else can be made admin or superadmin.
    if (args.role !== "member") {
      throw new ConvexError({
        code: "ADMIN_LOCKED",
        message: "The Executive Chairman is the only staff account. Everyone else stays a normal teacher account.",
      });
    }
    // Prevents a superadmin demoting themselves and locking everyone out.
    if (targetUser._id === superadmin._id) {
      throw new ConvexError({
        code: "INVALID_TARGET",
        message: "You can't change your own role.",
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
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx: MutationCtx, args) => {
    const currentUser = await requireUser(ctx);

    const updates: Partial<typeof currentUser> = {
      updatedAt: Date.now(),
    };

    if (args.schoolRole !== undefined) updates.schoolRole = args.schoolRole;
    if (args.subjects !== undefined) updates.subjects = args.subjects;
    if (args.phone !== undefined) {
      const phone = args.phone.trim();
      const owner = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", phone))
        .first();
      if (owner && owner._id !== currentUser._id) {
        throw new ConvexError({
          code: "DUPLICATE_PHONE",
          message: "Phone number is already associated with another account.",
        });
      }
      updates.phone = phone;
    }
    // The email doubles as the sign-in account identifier, so it can't be
    // edited here — changing it would lock the teacher out. Admins handle
    // email corrections.
    if (args.email !== undefined && args.email.toLowerCase().trim() !== currentUser.email) {
      throw new ConvexError({
        code: "EMAIL_LOCKED",
        message: "Email can't be changed here. Please contact the branch office.",
      });
    }
    if (args.gender !== undefined) updates.gender = args.gender;
    if (args.photoStorageId !== undefined) {
      const file = await ctx.db.system.get(args.photoStorageId);
      if (
        !file ||
        !file.contentType?.startsWith("image/") ||
        file.size > 5 * 1024 * 1024
      ) {
        await ctx.storage.delete(args.photoStorageId);
        throw new ConvexError({
          code: "INVALID_PHOTO",
          message: "Profile photo must be an image under 5 MB.",
        });
      }
      updates.photoStorageId = args.photoStorageId;
      // Replacing an existing photo — remove the now-orphaned file.
      if (currentUser.photoStorageId && currentUser.photoStorageId !== args.photoStorageId) {
        await ctx.storage.delete(currentUser.photoStorageId);
      }
    }

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

/** Creates a short-lived upload URL for the signed-in user's profile photo. */
export const generateMyPhotoUploadUrl = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Removes the signed-in user's profile photo, deleting the stored file. */
export const removeMyPhoto = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const currentUser = await requireUser(ctx);
    if (!currentUser.photoStorageId) {
      return { success: true };
    }

    await ctx.storage.delete(currentUser.photoStorageId);
    await ctx.db.patch(currentUser._id, {
      photoStorageId: undefined,
      updatedAt: Date.now(),
    });

    await writeAudit(ctx, {
      action: "user.remove_profile_photo",
      entityType: "users",
      entityId: currentUser._id,
      actorId: currentUser._id,
      actorRole: currentUser.role,
    });

    return { success: true };
  },
});


/**
 * Lets a member set their job group and the date they reported to their
 * current school (needed for "length of stay"). Existing members registered
 * before these fields existed fill them in here.
 */
export const updateMyEmployment = mutation({
  args: {
    jobGroup: v.optional(jobGroupValidator),
    schoolStartDate: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);
    const patch: { jobGroup?: typeof args.jobGroup; schoolStartDate?: string; updatedAt: number } = {
      updatedAt: Date.now(),
    };
    if (args.jobGroup) patch.jobGroup = args.jobGroup;
    if (args.schoolStartDate) {
      const d = new Date(args.schoolStartDate);
      if (Number.isNaN(d.getTime()) || d.getTime() > Date.now()) {
        throw new ConvexError({
          code: "INVALID_DATE",
          message: "Enter the date you reported to this school (it cannot be in the future).",
        });
      }
      patch.schoolStartDate = args.schoolStartDate.slice(0, 10);
    }
    await ctx.db.patch(user._id, patch);
    return { success: true };
  },
});
