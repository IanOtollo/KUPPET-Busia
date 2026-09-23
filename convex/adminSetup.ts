import { action } from "./_generated/server";
import { v } from "convex/values";
import { createAccount } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

/**
 * One-time action to create the superadmin account.
 * Creates the auth identity via @convex-dev/auth Password provider
 * and marks the user record as superadmin.
 * 
 * Run via: npx convex run adminSetup:createSuperAdmin
 */
export const createSuperAdmin = action({
  args: {
    email: v.optional(v.string()),
    password: v.optional(v.string()),
    fullName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.email || !args.password || !args.fullName) {
      throw new Error(
        "email, password and fullName are required. Pass them as arguments when running this one-time setup."
      );
    }
    const email = args.email.toLowerCase().trim();
    const password = args.password;
    const fullName = args.fullName.trim();

    // Use the same createAccount fn that Password provider uses internally
    // This hashes the password with Scrypt (same as normal sign-up)
    const { user } = await createAccount(ctx as any, {
      provider: "password",
      account: {
        id: email,
        secret: password,
      },
      profile: {
        email,
        fullName,
        idNumber: "11223344",
        tscNumber: "ADM001",
        phone: "+254700000000",
        school: "KUPPET Busia Branch Secretariat",
        subCounty: "Matayos",
        designation: "Other",
        role: "superadmin",
        status: "active",
        failedLoginCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      shouldLinkViaEmail: false,
      shouldLinkViaPhone: false,
    });

    // Now promote the user record to superadmin
    await ctx.runMutation(internal.adminSetup.promoteToSuperAdmin, {
      authId: user._id as string,
      email,
      fullName,
    });

    return { success: true, message: `Superadmin created: ${email}` };
  },
});

import { internalMutation } from "./_generated/server";

export const promoteToSuperAdmin = internalMutation({
  args: {
    authId: v.string(),
    email: v.string(),
    fullName: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if a user record already exists with this email
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      // Just promote the existing record
      await ctx.db.patch(existing._id, {
        role: "superadmin",
        status: "active",
        authId: args.authId,
        updatedAt: now,
      });
      return { updated: true };
    }

    // Create a fresh superadmin user record
    await ctx.db.insert("users", {
      fullName: args.fullName,
      email: args.email,
      idNumber: "ADMIN001",
      tscNumber: "ADM001",
      phone: "+254700000000",
      school: "KUPPET Busia Branch Secretariat",
      subCounty: "Matayos",
      designation: "Other",
      role: "superadmin",
      status: "active",
      authId: args.authId,
      failedLoginCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return { created: true };
  },
});
