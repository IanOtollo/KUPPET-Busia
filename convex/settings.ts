import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";
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

    const bad = (message: string) => new ConvexError({ code: "INVALID_SETTINGS", message });
    const branchName = args.branchName.trim();
    const contactPhone = args.contactPhone.trim();
    const contactEmail = args.contactEmail.trim();
    if (branchName.length < 2 || branchName.length > 100) throw bad("Branch name must be 2 to 100 characters.");
    if (!Number.isInteger(args.busNoticeDays) || args.busNoticeDays < 0 || args.busNoticeDays > 60) {
      throw bad("Bus notice period must be a whole number of days from 0 to 60.");
    }
    if (!Number.isInteger(args.busCapacitySeats) || args.busCapacitySeats < 1 || args.busCapacitySeats > 200) {
      throw bad("Bus capacity must be a whole number of seats from 1 to 200.");
    }
    if (!/^\+?[0-9 ()-]{7,20}$/.test(contactPhone)) throw bad("Enter a valid contact phone number.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) || contactEmail.length > 120) {
      throw bad("Enter a valid contact email address.");
    }
    const clean = { ...args, branchName, contactPhone, contactEmail };

    const existing = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", BRANCH_CONFIG_KEY))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value: clean });
    } else {
      await ctx.db.insert("settings", { key: BRANCH_CONFIG_KEY, value: clean });
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
