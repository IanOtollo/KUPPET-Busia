"use client";

import { createContext, useContext } from "react";

/**
 * Cosmetic per-teacher URL prefix: turns "Ian Otollo Marabi" into "IanOtolloMarabi"
 * for use alongside the TSC number in the member section's URLs
 * (e.g. /IanOtolloMarabi/123456/dashboard). This is purely presentational —
 * real access control is the Convex Auth session, not the URL shape. A
 * mismatched or fabricated prefix in the address bar never grants access to
 * another teacher's data; the layout corrects the URL back to the signed-in
 * user's own prefix.
 */
export function slugifyName(fullName: string): string {
  return fullName
    .split(/\s+/)
    .map((part) => part.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean)
    .join("");
}

export function buildMemberPrefix(fullName: string, tscNumber: string): string {
  return `/${slugifyName(fullName)}/${tscNumber}`;
}

export const MemberPathContext = createContext<string>("");

/** Returns the current signed-in teacher's "/NameSlug/TSC" URL prefix. */
export function useMemberBasePath(): string {
  return useContext(MemberPathContext);
}
