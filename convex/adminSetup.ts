import { internalAction, ActionCtx, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { createAccount } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { loginAliasForTsc } from "./lib/loginAlias";

const DEFAULT_ADMIN_TSC = "000000";
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
 * Signs in with TSC 000000 and the password held in the Convex environment
 * variable DEFAULT_ADMIN_PASSWORD (set it with
 * `npx convex env set DEFAULT_ADMIN_PASSWORD <password>`). The password is
 * never stored in source; Convex Auth hashes it (Scrypt) before saving.
 * This is an internal action, so it cannot be called from the internet.
 */
export const createDefaultAdmin = internalAction({
  args: {},
  handler: async (ctx: ActionCtx) => {
    const existing = await ctx.runQuery(internal.adminSetup.findByTsc, {
      tscNumber: DEFAULT_ADMIN_TSC,
    });

    if (existing) {
      return { created: false, message: "Default admin account already exists." };
    }

    const password = process.env.DEFAULT_ADMIN_PASSWORD;
    if (!password || password.length < 8) {
      throw new Error(
        "Set DEFAULT_ADMIN_PASSWORD (8+ characters) on the Convex deployment first."
      );
    }

    const now = Date.now();
    await createAccount(ctx as any, {
      provider: "password",
      account: { id: loginAliasForTsc(DEFAULT_ADMIN_TSC), secret: password },
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
