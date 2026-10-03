import { query, mutation, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getCurrentUser, requireRole, requireUser } from "./lib/auth";
import { validateUploads } from "./lib/uploads";
import { writeAudit } from "./lib/audit";
import { generateReference } from "./lib/refs";
import {
  bereavementRelationshipValidator,
  bereavementStatusValidator,
  contributionMethodValidator,
  subCountyValidator,
} from "./lib/validators";
import { ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { notifyAdmins } from "./lib/notify";

type Relationship = "mother" | "father" | "spouse" | "child";

const normName = (n: string) => n.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Relatives that can no longer be claimed for this member, derived from their
 * earlier claims. A mother or father dies once, so those are locked by
 * relationship; a member can lose more than one child, or remarry, so
 * spouse/child are locked by the deceased's name. Any claim that has not been
 * declined holds its lock; declining a claim releases it.
 */
async function loadLocks(ctx: QueryCtx | MutationCtx, memberId: Id<"users">) {
  const cases = await ctx.db
    .query("bereavementCases")
    .withIndex("by_member", (q) => q.eq("memberId", memberId))
    .collect();

  return cases
    .filter((c) => c.status !== "declined")
    .map((c) => ({
      relationship: c.relationship as Relationship,
      deceasedName: c.deceasedName,
      reference: c.reference as string,
    }));
}

function findLock(
  locks: Awaited<ReturnType<typeof loadLocks>>,
  relationship: Relationship,
  deceasedName: string
) {
  return locks.find((l) => {
    if (l.relationship !== relationship) return false;
    if (relationship === "mother" || relationship === "father") return true;
    return normName(l.deceasedName) === normName(deceasedName);
  });
}

// Legal status transitions
const LEGAL_TRANSITIONS: Record<string, string[]> = {
  submitted: ["under_review", "declined"],
  under_review: ["verified", "declined"],
  verified: ["support_approved", "declined"],
  support_approved: ["disbursed", "closed"],
  disbursed: ["closed"],
  closed: [],
  declined: [],
};

/** Creates a short-lived upload URL for a bereavement claim's supporting document. */
export const generateDocumentUploadUrl = mutation({
  args: {},
  handler: async (ctx: MutationCtx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Submit a bereavement case.
 * Enforces the strict four-relationship rule, 180-day occurrence limit, and snapshots member profile.
 */
export const create = mutation({
  args: {
    relationship: bereavementRelationshipValidator,
    deceasedName: v.string(),
    dateOfBereavement: v.string(),
    burialPlace: v.optional(v.string()),
    burialDate: v.optional(v.string()),
    details: v.optional(v.string()),
    // Both are mandatory proof: the burial permit, and a payslip showing the
    // member's union deduction (confirms they are a paying member in good standing).
    burialPermitId: v.id("_storage"),
    payslipId: v.id("_storage"),
    // Any extra supporting files (e.g. death certificate).
    documentIds: v.optional(v.array(v.id("_storage"))),
    // The contribution form: how colleagues can send money for the burial.
    contributionMethod: contributionMethodValidator,
    contributionNumber: v.string(),
    contributionAccount: v.optional(v.string()),
    contributionNote: v.optional(v.string()),
  },
  handler: async (ctx: MutationCtx, args) => {
    // Requires active verified member
    const user = await requireUser(ctx);

    const extraDocs = args.documentIds ?? [];
    await validateUploads(ctx, [args.burialPermitId, args.payslipId, ...extraDocs], {
      maxFiles: 7,
      maxBytes: 10 * 1024 * 1024,
      allowedTypes: /^(image\/|application\/pdf$)/,
      label: "supporting document",
    });

    const contributionNumber = args.contributionNumber.trim();
    if (!contributionNumber) {
      throw new ConvexError({
        code: "CONTRIBUTION_REQUIRED",
        message: "Enter the paybill, till, phone or account number where contributions should be sent.",
      });
    }

    // The deceased's name is the only thing the member types; a locked
    // beneficiary can't be claimed again.
    const deceasedName = args.deceasedName.trim();
    if (!deceasedName) {
      throw new ConvexError({ code: "INVALID_NAME", message: "Enter the full name of the deceased." });
    }
    const lock = findLock(await loadLocks(ctx, user._id), args.relationship, deceasedName);
    if (lock) {
      throw new ConvexError({
        code: "BENEFICIARY_LOCKED",
        message:
          args.relationship === "mother" || args.relationship === "father"
            ? `A bereavement for your ${args.relationship} (${lock.deceasedName}) is already on record, so you cannot claim for your ${args.relationship} again.`
            : `A bereavement for ${lock.deceasedName} (${args.relationship}) is already on record.`,
      });
    }

    // Verify 180 days limit
    const caseDate = new Date(args.dateOfBereavement);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - caseDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays < 0) {
      throw new ConvexError({
        code: "INVALID_DATE",
        message: "Date of bereavement cannot be in the future.",
      });
    }

    if (diffDays > 180) {
      throw new ConvexError({
        code: "BEREAVEMENT_WINDOW_EXPIRED",
        message:
          "Claims for bereavements that occurred more than 180 days ago require direct consultation with the branch secretariat.",
      });
    }

    // Atomically generate reference: BRV-YYYY-NNNN
    const reference = await generateReference(ctx, "BRV");
    const currentTime = Date.now();

    const caseId = await ctx.db.insert("bereavementCases", {
      reference,
      memberId: user._id,
      memberNameSnapshot: user.fullName,
      tscSnapshot: user.tscNumber,
      // Member details always come from their profile, never from the form.
      school: user.school,
      subCounty: user.subCounty,
      phone: user.phone,
      relationship: args.relationship,
      deceasedName,
      dateOfBereavement: args.dateOfBereavement,
      burialPlace: args.burialPlace?.trim(),
      burialDate: args.burialDate,
      details: args.details?.trim(),
      documentIds: extraDocs,
      burialPermitId: args.burialPermitId,
      payslipId: args.payslipId,
      contributionMethod: args.contributionMethod,
      contributionNumber,
      contributionAccount: args.contributionAccount?.trim() || undefined,
      contributionNote: args.contributionNote?.trim() || undefined,
      status: "submitted",
      createdAt: currentTime,
      updatedAt: currentTime,
    });

    // In-app notification for the member
    await ctx.db.insert("notifications", {
      userId: user._id,
      type: "bereavement_submitted",
      title: "Bereavement Claim Received",
      body: `Your bereavement welfare case for ${args.deceasedName} has been recorded under reference ${reference}. The branch welfare committee will contact you.`,
      link: `/bereavement/${caseId}`,
      entityType: "bereavement",
      entityId: caseId,
      isRead: false,
      createdAt: currentTime,
    });

    await notifyAdmins(ctx, {
      type: "bereavement_submitted",
      title: `New bereavement claim (${reference})`,
      body: `${user.fullName} (TSC ${user.tscNumber}) lost their ${args.relationship}, ${deceasedName}.`,
      link: `/admin/bereavement/${caseId}`,
      entityType: "bereavement",
      entityId: caseId,
    });

    // Audit log
    await writeAudit(ctx, {
      action: "bereavement.submitted",
      entityType: "bereavementCases",
      entityId: caseId,
      actorId: user._id,
      actorRole: user.role,
      metadata: {
        reference,
        relationship: args.relationship,
        deceasedName: args.deceasedName,
      },
    });

    return { caseId, reference };
  },
});

/**
 * List cases submitted by current member.
 */
export const listMine = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    try {
      const user = await getCurrentUser(ctx);
      const cases = await ctx.db
        .query("bereavementCases")
        .withIndex("by_member", (q) => q.eq("memberId", user._id))
        .collect();

      return cases
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(({ internalNotes: _internalNotes, ...c }) => c);
    } catch {
      return [];
    }
  },
});

