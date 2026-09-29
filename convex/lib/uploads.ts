import { ConvexError } from "convex/values";
import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Server-side check for files a client has already uploaded via a Convex
 * upload URL. Those URLs accept anything, so the real type/size limits live
 * here: every rejected file is deleted, not left orphaned in storage.
 */
export async function validateUploads(
  ctx: MutationCtx,
  ids: Id<"_storage">[],
  opts: { maxFiles: number; maxBytes: number; allowedTypes: RegExp; label: string }
) {
  const fail = async (message: string) => {
    for (const id of ids) {
      try {
        await ctx.storage.delete(id);
      } catch {
        // Already gone.
      }
    }
    throw new ConvexError({ code: "INVALID_UPLOAD", message });
  };

  if (ids.length > opts.maxFiles) {
    return fail(`You can attach at most ${opts.maxFiles} ${opts.label} files.`);
  }

  for (const id of ids) {
    const file = await ctx.db.system.get(id);
    if (!file) return fail(`One of the ${opts.label} files could not be found. Please upload it again.`);
    if (file.size > opts.maxBytes) {
      return fail(`${opts.label} files must be under ${Math.round(opts.maxBytes / (1024 * 1024))} MB each.`);
    }
    if (!file.contentType || !opts.allowedTypes.test(file.contentType)) {
      return fail(`That ${opts.label} file type isn't allowed.`);
    }
  }
}
