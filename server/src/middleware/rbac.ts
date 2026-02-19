import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

type Role = 'admin' | 'risk_manager' | 'asset_owner' | 'incident_coordinator' | 'auditor' | 'dxeit_rep';

// Rol əsaslı icazə matrisi — Spec §1.3
const PERMISSIONS: Record<string, Role[]> = {
  // Aktiv — Modul 1
  'assets:read':    ['admin', 'risk_manager', 'asset_owner', 'incident_coordinator', 'auditor', 'dxeit_rep'],
  'assets:create':  ['admin', 'risk_manager'],
  'assets:update':  ['admin', 'risk_manager', 'asset_owner'],
  'assets:delete':  ['admin'],

  // Təhdid — Modul 2
  'threats:read':    ['admin', 'risk_manager', 'asset_owner', 'incident_coordinator', 'auditor', 'dxeit_rep'],
  'threats:create':  ['admin', 'risk_manager'],
  'threats:update':  ['admin', 'risk_manager'],
  'threats:delete':  ['admin'],

  // Boşluq — Modul 3
  'vulnerabilities:read':    ['admin', 'risk_manager', 'asset_owner', 'auditor', 'dxeit_rep'],
  'vulnerabilities:create':  ['admin', 'risk_manager'],
  'vulnerabilities:update':  ['admin', 'risk_manager'],
  'vulnerabilities:delete':  ['admin'],

  // Risk — Modul 4
  'risks:read':    ['admin', 'risk_manager', 'asset_owner', 'incident_coordinator', 'auditor', 'dxeit_rep'],
  'risks:create':  ['admin', 'risk_manager'],
  'risks:update':  ['admin', 'risk_manager'],
  'risks:delete':  ['admin'],

  // İnsident — Modul 5
  'incidents:read':    ['admin', 'risk_manager', 'incident_coordinator', 'auditor', 'dxeit_rep'],
  'incidents:create':  ['admin', 'risk_manager', 'incident_coordinator'],
  'incidents:update':  ['admin', 'risk_manager', 'incident_coordinator'],
  'incidents:delete':  ['admin'],

  // Həllər — Modul 6
  'solutions:read':    ['admin', 'risk_manager', 'auditor', 'dxeit_rep'],
  'solutions:create':  ['admin', 'risk_manager'],
  'solutions:update':  ['admin', 'risk_manager'],
  'solutions:delete':  ['admin'],

  // Tələblər — Modul 7
  'requirements:read':    ['admin', 'risk_manager', 'auditor', 'dxeit_rep'],
  'requirements:create':  ['admin', 'risk_manager'],
  'requirements:update':  ['admin', 'risk_manager'],
  'requirements:delete':  ['admin'],

  // Hədlər — Modul 7
  'thresholds:read':    ['admin', 'risk_manager', 'auditor', 'dxeit_rep'],
  'thresholds:create':  ['admin', 'risk_manager'],
  'thresholds:update':  ['admin', 'risk_manager'],
  'thresholds:delete':  ['admin'],

  // Fəsadlar — PATCH-06
  'consequences:read':    ['admin', 'risk_manager', 'auditor', 'dxeit_rep'],
  'consequences:create':  ['admin', 'risk_manager'],
  'consequences:update':  ['admin', 'risk_manager'],
  'consequences:delete':  ['admin'],

  // Uzlaşdırma — PATCH-01
  'reconciliations:read':    ['admin', 'risk_manager', 'auditor'],
  'reconciliations:create':  ['admin'],
  'reconciliations:update':  ['admin'],

  // Audit Log — PATCH-08
  'audit:read': ['admin', 'auditor'],

  // Dashboard
  'dashboard:read': ['admin', 'risk_manager', 'asset_owner', 'incident_coordinator', 'auditor', 'dxeit_rep'],

  // Override
  'override:severity': ['admin', 'auditor'],

  // İstifadəçi idarəetməsi
  'users:read':   ['admin'],
  'users:create': ['admin'],
  'users:update': ['admin'],
  'users:delete': ['admin'],
};

export function authorize(...requiredPermissions: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Autentifikasiya tələb olunur' });
      return;
    }

    const userRole = req.user.role as Role;

    const hasPermission = requiredPermissions.every((perm) => {
      const allowedRoles = PERMISSIONS[perm];
      return allowedRoles && allowedRoles.includes(userRole);
    });

    if (!hasPermission) {
      res.status(403).json({ error: 'Bu əməliyyat üçün icazəniz yoxdur' });
      return;
    }

    next();
  };
}
