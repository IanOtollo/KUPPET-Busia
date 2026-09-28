import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { writeAudit } from "./lib/audit";

const BRANCH_CONFIG_KEY = "branch_config";

export interface BranchConfig {
  branchName: string;
  busNoticeDays: number;
  busCapacitySeats: number;
  contactPhone: string;
  contactEmail: string;
}

const DEFAULT_BRANCH_CONFIG: BranchConfig = {
  branchName: "KUPPET Busia Branch",
  busNoticeDays: 3,
  busCapacitySeats: 62,
  contactPhone: "+254722000001",
  contactEmail: "execsec@kuppetbusia.ke",
};

/**
 * Reusable lookup (not a Convex function itself) so other modules — e.g.
 * busBookings.ts's notice-period rule — read the same admin-configured
 * values instead of hardcoding their own copy.
 */
export async function readBranchConfig(ctx: QueryCtx | MutationCtx): Promise<BranchConfig> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", BRANCH_CONFIG_KEY))
    .first();

  return row ? { ...DEFAULT_BRANCH_CONFIG, ...(row.value as Partial<BranchConfig>) } : DEFAULT_BRANCH_CONFIG;
}

/**
 * Returns the branch configuration, falling back to sensible defaults if no
 * record has been saved yet.
 */
export const getBranchConfig = query({
  args: {},
  handler: async (ctx: QueryCtx): Promise<BranchConfig> => readBranchConfig(ctx),
});

/**
 * Admin mutation to persist the branch configuration.
 */
export const setBranchConfig = mutation({
  args: {
    branchName: v.string(),
    busNoticeDays: v.number(),
    busCapacitySeats: v.number(),
    contactPhone: v.string(),
    contactEmail: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", BRANCH_CONFIG_KEY))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: args });
    } else {
      await ctx.db.insert("settings", { key: BRANCH_CONFIG_KEY, value: args });
    }

    await writeAudit(ctx, {
      action: "settings.branch_config_updated",
      entityType: "settings",
      entityId: BRANCH_CONFIG_KEY,
      actorId: admin._id,
      actorRole: admin.role,
    });

    return { success: true };
  },
});
