/**
 * Sign-in identifier for the Convex Auth password account.
 *
 * Teachers sign in with their TSC number, so the account id is derived from it
 * directly — the client computes it, and no server lookup ("which email belongs
 * to this TSC?") is ever needed. That removes the lookup as a way to discover
 * registered TSC numbers or harvest email addresses, and makes Convex Auth's
 * built-in failed-attempt limiting apply per TSC number. The teacher's real
 * email stays on their user record for contact purposes only.
 */
export function loginAliasForTsc(tscNumber: string): string {
  return `${tscNumber.toLowerCase().replace(/\s+/g, "")}@members.kuppet.local`;
}
