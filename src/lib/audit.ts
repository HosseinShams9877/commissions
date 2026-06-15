import { db } from '@/lib/db';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'EXPORT' | 'IMPORT';

/**
 * Log an audit event. Non-blocking — fire-and-forget with catch.
 */
export function logAudit(
  action: AuditAction,
  entity: string,
  entityId?: string,
  details?: Record<string, unknown>,
  userId?: string,
  ipAddress?: string,
): void {
  // Fire and forget — do not await
  db.auditLog
    .create({
      data: {
        action,
        entity,
        entityId,
        details: details ? JSON.stringify(details) : null,
        userId,
        ipAddress,
      },
    })
    .catch((err) => {
      console.error('[AuditLog] Failed to write audit log:', err);
    });
}
