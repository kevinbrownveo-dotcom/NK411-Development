import { useAuth } from '../context/AuthContext';

const RESOURCE_PERMISSIONS: Record<string, Record<string, string>> = {
  assets: { create: 'assets:create', read: 'assets:read', update: 'assets:update', delete: 'assets:delete' },
  threats: { create: 'threats:create', read: 'threats:read', update: 'threats:update', delete: 'threats:delete' },
  vulnerabilities: { create: 'vulnerabilities:create', read: 'vulnerabilities:read', update: 'vulnerabilities:update', delete: 'vulnerabilities:delete' },
  risks: { create: 'risks:create', read: 'risks:read', update: 'risks:update', delete: 'risks:delete' },
  incidents: { create: 'incidents:create', read: 'incidents:read', update: 'incidents:update', delete: 'incidents:delete' },
  solutions: { create: 'solutions:create', read: 'solutions:read', update: 'solutions:update', delete: 'solutions:delete' },
  requirements: { create: 'requirements:create', read: 'requirements:read', update: 'requirements:update', delete: 'requirements:delete' },
  thresholds: { create: 'thresholds:create', read: 'thresholds:read', update: 'thresholds:update', delete: 'thresholds:delete' },
  consequences: { create: 'consequences:create', read: 'consequences:read', update: 'consequences:update', delete: 'consequences:delete' },
  reconciliations: { create: 'reconciliations:create', read: 'reconciliations:read', update: 'reconciliations:update', delete: 'reconciliations:delete' },
  audit: { read: 'audit:read' },
  dashboard: { read: 'dashboard:read' },
  users: { create: 'users:create', read: 'users:read', update: 'users:update', delete: 'users:delete' },
  roles: { create: 'roles:create', read: 'roles:read', update: 'roles:update', delete: 'roles:delete' },
};

// Statik fallback (role_id olmayan istifadəçilər üçün)
const STATIC_ADMIN_PERMS = new Set(
  Object.values(RESOURCE_PERMISSIONS).flatMap((m) => Object.values(m)),
);

const STATIC_ROLE_PERMS: Record<string, Set<string>> = {
  admin: STATIC_ADMIN_PERMS,
  risk_manager: new Set([
    'assets:read','assets:create','assets:update',
    'threats:read','threats:create','threats:update',
    'vulnerabilities:read','vulnerabilities:create','vulnerabilities:update',
    'risks:read','risks:create','risks:update',
    'incidents:read','incidents:create','incidents:update',
    'solutions:read','solutions:create','solutions:update',
    'requirements:read','requirements:create','requirements:update',
    'thresholds:read','thresholds:create','thresholds:update',
    'consequences:read','consequences:create','consequences:update',
    'reconciliations:read','reconciliations:create','reconciliations:update',
    'dashboard:read',
  ]),
  asset_owner: new Set(['assets:read','assets:update','threats:read','vulnerabilities:read','risks:read','dashboard:read']),
  incident_coordinator: new Set(['assets:read','risks:read','incidents:read','incidents:create','incidents:update','dashboard:read']),
  auditor: new Set([
    'assets:read','threats:read','vulnerabilities:read','risks:read','incidents:read',
    'solutions:read','requirements:read','thresholds:read','consequences:read',
    'reconciliations:read','audit:read','dashboard:read',
  ]),
  dxeit_rep: new Set([
    'assets:read','threats:read','vulnerabilities:read','risks:read','incidents:read',
    'solutions:read','requirements:read','thresholds:read','consequences:read','dashboard:read',
  ]),
};

export function usePermission() {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    // DB-dən gələn dinamik permissions array (role_id olan istifadəçilər)
    if (user.permissions && user.permissions.length > 0) {
      return user.permissions.includes(permission);
    }

    // Statik fallback (role_id olmayan istifadəçilər)
    const rolePerms = STATIC_ROLE_PERMS[user.role];
    return rolePerms ? rolePerms.has(permission) : false;
  };

  const canRead = (resource: string) => hasPermission(`${resource}:read`);
  const canCreate = (resource: string) => hasPermission(`${resource}:create`);
  const canUpdate = (resource: string) => hasPermission(`${resource}:update`);
  const canDelete = (resource: string) => hasPermission(`${resource}:delete`);
  const isAdmin = () => user?.role === 'admin' || hasPermission('users:read');

  return { hasPermission, canRead, canCreate, canUpdate, canDelete, isAdmin };
}
