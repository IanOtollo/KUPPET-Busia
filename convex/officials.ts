import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { officialTierValidator } from "./lib/validators";
import { ConvexError } from "convex/values";

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