/**
 * Get case by ID with RBAC guard: Owner OR Official/Admin/Superadmin.
 */
export const getById = query({
  args: { id: v.id("bereavementCases") },
  handler: async (ctx: QueryCtx, args) => {
    const user = await requireUser(ctx);
    const caseDoc = await ctx.db.get(args.id);

    if (!caseDoc) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Bereavement case not found.",
      });
    }

    const isOwner = caseDoc.memberId === user._id;
    const isPrivileged = ["official", "admin", "superadmin"].includes(user.role);

    if (!isOwner && !isPrivileged) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You are not authorized to view this welfare case.",
      });
    }

    const documentUrls = await Promise.all(
      caseDoc.documentIds.map(async (id) => ({
        id,
        url: await ctx.storage.getUrl(id),
      }))
    );

    const burialPermitUrl = caseDoc.burialPermitId
      ? await ctx.storage.getUrl(caseDoc.burialPermitId)
      : null;
    const payslipUrl = caseDoc.payslipId ? await ctx.storage.getUrl(caseDoc.payslipId) : null;

    // Internal notes are admin-only working notes — never shown to the member.
    const canSeeNotes = ["admin", "superadmin"].includes(user.role);
    const { internalNotes, ...safeCase } = caseDoc;
    return {
      ...safeCase,
      internalNotes: canSeeNotes ? internalNotes : undefined,
      documentUrls,
      burialPermitUrl,
      payslipUrl,
    };
  },
});

