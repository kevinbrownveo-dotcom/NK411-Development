/**
 * Enterprise Audit Log — Faza 15 §2
 *
 * - SHA-256 hash chaining (before_hash → after_hash → prev_audit_hash)
 * - Structured diff_json
 * - Correlation ID injection
 * - Sensitive data scrubbing
 * - Append-only (DB trigger blocks UPDATE/DELETE)
 */
import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { createHash } from 'crypto';
import db from '../config/database';
import { logger } from '../utils/logger';
import { getCorrelationId, getRequestId, getLatencyMs } from './correlationId';
import { forwardToSiem } from '../services/siemForwarder';

type AuditAction = 'create' | 'update' | 'delete' | 'override' | 'resolve_conflict' | 'export' | 'sync' | 'login' | 'approve';

interface AuditEntry {
  entity_type: string;
  entity_id: string;
  action: AuditAction;
  changed_fields?: object;
  reason?: string;
  actor_user_id?: string;
  actor_role?: string;
  ip_address?: string;
  before_state?: Record<string, any>;
  after_state?: Record<string, any>;
  severity?: string;
  data_classification?: string;
}

// ── Sensitive field scrubbing ──────────────────────────────
const SENSITIVE_KEYS = /password|token|secret|authorization|cookie|api_key|private_key/i;

function scrubFields(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const scrubbed: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.test(key)) {
      scrubbed[key] = '***REDACTED***';
    } else {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
}

// ── SHA-256 Hash ──────────────────────────────────────────
function sha256(data: any): string {
  return createHash('sha256')
    .update(JSON.stringify(data || {}))
    .digest('hex');
}

// ── Get previous audit hash for chain ─────────────────────
async function getPrevAuditHash(entityType: string, entityId: string): Promise<string | null> {
  try {
    const last = await db('audit_log')
      .where({ entity_type: entityType, entity_id: entityId })
      .orderBy('created_at', 'desc')
      .select('after_hash')
      .first();
    return last?.after_hash || null;
  } catch {
    return null;
  }
}

// ── Main Write Function ──────────────────────────────────
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const correlationId = getCorrelationId();
    const requestId = getRequestId();
    const latencyMs = getLatencyMs();

    // Hash chaining
    const beforeHash = sha256(scrubFields(entry.before_state));
    const afterHash = sha256(scrubFields(entry.after_state || entry.changed_fields));
    const prevAuditHash = await getPrevAuditHash(entry.entity_type, entry.entity_id);

    // Structured diff
    const diffJson = entry.before_state && entry.after_state
      ? getChangedFields(entry.before_state, entry.after_state)
      : (entry.changed_fields ? entry.changed_fields : null);

    await db('audit_log').insert({
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      action: entry.action,
      changed_fields: entry.changed_fields ? JSON.stringify(scrubFields(entry.changed_fields)) : null,
      reason: entry.reason || null,
      actor_user_id: entry.actor_user_id || null,
      actor_role: entry.actor_role || null,
      ip_address: entry.ip_address || null,
      // Enterprise fields
      correlation_id: correlationId !== 'unknown' ? correlationId : null,
      request_id: requestId !== 'unknown' ? requestId : null,
      role_snapshot: entry.actor_role || null,
      result: 'SUCCESS',
      severity: entry.severity || 'INFO',
      data_classification: entry.data_classification || 'internal',
      latency_ms: latencyMs,
      before_hash: beforeHash,
      after_hash: afterHash,
      diff_json: diffJson ? JSON.stringify(scrubFields(diffJson)) : null,
      prev_audit_hash: prevAuditHash,
    });

    // Forward to SIEM (fire-and-forget)
    forwardToSiem({
      '@timestamp': new Date().toISOString(),
      event_type: 'AUDIT',
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      user_email: entry.actor_user_id,
      user_role: entry.actor_role,
      source_ip: entry.ip_address,
      result: 'SUCCESS',
      severity: entry.severity || 'INFO',
      correlation_id: correlationId,
      changed_fields: scrubFields(entry.changed_fields),
      reason: entry.reason,
    }).catch(() => { });
  } catch (error) {
    logger.error('Audit log yazma xətası:', { error, entity: entry.entity_type });
  }
}

export function auditMiddleware(entityType: string) {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    (req as any).auditEntityType = entityType;
    next();
  };
}

// ── Diff helper ──────────────────────────────────────────
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
      changes.push({
        field: key,
        old_value: SENSITIVE_KEYS.test(key) ? '***REDACTED***' : oldVal,
        new_value: SENSITIVE_KEYS.test(key) ? '***REDACTED***' : newVal,
      });
    }
  }

  return changes;
}

// ── Hash Chain Verification ──────────────────────────────
export async function verifyAuditChain(entityType: string, entityId: string): Promise<{
  valid: boolean;
  total: number;
  broken_at?: number;
}> {
  const records = await db('audit_log')
    .where({ entity_type: entityType, entity_id: entityId })
    .orderBy('created_at', 'asc')
    .select('id', 'after_hash', 'prev_audit_hash', 'created_at');

  for (let i = 1; i < records.length; i++) {
    if (records[i].prev_audit_hash && records[i].prev_audit_hash !== records[i - 1].after_hash) {
      return { valid: false, total: records.length, broken_at: i };
    }
  }

  return { valid: true, total: records.length };
}
