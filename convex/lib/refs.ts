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
  return `${prefix}-${currentYear}-${paddedSequence}`;
}
