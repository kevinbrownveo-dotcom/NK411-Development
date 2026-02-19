import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import db from '../config/database';
import { logger } from '../utils/logger';

type AuditAction = 'create' | 'update' | 'delete' | 'override' | 'resolve_conflict' | 'export' | 'sync';

interface AuditEntry {
  entity_type: string;
  entity_id: string;
  action: AuditAction;
  changed_fields?: object;
  reason?: string;
  actor_user_id?: string;
  actor_role?: string;
  ip_address?: string;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await db('audit_log').insert({
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      action: entry.action,
      changed_fields: entry.changed_fields ? JSON.stringify(entry.changed_fields) : null,
      reason: entry.reason || null,
      actor_user_id: entry.actor_user_id || null,
      actor_role: entry.actor_role || null,
      ip_address: entry.ip_address || null,
    });
  } catch (error) {
    logger.error('Audit log yazma xətası:', error);
  }
}

export function auditMiddleware(entityType: string) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    // Store entity type for later use in route handlers
    (req as any).auditEntityType = entityType;
    next();
  };
}

// Diff helper: iki obyekt arasında dəyişiklikləri tapır
export function getChangedFields(
  oldObj: Record<string, any>,
  newObj: Record<string, any>
): Array<{ field: string; old_value: any; new_value: any }> {
  const changes: Array<{ field: string; old_value: any; new_value: any }> = [];

  for (const key of Object.keys(newObj)) {
    if (key === 'updated_at' || key === 'created_at') continue;
    const oldVal = oldObj[key];
    const newVal = newObj[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, old_value: oldVal, new_value: newVal });
    }
  }

  return changes;
}
