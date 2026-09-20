import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser, requireRole, requireUser } from "./lib/auth";
import { writeAudit } from "./lib/audit";
import { generateReference } from "./lib/refs";
import {
  busBookingStatusValidator,
  busPurposeValidator,
} from "./lib/validators";
import { ConvexError } from "convex/values";
import { Doc } from "./_generated/dataModel";

const LEGAL_BUS_TRANSITIONS: Record<string, string[]> = {
  requested: ["under_review", "approved", "declined", "cancelled"],
  under_review: ["approved", "declined", "cancelled"],
  approved: ["confirmed", "declined", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  declined: [],
  cancelled: [],
};

/**
 * Check if a date range overlaps with any confirmed or approved booking.
 */
async function hasBookingConflict(
  ctx: QueryCtx | MutationCtx,
  departureIso: string,
  returnIso: string,
  excludeId?: string
): Promise<boolean> {
  const dep = new Date(departureIso).getTime();
  const ret = new Date(returnIso).getTime();

  const allBookings = await ctx.db.query("busBookings").collect();

  return allBookings.some((b) => {
    if (excludeId && b._id === excludeId) return false;
    if (!["approved", "confirmed"].includes(b.status)) return false;

    const bDep = new Date(b.departureAt).getTime();
    const bRet = new Date(b.returnAt).getTime();

    // Overlap check
    return Math.max(dep, bDep) < Math.min(ret, bRet);
  });
}

/**
 * Submit a bus booking request.
 */
export const create = mutation({
  args: {
    purpose: busPurposeValidator,
    reason: v.string(),
    departureAt: v.string(),
    returnAt: v.string(),
    departurePoint: v.string(),
    destination: v.string(),
    distanceKm: v.optional(v.number()),
    passengers: v.number(),
    tripContactName: v.string(),
    tripContactPhone: v.string(),
    extraRequirements: v.optional(v.string()),
    school: v.string(),
    phone: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);

    // Mandatory reason length: 30 to 600 chars
    const cleanReason = args.reason.trim();
    if (cleanReason.length < 30 || cleanReason.length > 600) {
      throw new ConvexError({
        code: "INVALID_REASON",
        message: "Reason for request is mandatory and must be between 30 and 600 characters.",
      });
    }

    // Passengers: 1 to 62
    if (args.passengers < 1 || args.passengers > 62) {
      throw new ConvexError({
        code: "INVALID_PASSENGERS",
        message: "Number of passengers must be between 1 and 62 (bus maximum capacity).",
      });
    }

    // Departure notice period: >= 3 days
    const depDate = new Date(args.departureAt);
    const retDate = new Date(args.returnAt);
    const now = new Date();

    const minNoticeDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    if (depDate < minNoticeDate) {
      throw new ConvexError({
        code: "NOTICE_PERIOD_VIOLATION",
        message: "Bus requests require a minimum 3-day advance notice period.",
      });
    }

    if (retDate <= depDate) {
      throw new ConvexError({
        code: "INVALID_DATES",
        message: "Return date & time must be after the departure date & time.",
      });
    }

    // Check double-booking conflict
    const conflict = await hasBookingConflict(ctx, args.departureAt, args.returnAt);
    if (conflict) {
      throw new ConvexError({
        code: "BOOKING_CONFLICT",
        message: "The requested date range conflicts with an existing confirmed bus booking.",
      });
    }

    const reference = await generateReference(ctx, "BUS");
    const currentTime = Date.now();

    const bookingId = await ctx.db.insert("busBookings", {
      reference,
      memberId: user._id,
      requesterName: user.fullName,
      phone: args.phone,
      school: args.school,
      purpose: args.purpose,
      reason: cleanReason,
      departureAt: args.departureAt,
      returnAt: args.returnAt,
      departurePoint: args.departurePoint.trim(),
      destination: args.destination.trim(),
      distanceKm: args.distanceKm,
      passengers: args.passengers,
      tripContactName: args.tripContactName.trim(),
      tripContactPhone: args.tripContactPhone.trim(),
      extraRequirements: args.extraRequirements?.trim(),
      status: "requested",
      createdAt: currentTime,
      updatedAt: currentTime,
    });

    // In-app notification
    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "bus_requested",
      title: "Bus Reservation Requested",
      body: `Your request for the branch bus (${reference}) to ${args.destination} has been received and sent for administrative review.`,
      link: `/bus/${bookingId}`,
      entityType: "bus",
      entityId: bookingId,
      isRead: false,
      createdAt: currentTime,
    });

    await writeAudit(ctx, {
      action: "bus.requested",
      entityType: "busBookings",
      entityId: bookingId,
      actorId: user._id,
      actorRole: user.role,
      metadata: { reference, destination: args.destination, departureAt: args.departureAt },
    });

    return { bookingId, reference };
  },
});

