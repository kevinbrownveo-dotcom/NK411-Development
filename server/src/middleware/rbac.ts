/**
 * Dinamik RBAC Middleware
 *
 * İcazə yoxlaması sırası:
 * 1. user.role_id varsa → DB-dəki role_permissions cədvəlindən yoxla (in-memory cache ilə)
 * 2. role_id yoxdursa → Statik PERMISSIONS map-dan yoxla (geri uyğunluq)
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import db from '../config/database';
import { logger, logSecurityEvent } from '../utils/logger';

type Role = 'admin' | 'risk_manager' | 'asset_owner' | 'incident_coordinator' | 'auditor' | 'dxeit_rep';

// Rol əsaslı icazə matrisi — Spec §1.3
const PERMISSIONS: Record<string, Role[]> = {
  // Aktiv — Modul 1
  'assets:read': ['admin', 'risk_manager', 'asset_owner', 'incident_coordinator', 'auditor', 'dxeit_rep'],
  'assets:create': ['admin', 'risk_manager'],
  'assets:update': ['admin', 'risk_manager', 'asset_owner'],
  'assets:delete': ['admin'],

  // Təhdid — Modul 2
  'threats:read': ['admin', 'risk_manager', 'asset_owner', 'incident_coordinator', 'auditor', 'dxeit_rep'],
  'threats:create': ['admin', 'risk_manager'],
  'threats:update': ['admin', 'risk_manager'],
  'threats:delete': ['admin'],

  // Boşluq — Modul 3
  'vulnerabilities:read': ['admin', 'risk_manager', 'asset_owner', 'auditor', 'dxeit_rep'],
  'vulnerabilities:create': ['admin', 'risk_manager'],
  'vulnerabilities:update': ['admin', 'risk_manager'],
  'vulnerabilities:delete': ['admin'],

  // Risk — Modul 4
  'risks:read': ['admin', 'risk_manager', 'asset_owner', 'incident_coordinator', 'auditor', 'dxeit_rep'],
  'risks:create': ['admin', 'risk_manager'],
  'risks:update': ['admin', 'risk_manager'],
  'risks:delete': ['admin'],

  // İnsident — Modul 5
  'incidents:read': ['admin', 'risk_manager', 'incident_coordinator', 'auditor', 'dxeit_rep'],
  'incidents:create': ['admin', 'risk_manager', 'incident_coordinator'],
  'incidents:update': ['admin', 'risk_manager', 'incident_coordinator'],
  'incidents:delete': ['admin'],

  // Həllər — Modul 6
  'solutions:read': ['admin', 'risk_manager', 'auditor', 'dxeit_rep'],
  'solutions:create': ['admin', 'risk_manager'],
  'solutions:update': ['admin', 'risk_manager'],
  'solutions:delete': ['admin'],

  // Tələblər — Modul 7
  'requirements:read': ['admin', 'risk_manager', 'auditor', 'dxeit_rep'],
  'requirements:create': ['admin', 'risk_manager'],
  'requirements:update': ['admin', 'risk_manager'],
  'requirements:delete': ['admin'],

  // Hədlər — Modul 7
  'thresholds:read': ['admin', 'risk_manager', 'auditor', 'dxeit_rep'],
  'thresholds:create': ['admin', 'risk_manager'],
  'thresholds:update': ['admin', 'risk_manager'],
  'thresholds:delete': ['admin'],

  // Fəsadlar — PATCH-06
  'consequences:read': ['admin', 'risk_manager', 'auditor', 'dxeit_rep'],
  'consequences:create': ['admin', 'risk_manager'],
  'consequences:update': ['admin', 'risk_manager'],
  'consequences:delete': ['admin'],

  // Uzlaşdırma — PATCH-01
  'reconciliations:read': ['admin', 'risk_manager', 'auditor'],
  'reconciliations:create': ['admin'],
  'reconciliations:update': ['admin'],

  // Audit Log — PATCH-08
  'audit:read': ['admin', 'auditor'],

  // Dashboard
  'dashboard:read': ['admin', 'risk_manager', 'asset_owner', 'incident_coordinator', 'auditor', 'dxeit_rep'],

  // Override
  'override:severity': ['admin', 'auditor'],

  // İstifadəçi idarəetməsi
  'users:read': ['admin'],
  'users:create': ['admin'],
  'users:update': ['admin'],
  'users:delete': ['admin'],

  // Rol idarəetməsi
  'roles:read': ['admin'],
  'roles:create': ['admin'],
  'roles:update': ['admin'],
  'roles:delete': ['admin'],
};

// ── In-memory permission cache ────────────────────────────────
// Key: role_id (UUID), Value: {perms: Set<'resource:action'>, expiresAt}
interface CacheEntry { perms: Set<string>; expiresAt: number }
export const permissionsCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getDbPermissions(roleId: string): Promise<Set<string>> {
  const cached = permissionsCache.get(roleId);
  if (cached && cached.expiresAt > Date.now()) return cached.perms;
  try {
    const rows = await db('role_permissions').where({ role_id: roleId }).select('resource', 'action');
    const perms = new Set(rows.map((r) => `${r.resource}:${r.action}`));
    permissionsCache.set(roleId, { perms, expiresAt: Date.now() + CACHE_TTL_MS });
    return perms;
  } catch (err) {
    logger.error('RBAC DB sorğu xəta:', err);
    return new Set();
  }
}

export function authorize(...requiredPermissions: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Autentifikasiya tələb olunur' });
      return;
    }

    try {
      const userRow = await db('users').select('role_id').where({ id: req.user.userId }).first();
      const roleId: string | null = userRow?.role_id || null;

      let hasPermission: boolean;

      if (roleId) {
        // Dinamik DB yoxlaması
        const perms = await getDbPermissions(roleId);
        hasPermission = requiredPermissions.every((p) => perms.has(p));
      } else {
        // Statik map yoxlaması (geri uyğunluq)
        const userRole = req.user.role as Role;
        hasPermission = requiredPermissions.every((perm) => {
          const allowedRoles = PERMISSIONS[perm];
          return allowedRoles && allowedRoles.includes(userRole);
        });
      }

      if (!hasPermission) {
        // §5 — ACCESS_DENIED mandatory logging
        logSecurityEvent({
          event_type: 'ACCESS_DENIED',
          user_id: req.user.userId,
          role_snapshot: req.user.role,
          source_ip: req.ip || undefined,
          result: 'DENY',
          reason_code: 'RBAC_DENY',
          severity: 'WARN',
          metadata: { required_permissions: requiredPermissions },
        }).catch(() => { });

        res.status(403).json({ error: 'Bu əməliyyat üçün icazəniz yoxdur' });
        return;
      }

      next();
    } catch (err) {
      logger.error('RBAC authorize xəta:', err);
      res.status(500).json({ error: 'İcazə yoxlanışı zamanı xəta' });
    }
  };
}
