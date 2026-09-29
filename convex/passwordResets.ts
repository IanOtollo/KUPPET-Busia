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
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import {
  getAuthUserId,
  getAuthSessionId,
  modifyAccountCredentials,
  retrieveAccount,
  invalidateSessions,
} from "@convex-dev/auth/server";
import { requireRole } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { assertStrongPassword } from "./users";
import { Id } from "./_generated/dataModel";
import { loginAliasForTsc } from "./lib/loginAlias";

/** How long an admin-approved temporary password stays usable. */
const TEMP_PASSWORD_TTL_MS = 48 * 60 * 60 * 1000;

async function activeAdmins(ctx: MutationCtx) {
  const admins = [
    ...(await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).collect()),
    ...(await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "superadmin")).collect()),
  ];
  return admins.filter((a) => a.status === "active");
}

/**
 * Teacher-facing (no sign-in — they can't sign in). The teacher proves who they
 * are with TSC number + National ID; if both match the same active teacher
 * account, one open request is raised and every admin is notified. The reply is
 * always identical so this can't be used to discover which TSC numbers exist.
 */
export const request = mutation({
  args: { tscNumber: v.string(), idNumber: v.string() },
  handler: async (ctx: MutationCtx, args) => {
    const tscNumber = args.tscNumber.toUpperCase().trim();
    const idNumber = args.idNumber.trim();

    if (tscNumber && idNumber && tscNumber.length <= 20 && idNumber.length <= 20) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_tsc", (q) => q.eq("tscNumber", tscNumber))
        .first();

      if (user && user.role === "member" && user.status === "active" && user.idNumber === idNumber) {
        const existing = await ctx.db
          .query("passwordResets")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();
        const hasOpen = existing.some((r) => r.status === "requested" || r.status === "approved");

        if (!hasOpen) {
          const now = Date.now();
          const requestId = await ctx.db.insert("passwordResets", {
            userId: user._id,
            tscNumber: user.tscNumber,
            memberName: user.fullName,
            status: "requested",
            requestedAt: now,
          });

          for (const admin of await activeAdmins(ctx)) {
            await ctx.db.insert("notifications", {
              userId: admin._id,
              type: "password_reset_request",
              title: `Password reset requested: ${user.fullName}`,
              body: `TSC ${user.tscNumber} • ${user.school}`,
              link: "/admin/password-resets",
              entityType: "passwordResets",
              entityId: requestId,
              isRead: false,
              createdAt: now,
            });
          }

          await writeAudit(ctx, {
            action: "password_reset.requested",
            entityType: "users",
            entityId: user._id,
            actorRole: "member",
            metadata: { requestId },
          });
        }
      }
    }

    return { received: true };
  },
});

/** Admin: open requests (awaiting action or approved-but-not-yet-used). */
export const listOpen = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    await requireRole(ctx, ["admin", "superadmin"]);
    const requested = await ctx.db
      .query("passwordResets")
      .withIndex("by_status", (q) => q.eq("status", "requested"))
      .collect();
    const approved = await ctx.db
      .query("passwordResets")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();

    const rows = [...requested, ...approved].sort((a, b) => b.requestedAt - a.requestedAt);
    return await Promise.all(
      rows.map(async (r) => {
        const user = await ctx.db.get(r.userId);
        return {
          ...r,
          school: user?.school ?? "",
          tempPasswordExpiresAt: user?.tempPasswordExpiresAt ?? null,
        };
      })
    );
  },
});

/** Admin: refuse a request (e.g. it wasn't genuine). */
export const decline = mutation({
  args: { requestId: v.id("passwordResets") },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);
    const req = await ctx.db.get(args.requestId);
    if (!req || req.status !== "requested") {
      throw new ConvexError({ code: "NOT_FOUND", message: "This request is no longer open." });
    }
    await ctx.db.patch(req._id, { status: "declined", handledBy: admin._id, handledAt: Date.now() });
    await writeAudit(ctx, {
      action: "password_reset.declined",
      entityType: "users",
      entityId: req.userId,
      actorId: admin._id,
      actorRole: admin.role,
      metadata: { requestId: req._id },
    });
    return { success: true };
  },
});

/* ── Approval (action, because it changes the auth credential) ─────────── */

export const prepareApproval = internalMutation({
  args: { requestId: v.id("passwordResets"), adminId: v.id("users") },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await ctx.db.get(args.adminId);
    if (
      !admin ||
      admin.status !== "active" ||
      admin.mustChangePassword ||
      !["admin", "superadmin"].includes(admin.role)
    ) {
      throw new ConvexError({ code: "FORBIDDEN", message: "You do not have permission to do this." });
    }

    const req = await ctx.db.get(args.requestId);
    if (!req || req.status !== "requested") {
      throw new ConvexError({ code: "NOT_FOUND", message: "This request is no longer open." });
    }

    const target = await ctx.db.get(req.userId);
    // Only ordinary teacher accounts can be reset this way — never staff.
    if (!target || target.role !== "member" || target.status !== "active") {
      throw new ConvexError({
        code: "INVALID_TARGET",
        message: "This account can't be reset through this process.",
      });
    }

    const now = Date.now();
    // Flag first: if the credential change below then fails we revert. The
    // reverse order could leave a TSC-as-password account with no forced change.
    await ctx.db.patch(target._id, {
      mustChangePassword: true,
      tempPasswordExpiresAt: now + TEMP_PASSWORD_TTL_MS,
      updatedAt: now,
    });
    await ctx.db.patch(req._id, { status: "approved", handledBy: admin._id, handledAt: now });

    return { email: target.email, tscNumber: target.tscNumber, userId: target._id };
  },
});