/**
 * List member's own bookings.
 */
export const listMine = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    try {
      const user = await getCurrentUser(ctx);
      const bookings = await ctx.db
        .query("busBookings")
        .withIndex("by_member", (q) => q.eq("memberId", user._id))
        .collect();

      return bookings.sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return [];
    }
  },
});

/**
 * Get booking by ID.
 */
export const getById = query({
  args: { id: v.id("busBookings") },
  handler: async (ctx: QueryCtx, args) => {
    const user = await requireUser(ctx);
    const booking = await ctx.db.get(args.id);

    if (!booking) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Booking not found." });
    }

    const isOwner = booking.memberId === user._id;
    const isPrivileged = ["official", "admin", "superadmin"].includes(user.role);

    if (!isOwner && !isPrivileged) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Unauthorized." });
    }

    return booking;
  },
});

/**
 * Get availability calendar data for next 90 days.
 */
export const getAvailabilityCalendar = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    const bookings = await ctx.db.query("busBookings").collect();

    // Map booked date ranges
    return bookings
      .filter((b) => ["requested", "under_review", "approved", "confirmed"].includes(b.status))
      .map((b) => ({
        id: b._id,
        reference: b.reference,
        departureAt: b.departureAt,
        returnAt: b.returnAt,
        destination: b.destination,
        status: b.status,
      }));
  },
});

/**
 * Admin query for queue.
 */
export const listAllAdmin = query({
  args: {
    status: v.optional(busBookingStatusValidator),
  },
  handler: async (ctx: QueryCtx, args) => {
    await requireRole(ctx, ["official", "admin", "superadmin"]);
    let bookings = await ctx.db.query("busBookings").collect();

    if (args.status) {
      bookings = bookings.filter((b) => b.status === args.status);
    }

    return bookings.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Admin action to approve or update status on a bus booking.
 * Server-side re-validates conflicts at mutation time!
 */
export const updateStatus = mutation({
  args: {
    id: v.id("busBookings"),
    newStatus: busBookingStatusValidator,
    statusReason: v.optional(v.string()),
    driverName: v.optional(v.string()),
    driverPhone: v.optional(v.string()),
    contributionKes: v.optional(v.number()),
    adminRemarks: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);
    const booking = await ctx.db.get(args.id);

    if (!booking) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Booking not found." });
    }

    const allowed = LEGAL_BUS_TRANSITIONS[booking.status] || [];
    if (!allowed.includes(args.newStatus)) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: `Cannot transition from ${booking.status} to ${args.newStatus}.`,
      });
    }

    // Server-side conflict re-check on approval
    if (["approved", "confirmed"].includes(args.newStatus)) {
      const conflict = await hasBookingConflict(
        ctx,
        booking.departureAt,
        booking.returnAt,
        booking._id
      );
      if (conflict) {
        throw new ConvexError({
          code: "BOOKING_CONFLICT",
          message: "Cannot approve: another confirmed booking already occupies this date range.",
        });
      }
    }

    if (args.newStatus === "declined" && (!args.statusReason || args.statusReason.trim().length < 15)) {
      throw new ConvexError({
        code: "REASON_REQUIRED",
        message: "Declining a bus request requires a reason (minimum 15 characters).",
      });
    }

    const now = Date.now();
    await ctx.db.patch(booking._id, {
      status: args.newStatus,
      statusReason: args.statusReason,
      driverName: args.driverName ?? booking.driverName,
      driverPhone: args.driverPhone ?? booking.driverPhone,
      contributionKes: args.contributionKes ?? booking.contributionKes,
      adminRemarks: args.adminRemarks ?? booking.adminRemarks,
      approvedBy: ["approved", "confirmed"].includes(args.newStatus) ? admin._id : booking.approvedBy,
      approvedAt: ["approved", "confirmed"].includes(args.newStatus) ? now : booking.approvedAt,
      updatedAt: now,
    });

    // Member notification
    await ctx.db.insert("notifications", {
      userId: booking.memberId,
      type: `bus_status_${args.newStatus}`,
      title: `Bus Reservation ${args.newStatus.toUpperCase()} (${booking.reference})`,
      body: `Your bus reservation to ${booking.destination} is now ${args.newStatus.replace(/_/g, " ")}.`,
      link: `/bus/${booking._id}`,
      entityType: "bus",
      entityId: booking._id,
      isRead: false,
      createdAt: now,
    });

    await writeAudit(ctx, {
      action: `bus.status_to_${args.newStatus}`,
      entityType: "busBookings",
      entityId: booking._id,
      actorId: admin._id,
      actorRole: admin.role,
    });

    return { success: true };
  },
});
