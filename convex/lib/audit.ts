import { MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export interface AuditParams {
  action: string;
  entityType: string;
  entityId?: string;
  actorId?: Id<"users">;
  actorRole?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string;
}

/**
 * Writes an immutable audit trail entry for compliance and institutional accountability.
 */
export async function writeAudit(
  ctx: MutationCtx,
  params: AuditParams
): Promise<Id<"auditLog">> {
  return await ctx.db.insert("auditLog", {
    actorId: params.actorId,
    actorRole: params.actorRole,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    metadata: params.metadata,
    ipHash: params.ipHash,
    createdAt: Date.now(),
  });
}
