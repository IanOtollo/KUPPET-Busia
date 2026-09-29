import { MutationCtx } from "../_generated/server";

export type ReferencePrefix = "BRV" | "HAR" | "BUS";

/**
 * Atomically generates a unique sequential reference code:
 * Format: PREFIX-YYYY-NNNN (e.g. BRV-2026-0001)
 */
export async function generateReference(
  ctx: MutationCtx,
  prefix: ReferencePrefix
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const counterKey = `${prefix}-${currentYear}`;

  const counter = await ctx.db
    .query("counters")
    .withIndex("by_key", (q) => q.eq("key", counterKey))
    .first();

  let nextValue = 1;

  if (counter) {
    nextValue = counter.value + 1;
    await ctx.db.patch(counter._id, { value: nextValue });
  } else {
    await ctx.db.insert("counters", {
      key: counterKey,
      value: nextValue,
    });
  }

  const paddedSequence = String(nextValue).padStart(4, "0");

  // Harassment reports can be tracked without signing in, so their reference is
  // the only key to the status page. A random suffix makes it impossible to
  // walk HAR-2026-0001, 0002, … and read other people's report status.
  if (prefix === "HAR") {
    const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no look-alikes (I/O/0/1/L)
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const suffix = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
    return `${prefix}-${currentYear}-${paddedSequence}-${suffix}`;
  }

  return `${prefix}-${currentYear}-${paddedSequence}`;
}
