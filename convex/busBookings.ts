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
import { readBranchConfig } from "./settings";
import { notifyAdmins } from "./lib/notify";
import { formatKes } from "./lib/money";

// Admin-driven transitions. The member moves awaiting_payment -> payment_submitted
// through submitPayment, never through updateStatus.
//   requested -> awaiting_payment (admin approves + sets the amount)
//   awaiting_payment -> payment_submitted (member pays)
//   payment_submitted -> confirmed (admin verifies payment; bus is released)
// "approved" is only kept for bookings created before the payment flow existed.
const LEGAL_BUS_TRANSITIONS: Record<string, string[]> = {
  requested: ["awaiting_payment", "under_review", "declined", "cancelled"],
  under_review: ["awaiting_payment", "declined", "cancelled"],
  awaiting_payment: ["declined", "cancelled"],
  payment_submitted: ["confirmed", "awaiting_payment", "cancelled"],
  approved: ["confirmed", "declined", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  declined: [],
  cancelled: [],
};

const BLOCKING_STATUSES = ["approved", "awaiting_payment", "payment_submitted", "confirmed"] as const;

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

  // Only approved/confirmed bookings can block a slot — read just those.
  const blocking = [
    ...(await ctx.db.query("busBookings").withIndex("by_status", (q) => q.eq("status", "approved")).take(500)),
    ...(await ctx.db.query("busBookings").withIndex("by_status", (q) => q.eq("status", "confirmed")).take(500)),
  ];

  return blocking.some((b) => {
    if (excludeId && b._id === excludeId) return false;

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
    // Default to the member when left blank.
    tripContactName: v.optional(v.string()),
    tripContactPhone: v.optional(v.string()),
    extraRequirements: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);

    // A reason is mandatory, but any length will do.
    const cleanReason = args.reason.trim();
    if (cleanReason.length < 1 || cleanReason.length > 1000) {
      throw new ConvexError({
        code: "INVALID_REASON",
        message: "Please give a reason for the request (up to 1000 characters).",
      });
    }

    const { busNoticeDays, busCapacitySeats } = await readBranchConfig(ctx);

    // Passengers: 1 to admin-configured capacity (defaults to 62)
    if (args.passengers < 1 || args.passengers > busCapacitySeats) {
      throw new ConvexError({
        code: "INVALID_PASSENGERS",
        message: `Number of passengers must be between 1 and ${busCapacitySeats} (bus maximum capacity).`,
      });
    }

    // Departure notice period: admin-configured minimum (defaults to 3 days)
    const depDate = new Date(args.departureAt);
    const retDate = new Date(args.returnAt);
    const now = new Date();

    const minNoticeDate = new Date(now.getTime() + busNoticeDays * 24 * 60 * 60 * 1000);
    if (depDate < minNoticeDate) {
      throw new ConvexError({
        code: "NOTICE_PERIOD_VIOLATION",
        message: `Bus requests require a minimum ${busNoticeDays}-day advance notice period.`,
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
        message: "The requested date range conflicts with an existing bus booking.",
      });
    }

    const reference = await generateReference(ctx, "BUS");
    const currentTime = Date.now();

    const bookingId = await ctx.db.insert("busBookings", {
      reference,
      memberId: user._id,
      // Member details always come from their profile, never from the form.
      requesterName: user.fullName,
      phone: user.phone,
      school: user.school,
      purpose: args.purpose,
      reason: cleanReason,
      departureAt: args.departureAt,
      returnAt: args.returnAt,
      departurePoint: args.departurePoint.trim(),
      destination: args.destination.trim(),
      distanceKm: args.distanceKm,
      passengers: args.passengers,
      tripContactName: args.tripContactName?.trim() || user.fullName,
      tripContactPhone: args.tripContactPhone?.trim() || user.phone,
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

    await notifyAdmins(ctx, {
      type: "bus_requested",
      title: `New bus request (${reference})`,
      body: `${user.fullName} requests the bus to ${args.destination.trim()} on ${args.departureAt.slice(0, 10)}. Review it and tell the member what to pay.`,
      link: `/admin/bus/${bookingId}`,
      entityType: "bus",
      entityId: bookingId,
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
        .take(200);

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
    const user = await requireUser(ctx);
    const isStaff = ["official", "admin", "superadmin"].includes(user.role);
    const activeStatuses = [
      "requested",
      "under_review",
      "awaiting_payment",
      "payment_submitted",
      "approved",
      "confirmed",
      // Staff also see finished trips on the schedule; members only need open slots.
      ...(isStaff ? (["completed"] as const) : []),
    ] as const;
    const today = new Date().toISOString();
    const bookings = (
      await Promise.all(
        activeStatuses.map((status) =>
          ctx.db
            .query("busBookings")
            .withIndex("by_status", (q) => q.eq("status", status))
            .take(500)
        )
      )
    )
      .flat()
      // Past trips no longer affect availability, but staff keep them for the history view.
      .filter((b) => isStaff || b.returnAt >= today);

    // Map booked date ranges. Members only need to know which dates are taken,
    // so booking references and destinations are staff-only.
    return bookings
      .map((b) => ({
        id: b._id,
        reference: isStaff ? b.reference : "",
        requesterName: isStaff ? b.requesterName : "",
        departureAt: b.departureAt,
        returnAt: b.returnAt,
        destination: isStaff ? b.destination : "",
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
    const status = args.status;
    const bookings = status
      ? await ctx.db
          .query("busBookings")
          .withIndex("by_status", (q) => q.eq("status", status))
          .take(1000)
      : await ctx.db.query("busBookings").order("desc").take(1000);

    return bookings.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Admin action to move a booking through its lifecycle.
 *
 * Payment flow: the admin approves with an amount (awaiting_payment), the member
 * pays and reports it (submitPayment), the admin verifies and confirms, which
 * releases the bus. Conflicts are re-validated server-side on approval.
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
        message: `Cannot transition from ${booking.status.replace(/_/g, " ")} to ${args.newStatus.replace(/_/g, " ")}.`,
      });
    }

    if (["approved", "awaiting_payment", "confirmed"].includes(args.newStatus)) {
      const conflict = await hasBookingConflict(ctx, booking.departureAt, booking.returnAt, booking._id);
      if (conflict) {
        throw new ConvexError({
          code: "BOOKING_CONFLICT",
          message: "Cannot approve: another booking already occupies this date range.",
        });
      }
    }

    const reason = args.statusReason?.trim();
    if (args.newStatus === "declined" && !reason) {
      throw new ConvexError({
        code: "REASON_REQUIRED",
        message: "Please give a reason for declining this request.",
      });
    }

    // Approving means telling the member how much to pay.
    const amount = args.contributionKes ?? booking.contributionKes;
    if (args.newStatus === "awaiting_payment") {
      if (booking.status === "payment_submitted" && !reason) {
        throw new ConvexError({
          code: "REASON_REQUIRED",
          message: "Say why the payment was not accepted so the member can correct it.",
        });
      }
      if (amount === undefined || !Number.isFinite(amount) || amount <= 0) {
        throw new ConvexError({
          code: "AMOUNT_REQUIRED",
          message: "Enter the amount the member must pay to use the bus.",
        });
      }
    }

    const now = Date.now();
    const releasing = args.newStatus === "confirmed";
    const approving = ["awaiting_payment", "approved", "confirmed"].includes(args.newStatus);
    await ctx.db.patch(booking._id, {
      status: args.newStatus,
      statusReason: reason || undefined,
      driverName: args.driverName ?? booking.driverName,
      driverPhone: args.driverPhone ?? booking.driverPhone,
      contributionKes: amount,
      adminRemarks: args.adminRemarks ?? booking.adminRemarks,
      approvedBy: approving ? admin._id : booking.approvedBy,
      approvedAt: approving ? (booking.approvedAt ?? now) : booking.approvedAt,
      paymentConfirmedAt: releasing ? now : booking.paymentConfirmedAt,
      // A rejected payment goes back to the member to try again.
      paymentReference: args.newStatus === "awaiting_payment" ? undefined : booking.paymentReference,
      paymentSubmittedAt: args.newStatus === "awaiting_payment" ? undefined : booking.paymentSubmittedAt,
      updatedAt: now,
    });

    const remarks = args.adminRemarks ?? booking.adminRemarks;
    let title = `Bus Reservation ${args.newStatus.replace(/_/g, " ").toUpperCase()} (${booking.reference})`;
    let body = `Your bus reservation to ${booking.destination} is now ${args.newStatus.replace(/_/g, " ")}.`;
    if (args.newStatus === "awaiting_payment") {
      title = `Pay ${formatKes(amount!)} to secure the bus (${booking.reference})`;
      body =
        booking.status === "payment_submitted"
          ? `Your payment for the bus to ${booking.destination} could not be verified: ${reason}. Please pay ${formatKes(amount!)} and submit the payment details again.`
          : `Your request for the bus to ${booking.destination} is approved. Please pay ${formatKes(amount!)}, then open the booking and confirm your payment.${
              remarks ? ` Payment details: ${remarks}` : ""
            }`;
    } else if (releasing) {
      title = `Bus released to you (${booking.reference})`;
      body = `Your payment was received. The bus to ${booking.destination} is confirmed and released for ${booking.departureAt.slice(0, 10)}.`;
    } else if (args.newStatus === "declined" && reason) {
      body += ` Reason: ${reason}`;
    }

    await ctx.db.insert("notifications", {
      userId: booking.memberId,
      type: `bus_status_${args.newStatus}`,
      title,
      body,
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
      metadata: args.newStatus === "awaiting_payment" ? { amountKes: amount } : undefined,
    });

    return { success: true };
  },
});

/**
 * Member confirms they have paid the amount the admin asked for. This is the
 * only way a booking reaches payment_submitted, and it alerts the admins so
 * they can verify the payment and release the bus.
 */
export const submitPayment = mutation({
  args: {
    id: v.id("busBookings"),
    paymentReference: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const user = await requireUser(ctx);
    const booking = await ctx.db.get(args.id);

    if (!booking || booking.memberId !== user._id) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Booking not found." });
    }
    if (booking.status !== "awaiting_payment") {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: "This booking is not waiting for a payment.",
      });
    }

    const reference = args.paymentReference.trim();
    if (!reference || reference.length > 60) {
      throw new ConvexError({
        code: "INVALID_PAYMENT_REFERENCE",
        message: "Enter the payment reference (for example the M-Pesa transaction code).",
      });
    }

    const now = Date.now();
    await ctx.db.patch(booking._id, {
      status: "payment_submitted",
      paymentReference: reference,
      paymentSubmittedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "bus_payment_submitted",
      title: `Payment sent for verification (${booking.reference})`,
      body: "The branch office will verify your payment and release the bus. You will be notified.",
      link: `/bus/${booking._id}`,
      entityType: "bus",
      entityId: booking._id,
      isRead: false,
      createdAt: now,
    });

    await notifyAdmins(ctx, {
      type: "bus_payment_submitted",
      title: `Bus payment to verify (${booking.reference})`,
      body: `${booking.requesterName} reports paying ${formatKes(booking.contributionKes ?? 0)} for the bus to ${booking.destination}. Reference: ${reference}. Verify it, then release the bus.`,
      link: `/admin/bus/${booking._id}`,
      entityType: "bus",
      entityId: booking._id,
    });

    await writeAudit(ctx, {
      action: "bus.payment_submitted",
      entityType: "busBookings",
      entityId: booking._id,
      actorId: user._id,
      actorRole: user.role,
      metadata: { paymentReference: reference },
    });

    return { success: true };
  },
});
