import { action, ActionCtx, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { createAccount } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

const DEFAULT_ADMIN_TSC = "000000";
const DEFAULT_ADMIN_PASSWORD = "bsa2026";
const DEFAULT_ADMIN_EMAIL = "admin@kuppetbusia.local";

export const findByTsc = internalQuery({
  args: { tscNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_tsc", (q) => q.eq("tscNumber", args.tscNumber))
      .first();
  },
});

/**
 * Idempotent bootstrap for the branch's first administrator account.
 * Run once after deploy: `npx convex run adminSetup:createDefaultAdmin '{}'`
 * Signs in with TSC 000000 / the branch-issued default password, same as any
 * other account — there is no separate email-based admin login.
 */
export const createDefaultAdmin = action({
  args: {},
  handler: async (ctx: ActionCtx) => {
    const existing = await ctx.runQuery(internal.adminSetup.findByTsc, {
      tscNumber: DEFAULT_ADMIN_TSC,
    });

    if (existing) {
      return { created: false, message: "Default admin account already exists." };
    }

    const now = Date.now();
    await createAccount(ctx as any, {
      provider: "password",
      account: { id: DEFAULT_ADMIN_EMAIL, secret: DEFAULT_ADMIN_PASSWORD },
      profile: {
        email: DEFAULT_ADMIN_EMAIL,
        fullName: "Executive Secretary",
        idNumber: "00000000",
        tscNumber: DEFAULT_ADMIN_TSC,
        phone: "+254700000000",
        school: "KUPPET Busia Branch Secretariat",
        subCounty: "Matayos",
        designation: "Other",
        role: "superadmin",
        status: "active",
        failedLoginCount: 0,
        createdAt: now,
        updatedAt: now,
      },
      shouldLinkViaEmail: false,
      shouldLinkViaPhone: false,
    });

    return { created: true, tscNumber: DEFAULT_ADMIN_TSC };
  },
});
