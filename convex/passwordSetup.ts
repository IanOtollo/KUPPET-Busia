import { query, action, internalMutation, QueryCtx, MutationCtx, ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import { modifyAccountCredentials } from "@convex-dev/auth/server";
import { consumeRateLimit } from "./lib/rateLimit";
import { writeAudit } from "./lib/audit";
import { loginAliasForTsc } from "./lib/loginAlias";
import { assertStrongPassword } from "./users";

const digits = (s: string) => s.replace(/\D/g, "");
/** 07xx xxx xxx / +2547xx xxx xxx / 254 7xx xxx xxx all compare equal. */
const sameKenyanPhone = (a: string, b: string) => {
  const x = digits(a);
  const y = digits(b);
  return x.length >= 9 && y.length >= 9 && x.slice(-9) === y.slice(-9);
};

/**
 * Does this TSC number belong to an account that is still waiting for its first
 * password? Only ever true for a freshly created staff account, so for every
 * ordinary member (and for unknown numbers) it answers false — it can't be used
 * to find out which TSC numbers are registered.
 */
export const needsSetup = query({
  args: { tscNumber: v.string() },
  handler: async (ctx: QueryCtx, args) => {
    const tsc = args.tscNumber.toUpperCase().trim();
    if (!tsc) return false;
    const user = await ctx.db
      .query("users")
      .withIndex("by_tsc", (q) => q.eq("tscNumber", tsc))
      .first();
    return !!user && user.passwordSetupPending === true && user.status === "active";
  },
});

/**
 * Atomically claims the one-time setup (so two simultaneous requests can't both
 * win) after checking the second proof of identity, the mobile number on file.
 * Wrong guesses are counted: a mismatch returns a result rather than throwing,
 * because a thrown error would roll the attempt counter back.
 */
export const claimSetup = internalMutation({
  args: { tscNumber: v.string(), phone: v.string() },
  handler: async (ctx: MutationCtx, args) => {
    const tsc = args.tscNumber.toUpperCase().trim();
    await consumeRateLimit(ctx, `pwsetup:${tsc}`, 8, 60 * 60 * 1000);
    await consumeRateLimit(ctx, "pwsetup:global", 60, 60 * 60 * 1000);

    const user = await ctx.db
      .query("users")
      .withIndex("by_tsc", (q) => q.eq("tscNumber", tsc))
      .first();
    if (
      !user ||
      user.passwordSetupPending !== true ||
      user.status !== "active" ||
      !sameKenyanPhone(user.phone, args.phone)
    ) {
      return { ok: false as const };
    }
    await ctx.db.patch(user._id, { passwordSetupPending: undefined, updatedAt: Date.now() });
    return { ok: true as const, userId: user._id, tscNumber: user.tscNumber };
  },
});

export const releaseSetup = internalMutation({
  args: { tscNumber: v.string() },
  handler: async (ctx: MutationCtx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_tsc", (q) => q.eq("tscNumber", args.tscNumber))
      .first();
    if (user) await ctx.db.patch(user._id, { passwordSetupPending: true, updatedAt: Date.now() });
  },
});

export const finishSetup = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx: MutationCtx, args) => {
    const user = await ctx.db.get(args.userId);
    await writeAudit(ctx, {
      action: "user.first_password_set",
      entityType: "users",
      entityId: args.userId,
      actorId: args.userId,
      actorRole: user?.role,
    });
  },
});

/**
 * First sign-in for an account created without a password: the person proves
 * the mobile number on file and chooses their own password. Works exactly once.
 */
export const completeFirstSetup = action({
  args: { tscNumber: v.string(), phone: v.string(), newPassword: v.string() },
  handler: async (ctx: ActionCtx, args): Promise<{ success: true }> => {
    assertStrongPassword(args.newPassword);
    if (args.newPassword.toUpperCase() === args.tscNumber.toUpperCase().trim()) {
      throw new ConvexError({
        code: "WEAK_PASSWORD",
        message: "Your password cannot be the same as your TSC number.",
      });
    }

    const claim = await ctx.runMutation(internal.passwordSetup.claimSetup, {
      tscNumber: args.tscNumber,
      phone: args.phone,
    });
    if (!claim.ok) {
      throw new ConvexError({
        code: "SETUP_REFUSED",
        message: "We couldn't verify those details. Check the TSC number and mobile number and try again.",
      });
    }

    try {
      await modifyAccountCredentials(ctx, {
        provider: "password",
        account: { id: loginAliasForTsc(claim.tscNumber), secret: args.newPassword },
      });
    } catch {
      await ctx.runMutation(internal.passwordSetup.releaseSetup, { tscNumber: claim.tscNumber });
      throw new ConvexError({
        code: "SETUP_FAILED",
        message: "Couldn't save your password. Nothing was changed, please try again.",
      });
    }

    await ctx.runMutation(internal.passwordSetup.finishSetup, { userId: claim.userId });
    return { success: true };
  },
});
