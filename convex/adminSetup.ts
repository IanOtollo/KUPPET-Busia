import {
  internalAction,
  internalMutation,
  internalQuery,
  ActionCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { createAccount, invalidateSessions } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { loginAliasForTsc } from "./lib/loginAlias";
import { Id } from "./_generated/dataModel";

/** The branch's one and only administrator: the Executive Chairman. */
const CHAIRMAN_TSC = "520283";
const CHAIRMAN_PHONE = "0728919641";
const CHAIRMAN_EMAIL = "chairman@kuppetbusia.local";

/** The retired bootstrap account — removed by `setupChairman`. */
const LEGACY_ADMIN_TSC = "000000";

export const findByTsc = internalQuery({
  args: { tscNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_tsc", (q) => q.eq("tscNumber", args.tscNumber))
      .first();
  },
});

export const listAdminAccounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const admins = [
      ...(await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).take(50)),
      ...(await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "superadmin")).take(50)),
    ];
    return admins.map((a) => ({ id: a._id, tscNumber: a.tscNumber, fullName: a.fullName, role: a.role }));
  },
});

/** Removes the legacy account completely: user record, login credentials and notifications. */
export const deleteLegacyAdmin = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    // Safety: this can only ever delete the retired bootstrap account.
    if (!user || user.tscNumber !== LEGACY_ADMIN_TSC) return { deleted: false };

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", args.userId))
      .collect();
    for (const a of accounts) await ctx.db.delete(a._id);

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .take(500);
    for (const n of notifications) await ctx.db.delete(n._id);

    await ctx.db.delete(args.userId);
    return { deleted: true };
  },
});

/**
 * One-shot, idempotent admin setup. Run after deploy:
 *   npx convex run adminSetup:setupChairman '{}'
 *
 * 1. Creates the Executive Chairman (TSC 520283) as the only superadmin. The
 *    account has no usable password: the first time the chairman types the TSC
 *    number on /login, the portal asks him to create one
 *    (see passwordSetup.ts). Nothing secret is stored in source.
 * 2. Permanently deletes the old TSC 000000 account and ends its sessions.
 * 3. Reports any other admin-level account so it can be reviewed.
 *
 * Internal action: it cannot be called from the internet.
 */
export const setupChairman = internalAction({
  args: {},
  handler: async (ctx: ActionCtx) => {
    const result: {
      chairman: "created" | "already_exists";
      legacyAdmin: "deleted" | "not_found";
      otherAdminAccounts: { tscNumber: string; fullName: string; role: string }[];
    } = { chairman: "already_exists", legacyAdmin: "not_found", otherAdminAccounts: [] };

    const existing = await ctx.runQuery(internal.adminSetup.findByTsc, { tscNumber: CHAIRMAN_TSC });
    if (!existing) {
      const now = Date.now();
      // The credential exists but nobody knows it: a random secret nobody sees.
      const unusableSecret = `${crypto.randomUUID()}${crypto.randomUUID()}`;
      await createAccount(ctx as any, {
        provider: "password",
        account: { id: loginAliasForTsc(CHAIRMAN_TSC), secret: unusableSecret },
        profile: {
          email: CHAIRMAN_EMAIL,
          fullName: "Executive Chairman",
          idNumber: `PENDING-${CHAIRMAN_TSC}`,
          tscNumber: CHAIRMAN_TSC,
          phone: CHAIRMAN_PHONE,
          school: "KUPPET Busia Branch Secretariat",
          subCounty: "Matayos",
          designation: "Other",
          role: "superadmin",
          status: "active",
          passwordSetupPending: true,
          failedLoginCount: 0,
          createdAt: now,
          updatedAt: now,
        },
        shouldLinkViaEmail: false,
        shouldLinkViaPhone: false,
      });
      result.chairman = "created";
    }

    const legacy = await ctx.runQuery(internal.adminSetup.findByTsc, { tscNumber: LEGACY_ADMIN_TSC });
    if (legacy) {
      await invalidateSessions(ctx, { userId: legacy._id as Id<"users"> });
      const res = await ctx.runMutation(internal.adminSetup.deleteLegacyAdmin, { userId: legacy._id });
      if (res.deleted) result.legacyAdmin = "deleted";
    }

    const admins = await ctx.runQuery(internal.adminSetup.listAdminAccounts, {});
    result.otherAdminAccounts = admins
      .filter((a) => a.tscNumber !== CHAIRMAN_TSC)
      .map((a) => ({ tscNumber: a.tscNumber, fullName: a.fullName, role: a.role }));

    return result;
  },
});