export const revertApproval = internalMutation({
  args: { requestId: v.id("passwordResets"), userId: v.id("users") },
  handler: async (ctx: MutationCtx, args) => {
    await ctx.db.patch(args.userId, {
      mustChangePassword: undefined,
      tempPasswordExpiresAt: undefined,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(args.requestId, { status: "requested", handledBy: undefined, handledAt: undefined });
  },
});

export const finishApproval = internalMutation({
  args: { requestId: v.id("passwordResets"), adminId: v.id("users"), userId: v.id("users") },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await ctx.db.get(args.adminId);
    await writeAudit(ctx, {
      action: "password_reset.approved",
      entityType: "users",
      entityId: args.userId,
      actorId: args.adminId,
      actorRole: admin?.role,
      metadata: { requestId: args.requestId },
    });
  },
});

/**
 * Admin: approve a request. The teacher's password becomes their own TSC number
 * (stored hashed like any password), every existing session for that teacher is
 * ended, and the account is locked to "change password" until they set a new one.
 */
export const approve = action({
  args: { requestId: v.id("passwordResets") },
  handler: async (
    ctx: ActionCtx,
    args
  ): Promise<{ success: boolean; tscNumber: string }> => {
    const adminId = await getAuthUserId(ctx);
    if (!adminId) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "You must be signed in." });
    }

    const target: { email: string; tscNumber: string; userId: Id<"users"> } =
      await ctx.runMutation(internal.passwordResets.prepareApproval, {
      requestId: args.requestId,
      adminId,
    });

    try {
      await modifyAccountCredentials(ctx, {
        provider: "password",
        account: { id: loginAliasForTsc(target.tscNumber), secret: target.tscNumber },
      });
      await invalidateSessions(ctx, { userId: target.userId });
    } catch {
      await ctx.runMutation(internal.passwordResets.revertApproval, {
        requestId: args.requestId,
        userId: target.userId,
      });
      throw new ConvexError({
        code: "RESET_FAILED",
        message: "Couldn't reset this account. Nothing was changed — please try again.",
      });
    }

    await ctx.runMutation(internal.passwordResets.finishApproval, {
      requestId: args.requestId,
      adminId,
      userId: target.userId,
    });

    return { success: true, tscNumber: target.tscNumber };
  },
});

/* ── Teacher sets their own password (forced after a reset, or voluntary) ── */

export const getSelfForChange = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx: QueryCtx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    return {
      email: user.email,
      tscNumber: user.tscNumber,
      idNumber: user.idNumber,
      status: user.status,
      mustChangePassword: user.mustChangePassword ?? false,
      tempPasswordExpiresAt: user.tempPasswordExpiresAt ?? null,
    };
  },
});

export const completePasswordChange = internalMutation({
  args: { userId: v.id("users"), forced: v.boolean() },
  handler: async (ctx: MutationCtx, args) => {
    const now = Date.now();
    const user = await ctx.db.get(args.userId);
    await ctx.db.patch(args.userId, {
      mustChangePassword: undefined,
      tempPasswordExpiresAt: undefined,
      updatedAt: now,
    });

    const open = await ctx.db
      .query("passwordResets")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const r of open.filter((r) => r.status === "approved")) {
      await ctx.db.patch(r._id, { status: "completed" });
    }

    await writeAudit(ctx, {
      action: args.forced ? "password_reset.completed" : "user.password_changed",
      entityType: "users",
      entityId: args.userId,
      actorId: args.userId,
      actorRole: user?.role,
    });
  },
});

export const changeMyPassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
    // Required while on a temporary password — a second proof of identity in
    // case someone else knows the teacher's TSC number.
    idNumber: v.optional(v.string()),
  },
  handler: async (ctx: ActionCtx, args): Promise<{ success: boolean }> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "You must be signed in." });
    }

    const me = await ctx.runQuery(internal.passwordResets.getSelfForChange, { userId });
    if (!me || me.status !== "active") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Your account is not active." });
    }

    if (me.mustChangePassword) {
      if (me.tempPasswordExpiresAt !== null && me.tempPasswordExpiresAt < Date.now()) {
        throw new ConvexError({
          code: "RESET_EXPIRED",
          message: "This temporary password has expired. Please request a new reset.",
        });
      }
      if ((args.idNumber ?? "").trim() !== me.idNumber) {
        throw new ConvexError({
          code: "ID_MISMATCH",
          message: "The National ID number you entered doesn't match our records.",
        });
      }
    }

    assertStrongPassword(args.newPassword);
    if (args.newPassword === args.currentPassword) {
      throw new ConvexError({
        code: "WEAK_PASSWORD",
        message: "Your new password must be different from the current one.",
      });
    }
    if (args.newPassword.toUpperCase() === me.tscNumber.toUpperCase()) {
      throw new ConvexError({
        code: "WEAK_PASSWORD",
        message: "Your password cannot be the same as your TSC number.",
      });
    }

    try {
      await retrieveAccount(ctx, {
        provider: "password",
        account: { id: loginAliasForTsc(me.tscNumber), secret: args.currentPassword },
      });
    } catch {
      throw new ConvexError({
        code: "WRONG_PASSWORD",
        message: "Your current password is incorrect.",
      });
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: loginAliasForTsc(me.tscNumber), secret: args.newPassword },
    });

    // End every other session (e.g. anyone else who had the old password) but
    // keep this one, so the teacher isn't kicked out mid-change.
    const sessionId = await getAuthSessionId(ctx);
    await invalidateSessions(ctx, { userId, except: sessionId ? [sessionId] : [] });

    await ctx.runMutation(internal.passwordResets.completePasswordChange, {
      userId,
      forced: me.mustChangePassword,
    });

    return { success: true };
  },
});