/**
 * Admin list query with optional filtering.
 */
export const listAllAdmin = query({
  args: {
    status: v.optional(bereavementStatusValidator),
    subCounty: v.optional(subCountyValidator),
  },
  handler: async (ctx: QueryCtx, args) => {
    await requireRole(ctx, ["official", "admin", "superadmin"]);

    const status = args.status;
    let cases = status
      ? await ctx.db
          .query("bereavementCases")
          .withIndex("by_status", (q) => q.eq("status", status))
          .take(1000)
      : await ctx.db
          .query("bereavementCases")
          .withIndex("by_createdAt")
          .order("desc")
          .take(1000);

    if (args.subCounty) {
      cases = cases.filter((c) => c.subCounty === args.subCounty);
    }

    return cases.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Update case status with transition validation.
 * If declining, a reason is required (any length).
 */
export const updateStatus = mutation({
  args: {
    id: v.id("bereavementCases"),
    newStatus: bereavementStatusValidator,
    statusReason: v.optional(v.string()),
    supportAmount: v.optional(v.number()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);
    const targetCase = await ctx.db.get(args.id);

    if (!targetCase) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Case not found.",
      });
    }

    const allowed = LEGAL_TRANSITIONS[targetCase.status] || [];
    if (!allowed.includes(args.newStatus)) {
      throw new ConvexError({
        code: "INVALID_TRANSITION",
        message: `Cannot transition from ${targetCase.status} to ${args.newStatus}.`,
      });
    }

    if (args.newStatus === "declined") {
      if (!args.statusReason || !args.statusReason.trim()) {
        throw new ConvexError({
          code: "REASON_REQUIRED",
          message: "Please give a reason for declining this case.",
        });
      }
    }

    const now = Date.now();
    await ctx.db.patch(targetCase._id, {
      status: args.newStatus,
      statusReason: args.statusReason,
      supportAmount: args.supportAmount ?? targetCase.supportAmount,
      disbursedAt: args.newStatus === "disbursed" ? now : targetCase.disbursedAt,
      updatedAt: now,
    });

    // Notify the member
    await ctx.db.insert("notifications", {
      userId: targetCase.memberId,
      type: `bereavement_status_${args.newStatus}`,
      title: `Bereavement Case Updated (${targetCase.reference})`,
      body: `Status updated to ${args.newStatus.replace(/_/g, " ")}. ${
        args.statusReason ? `Note: ${args.statusReason}` : ""
      }`,
      link: `/bereavement/${targetCase._id}`,
      entityType: "bereavement",
      entityId: targetCase._id,
      isRead: false,
      createdAt: now,
    });

    // Approval opens the contribution drive: tell every member (once).
    if (
      args.newStatus === "verified" &&
      targetCase.contributionMethod &&
      !targetCase.contributionBroadcastAt
    ) {
      await ctx.db.patch(targetCase._id, { contributionBroadcastAt: now });
      await ctx.scheduler.runAfter(0, internal.bereavement.broadcastContribution, {
        caseId: targetCase._id,
        cursor: null,
      });
    }

    await writeAudit(ctx, {
      action: `bereavement.status_to_${args.newStatus}`,
      entityType: "bereavementCases",
      entityId: targetCase._id,
      actorId: admin._id,
      actorRole: admin.role,
      metadata: {
        fromStatus: targetCase.status,
        toStatus: args.newStatus,
        reason: args.statusReason,
      },
    });

    return { success: true };
  },
});

