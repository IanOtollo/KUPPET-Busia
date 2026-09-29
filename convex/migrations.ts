import { internalMutation, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { loginAliasForTsc } from "./lib/loginAlias";

/**
 * One-off: moves every existing password account from "sign in with the real
 * email" to the TSC-derived login alias, so the login page no longer needs a
 * server lookup. Idempotent — safe to run more than once.
 *
 *   npx convex run migrations:aliasLogins '{}'
 */
export const aliasLogins = internalMutation({
  args: { tscs: v.optional(v.array(v.string())) },
  handler: async (ctx: MutationCtx, args) => {
    const accounts = await ctx.db.query("authAccounts").collect();
    let updated = 0;
    let skipped = 0;
    const problems: string[] = [];

    for (const account of accounts) {
      if (account.provider !== "password") continue;
      const user = await ctx.db.get(account.userId);
      if (!user) {
        problems.push(`account ${account._id}: no user`);
        continue;
      }
      // Optional scope (used for testing on throwaway accounts).
      if (args.tscs && !args.tscs.includes(user.tscNumber)) continue;
      const alias = loginAliasForTsc(user.tscNumber);
      if (account.providerAccountId === alias) {
        skipped++;
        continue;
      }
      await ctx.db.patch(account._id, { providerAccountId: alias });
      updated++;
    }

    return { updated, skipped, problems };
  },
});
