import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { requireRole } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { officialTierValidator } from "./lib/validators";
import { ConvexError } from "convex/values";

const CURRENT_OFFICIAL_ROSTER = [
  { fullName: "Charles Mukhwana", position: "Executive Secretary", responsibilities: "Leads branch administration, correspondence, and the implementation of Executive Committee decisions.", portfolioArea: "Branch Administration", displayOrder: 1, tier: "executive" as const, canHandleHarassment: true },
  { fullName: "Hellen Mwene", position: "Assistant Executive Secretary", responsibilities: "Supports branch administration, records, correspondence, and member services.", portfolioArea: "Administration & Records", displayOrder: 2, tier: "executive" as const, canHandleHarassment: true },
  { fullName: "James Omaset", position: "Chairman", responsibilities: "Chairs branch meetings, provides governance oversight, and represents the branch in official forums.", portfolioArea: "Branch Governance", displayOrder: 3, tier: "executive" as const, canHandleHarassment: true },
  { fullName: "Alex Makana", position: "Vice Chairman", responsibilities: "Deputises the Chairman and supports branch governance and member welfare matters.", portfolioArea: "Branch Governance & Welfare", displayOrder: 4, tier: "executive" as const, canHandleHarassment: false },
  { fullName: "Moses Were", position: "Treasurer", responsibilities: "Oversees branch finances, accounts, approved disbursements, and financial reporting.", portfolioArea: "Treasury & Finance", displayOrder: 5, tier: "executive" as const, canHandleHarassment: false },
  { fullName: "Jack Namutala", position: "Assistant Treasurer", responsibilities: "Supports the Treasurer with branch accounts, collections, and financial records.", portfolioArea: "Treasury & Finance", displayOrder: 6, tier: "executive" as const, canHandleHarassment: false },
  { fullName: "Yonam Okoro", position: "Organizing Secretary", responsibilities: "Coordinates member mobilization, branch activities, meetings, and events.", portfolioArea: "Mobilization & Events", displayOrder: 7, tier: "executive" as const, canHandleHarassment: false },
  { fullName: "Don Emacar", position: "Secretary Secondary", responsibilities: "Coordinates representation and member services for secondary-school teachers.", portfolioArea: "Secondary Schools", displayOrder: 8, tier: "official" as const, canHandleHarassment: false },
  { fullName: "Kelvin Obilo", position: "Secretary Junior Secondary", responsibilities: "Coordinates representation and member services for junior-secondary teachers.", portfolioArea: "Junior Secondary", displayOrder: 9, tier: "official" as const, canHandleHarassment: false },
  { fullName: "Kevin Khasenye", position: "Secretary Tertiary", responsibilities: "Coordinates representation and member services for teachers in tertiary institutions.", portfolioArea: "Tertiary Institutions", displayOrder: 10, tier: "official" as const, canHandleHarassment: false },
  { fullName: "Cynthia Olale", position: "Gender Secretary", responsibilities: "Leads gender affairs in the branch and champions the welfare and rights of women and girls in the teaching service.", portfolioArea: "Gender Affairs", displayOrder: 11, tier: "official" as const, canHandleHarassment: true },
  { fullName: "Lydia Nyongesa", position: "Gender 1", responsibilities: "Supports the Gender Secretary on gender-related welfare, awareness, and member concerns.", portfolioArea: "Gender Affairs", displayOrder: 12, tier: "official" as const, canHandleHarassment: true },
  { fullName: "Elizabeth Nzomo", position: "Gender 2 (PLWD)", responsibilities: "Represents teachers living with disabilities and promotes their inclusion, welfare, and rights.", portfolioArea: "Persons Living with Disabilities", displayOrder: 13, tier: "official" as const, canHandleHarassment: false },
  { fullName: "Murunga Muliro", position: "Gender 3 (Youths and Sports)", responsibilities: "Represents young teachers and promotes sports and youth engagement, welfare, and rights in the branch.", portfolioArea: "Youths & Sports", displayOrder: 14, tier: "official" as const, canHandleHarassment: false },
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

    return await Promise.all(
      officials
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map(async ({ linkedUserId: _linkedUserId, ...official }) => ({
          ...official,
          photoUrl: official.photoStorageId
            ? await ctx.storage.getUrl(official.photoStorageId)
            : null,
        }))
    );
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
    return await Promise.all(
      officials
        .sort((a, b) => a.displayOrder - b.displayOrder)
        .map(async (official) => ({
          ...official,
          photoUrl: official.photoStorageId
            ? await ctx.storage.getUrl(official.photoStorageId)
            : null,
        }))
    );
  },
});

const norm = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Makes the officials table match the approved roster: current office holders
 * are updated (keeping their photo, phone, email and linked account) or
 * created when missing, and anyone no longer on the roster is archived.
 * Existing rows are matched by name, then by position, so a re-spelt name or a
 * re-titled office keeps its photo instead of being duplicated.
 */
async function applyRoster(ctx: MutationCtx) {
  const now = Date.now();
  const all = await ctx.db.query("officials").collect();
  const claimed = new Set<string>();

  for (const entry of CURRENT_OFFICIAL_ROSTER) {
    const existing =
      all.find((o) => !claimed.has(o._id) && norm(o.fullName) === norm(entry.fullName)) ??
      all.find((o) => !claimed.has(o._id) && norm(o.position) === norm(entry.position));

    if (existing) {
      claimed.add(existing._id);
      await ctx.db.replace(existing._id, {
        ...entry,
        ...(existing.phone ? { phone: existing.phone } : {}),
        ...(existing.email ? { email: existing.email } : {}),
        ...(existing.photoStorageId ? { photoStorageId: existing.photoStorageId } : {}),
        ...(existing.linkedUserId ? { linkedUserId: existing.linkedUserId } : {}),
        isActive: true,
        createdAt: existing.createdAt,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("officials", { ...entry, isActive: true, createdAt: now, updatedAt: now });
    }
  }

  for (const o of all) {
    if (!claimed.has(o._id) && o.isActive) {
      await ctx.db.patch(o._id, { isActive: false, updatedAt: now });
    }
  }
}

/** Admin: replace the branch roster with the approved office holders. */
export const syncCurrentRoster = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);
    await applyRoster(ctx);
    await writeAudit(ctx, {
      action: "officials.roster_synced",
      entityType: "officials",
      actorId: admin._id,
      actorRole: admin.role,
    });
    return { success: true, count: CURRENT_OFFICIAL_ROSTER.length };
  },
});

// Bump when CURRENT_OFFICIAL_ROSTER changes so the next deploy re-applies it.
const ROSTER_VERSION = 1;
const ROSTER_VERSION_KEY = "officials_roster_version";

/**
 * Run after every deploy (see vercel.json). Applies the roster once per
 * ROSTER_VERSION, so later admin edits to officials are never overwritten by a
 * routine redeploy.
 */
export const applyApprovedRoster = internalMutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    const row = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", ROSTER_VERSION_KEY))
      .first();
    if (row && row.value >= ROSTER_VERSION) return { applied: false };

    await applyRoster(ctx);
    if (row) await ctx.db.patch(row._id, { value: ROSTER_VERSION });
    else await ctx.db.insert("settings", { key: ROSTER_VERSION_KEY, value: ROSTER_VERSION });
    return { applied: true, count: CURRENT_OFFICIAL_ROSTER.length };
  },
});

/** Creates a short-lived upload URL for an official profile photograph. */
export const generatePhotoUploadUrl = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    await requireRole(ctx, ["admin", "superadmin"]);
    return await ctx.storage.generateUploadUrl();
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