/**
 * Add an admin internal note to the case thread.
 * Notes are never returned to or visible by regular members.
 */
export const addInternalNote = mutation({
  args: {
    id: v.id("bereavementCases"),
    note: v.string(),
  },
  handler: async (ctx: MutationCtx, args) => {
    const admin = await requireRole(ctx, ["admin", "superadmin"]);
    const targetCase = await ctx.db.get(args.id);

    if (!targetCase) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Case not found.",
      });
    }

    if (!args.note.trim()) {
      throw new ConvexError({
        code: "EMPTY_NOTE",
        message: "Note cannot be empty.",
      });
    }

    const existingNotes = targetCase.internalNotes || [];
    const newNote = {
      authorId: admin._id,
      authorName: admin.fullName,
      note: args.note.trim(),
      createdAt: Date.now(),
    };

    await ctx.db.patch(targetCase._id, {
      internalNotes: [...existingNotes, newNote],
      updatedAt: Date.now(),
    });

    await writeAudit(ctx, {
      action: "bereavement.internal_note_added",
      entityType: "bereavementCases",
      entityId: targetCase._id,
      actorId: admin._id,
      actorRole: admin.role,
    });

    return { success: true };
  },
});

/**
 * The signed-in member's locked beneficiaries, so the claim form can disable
 * relatives that have already been claimed.
 */
export const myLocks = query({
  args: {},
  handler: async (ctx: QueryCtx) => {
    try {
      const user = await getCurrentUser(ctx);
      return await loadLocks(ctx, user._id);
    } catch {
      return [];
    }
  },
});

/**
 * Notifies every active member and official (not admins, not the bereaved
 * member) about an approved bereavement and how to contribute. Runs in pages
 * of 300 so a large membership never hits a single-transaction write limit.
 */
export const broadcastContribution = internalMutation({
  args: {
    caseId: v.id("bereavementCases"),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx: MutationCtx, args) => {
    const c = await ctx.db.get(args.caseId);
    if (!c || !c.contributionMethod) return;

    const burial = [
      c.burialPlace ? `Burial at ${c.burialPlace}` : null,
      c.burialDate ? `on ${c.burialDate}` : null,
    ]
      .filter(Boolean)
      .join(" ");
    const how = `${c.contributionMethod}: ${c.contributionNumber}${
      c.contributionAccount ? ` (Account: ${c.contributionAccount})` : ""
    }`;
    const body = [
      `${c.memberNameSnapshot} (${c.school}) has lost their ${c.relationship}, ${c.deceasedName}.`,
      burial ? `${burial}.` : null,
      `To contribute, send to ${how}.`,
      c.contributionNote,
    ]
      .filter(Boolean)
      .join(" ");

    const page = await ctx.db
      .query("users")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .paginate({ numItems: 300, cursor: args.cursor });

    const now = Date.now();
    for (const u of page.page) {
      if (u.role !== "member" && u.role !== "official") continue;
      if (u._id === c.memberId) continue;
      await ctx.db.insert("notifications", {
        userId: u._id,
        type: "bereavement_contribution",
        title: `Bereavement: ${c.memberNameSnapshot} lost their ${c.relationship}`,
        body,
        entityType: "bereavement",
        entityId: c._id,
        isRead: false,
        createdAt: now,
      });
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.bereavement.broadcastContribution, {
        caseId: args.caseId,
        cursor: page.continueCursor,
      });
    }
  },
});
