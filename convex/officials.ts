import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { officialTierValidator } from "./lib/validators";
import { ConvexError } from "convex/values";

const CURRENT_OFFICIAL_ROSTER = [
  { fullName: "Charles Mukhwana", position: "Executive Secretary", responsibilities: "Leads branch administration, correspondence, and the implementation of Executive Committee decisions.", portfolioArea: "Branch Administration", displayOrder: 1, tier: "executive" as const, canHandleHarassment: true },
  { fullName: "Hellen Mwene", position: "Assistant Executive Secretary", responsibilities: "Supports branch administration, records, correspondence, and member services.", portfolioArea: "Administration & Records", displayOrder: 2, tier: "executive" as const, canHandleHarassment: true },
  { fullName: "James Omaset", position: "Branch Chairperson", responsibilities: "Chairs branch meetings, provides governance oversight, and represents the branch in official forums.", portfolioArea: "Branch Governance", displayOrder: 3, tier: "executive" as const, canHandleHarassment: true },
  { fullName: "Alex Makana", position: "Assistant Chairperson", responsibilities: "Deputises the Branch Chairperson and supports branch governance and member welfare matters.", portfolioArea: "Branch Governance & Welfare", displayOrder: 4, tier: "executive" as const, canHandleHarassment: false },
  { fullName: "Moses Were", position: "Treasurer", responsibilities: "Oversees branch finances, accounts, approved disbursements, and financial reporting.", portfolioArea: "Treasury & Finance", displayOrder: 5, tier: "executive" as const, canHandleHarassment: false },
  { fullName: "Yonam Okoro", position: "Organizing Secretary", responsibilities: "Coordinates member mobilization, branch activities, meetings, and events.", portfolioArea: "Mobilization & Events", displayOrder: 6, tier: "executive" as const, canHandleHarassment: false },
  { fullName: "Don Emacar", position: "Secretary – Secondary Schools", responsibilities: "Coordinates representation and member services for secondary-school teachers.", portfolioArea: "Secondary Schools", displayOrder: 7, tier: "official" as const, canHandleHarassment: false },
  { fullName: "Kelvin Obilo", position: "Secretary – Junior Secondary (JS)", responsibilities: "Coordinates representation and member services for junior-secondary teachers.", portfolioArea: "Junior Secondary", displayOrder: 8, tier: "official" as const, canHandleHarassment: false },
];

/**
 * Public & Member query to list all active branch officials ordered by displayOrder.
 */
export const listActive = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const officials = await ctx.db
      .query("officials")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    return officials.sort((a, b) => a.displayOrder - b.displayOrder);
  },
});

/**
 * Admin query to list all officials (including inactive/archived ones).
 */
export const listAllAdmin = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    await requireRole(ctx, ["admin", "superadmin"]);
    const officials = await ctx.db.query("officials").collect();
    return officials.sort((a, b) => a.displayOrder - b.displayOrder);
  },
});

/** Replaces the active branch roster with the approved current office holders. */
export const syncCurrentRoster = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);
    const now = Date.now();
    const activeOfficials = (await ctx.db
      .query("officials")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect()).sort((a, b) => a.displayOrder - b.displayOrder);

    for (let index = 0; index < CURRENT_OFFICIAL_ROSTER.length; index++) {
      const rosterEntry = CURRENT_OFFICIAL_ROSTER[index];
      const existing = activeOfficials[index];
      if (existing) {
        await ctx.db.replace(existing._id, {
          ...rosterEntry,
          isActive: true,
          createdAt: existing.createdAt,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("officials", {
          ...rosterEntry,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    for (const surplus of activeOfficials.slice(CURRENT_OFFICIAL_ROSTER.length)) {
      await ctx.db.patch(surplus._id, { isActive: false, updatedAt: now });
    }

    await writeAudit(ctx, {
      action: "officials.roster_synced",
      entityType: "officials",
      actorId: admin._id,
      actorRole: admin.role,
    });

    return { success: true, count: CURRENT_OFFICIAL_ROSTER.length };
  },
});

/**
 * Admin mutation to create a new branch official.
 */
export const create = mutation({
  args: {
    fullName: v.string(),
    position: v.string(),
    responsibilities: v.string(),
    portfolioArea: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    displayOrder: v.number(),
    tier: officialTierValidator,
    canHandleHarassment: v.boolean(),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);

    const now = Date.now();
    const id = await ctx.db.insert("officials", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await writeAudit(ctx, {
      action: "official.created",
      entityType: "officials",
      entityId: id,
      actorId: admin._id,
      actorRole: admin.role,
      metadata: { name: args.fullName, position: args.position },
    });

    return id;
  },
});

/**
 * Admin mutation to update an official's details.
 */
export const update = mutation({
  args: {
    id: v.id("officials"),
    fullName: v.string(),
    position: v.string(),
    responsibilities: v.string(),
    portfolioArea: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    displayOrder: v.number(),
    tier: officialTierValidator,
    canHandleHarassment: v.boolean(),
    photoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);
    const { id, ...data } = args;

    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Official not found",
      });
    }

    await ctx.db.patch(id, {
      ...data,
      updatedAt: Date.now(),
    });

    await writeAudit(ctx, {
      action: "official.updated",
      entityType: "officials",
      entityId: id,
      actorId: admin._id,
      actorRole: admin.role,
    });

    return { success: true };
  },
});

/**
 * Admin mutation to soft-archive an official.
 * Soft delete: sets isActive to false, never hard deletes.
 */
export const archive = mutation({
  args: {
    id: v.id("officials"),
  },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);

    const existing = await ctx.db.get(args.id);
    if (!existing) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Official not found",
      });
    }

    await ctx.db.patch(args.id, {
      isActive: false,
      updatedAt: Date.now(),
    });

    await writeAudit(ctx, {
      action: "official.archived",
      entityType: "officials",
      entityId: args.id,
      actorId: admin._id,
      actorRole: admin.role,
    });

    return { success: true };
  },
});

/**
 * Admin mutation to reorder officials display order.
 */
export const reorder = mutation({
  args: {
    orderedIds: v.array(v.id("officials")),
  },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);

    for (let index = 0; index < args.orderedIds.length; index++) {
      const id = args.orderedIds[index];
      await ctx.db.patch(id, {
        displayOrder: index + 1,
        updatedAt: Date.now(),
      });
    }

    await writeAudit(ctx, {
      action: "officials.reordered",
      entityType: "officials",
      actorId: admin._id,
      actorRole: admin.role,
    });

    return { success: true };
  },
});
