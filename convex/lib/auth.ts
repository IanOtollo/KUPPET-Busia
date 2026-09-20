import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "../_generated/dataModel";
import { UserRole } from "../../src/lib/constants";

type Context = QueryCtx | MutationCtx;

/**
 * Returns the currently authenticated user document.
 * Throws UNAUTHENTICATED if not logged in.
 */
export async function getCurrentUser(ctx: Context): Promise<Doc<"users">> {
  const authId = await getAuthUserId(ctx);
  if (!authId) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "You must be signed in to perform this action.",
    });
  }

  // Look up user by authId
  const user = await ctx.db
    .query("users")
    .withIndex("by_authId", (q) => q.eq("authId", authId))
    .first();

  if (!user) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "User profile record not found.",
    });
  }

  return user;
}

/**
 * Requires an active user account.
 * Throws FORBIDDEN if status is pending_verification, pending_approval, suspended, or rejected.
 */
export async function requireUser(ctx: Context): Promise<Doc<"users">> {
  const user = await getCurrentUser(ctx);

  if (user.status === "pending_verification") {
    throw new ConvexError({
      code: "PENDING_VERIFICATION",
      message: "Please verify your email address to continue.",
    });
  }

  if (user.status === "pending_approval") {
    throw new ConvexError({
      code: "PENDING_APPROVAL",
      message: "Your membership account is awaiting branch administrator verification.",
    });
  }

  if (user.status === "suspended") {
    throw new ConvexError({
      code: "ACCOUNT_SUSPENDED",
      message: "Your account has been suspended. Please contact the branch office.",
    });
  }

  if (user.status === "rejected") {
    throw new ConvexError({
      code: "ACCOUNT_REJECTED",
      message: "Your membership registration was not approved.",
    });
  }

  if (user.status !== "active") {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "Your account is not active.",
    });
  }

  return user;
}

/**
 * Enforces role-based access control.
 * Throws FORBIDDEN if the active user's role is not within the permitted list.
 */
export async function requireRole(
  ctx: Context,
  roles: UserRole[]
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);

  if (!roles.includes(user.role as UserRole)) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You do not have administrative permission for this action.",
    });
  }

  return user;
}

/**
 * Enforces ownership or role privilege:
 * The caller must be the resource owner (ownerId) OR possess one of the authorized roles.
 */
export async function requireSelfOrRole(
  ctx: Context,
  ownerId: Id<"users">,
  roles: UserRole[]
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);

  const isOwner = user._id === ownerId;
  const hasRole = roles.includes(user.role as UserRole);

  if (!isOwner && !hasRole) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You do not have permission to view or modify this record.",
    });
  }

  return user;
}
