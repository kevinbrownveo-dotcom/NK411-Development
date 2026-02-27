/**
 * Admin Panel API Routes
 * Yalnız `users:read` icazəli istifadəçilər daxil ola bilər (admin)
 */

import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import db from '../config/database';
import { authenticate, AuthRequest } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { writeAuditLog } from '../middleware/auditLog';
import { validatePassword } from '../utils/passwordPolicy';
import { logger } from '../utils/logger';
import { permissionsCache } from '../middleware/rbac';
import { mailService } from '../utils/mailer';

export const adminRouter = Router();

// Bütün admin route-lara autentifikasiya tələb et
adminRouter.use(authenticate);
adminRouter.use(authorize('users:read'));

// ══════════════════════════════════════════════════════════════
// İSTİFADƏÇİ İDARƏETMƏSİ
// ══════════════════════════════════════════════════════════════

/** GET /api/admin/users */
adminRouter.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(String(req.query.page || '1'));
    const limit = parseInt(String(req.query.limit || '20'));
    const search = String(req.query.search || '');
    const offset = (page - 1) * limit;

    let query = db('users as u')
      .leftJoin('roles as r', 'u.role_id', 'r.id')
      .select(
        'u.id', 'u.email', 'u.full_name', 'u.role', 'u.role_id',
        'r.name as role_name', 'r.label as role_label',
        'u.department', 'u.position', 'u.is_active', 'u.auth_source',
        'u.last_login', 'u.login_attempts', 'u.locked_until',
        'u.created_at',
      );

    if (search) {
      query = query.where((b) =>
        b.whereILike('u.email', `%${search}%`).orWhereILike('u.full_name', `%${search}%`),
      );
    }

    const total = await db('users').modify((q) => {
      if (search) q.whereILike('email', `%${search}%`).orWhereILike('full_name', `%${search}%`);
    }).count('id as count').first();

    const users = await query.orderBy('u.created_at', 'desc').limit(limit).offset(offset);
    res.json({ data: users, pagination: { page, limit, total: Number(total?.count || 0) } });
  } catch (error) {
    logger.error('Admin users list xəta:', error);
    res.status(500).json({ error: 'İstifadəçilər siyahısı alınarkən xəta' });
  }
});

/** GET /api/admin/users/:id */
adminRouter.get('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = await db('users as u')
      .leftJoin('roles as r', 'u.role_id', 'r.id')
      .select(
        'u.id', 'u.email', 'u.full_name', 'u.role', 'u.role_id',
        'r.name as role_name', 'r.label as role_label',
        'u.department', 'u.position', 'u.is_active', 'u.auth_source',
        'u.last_login', 'u.login_attempts', 'u.locked_until', 'u.created_at',
      )
      .where('u.id', req.params.id)
      .first();

    if (!user) return res.status(404).json({ error: 'İstifadəçi tapılmadı' });
    res.json(user);
  } catch (error) {
    logger.error('Admin user get xəta:', error);
    res.status(500).json({ error: 'Xəta baş verdi' });
  }
});

/** POST /api/admin/users */
adminRouter.post('/users', authorize('users:create'), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, full_name, role, role_id, department, position } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Email, şifrə və ad tələb olunur' });
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) return res.status(400).json({ error: pwCheck.message });

    const existing = await db('users').where({ email }).first();
    if (existing) return res.status(409).json({ error: 'Bu email artıq qeydiyyatdadır' });

    // role_id-dən role adını al (əgər role_id verilib)
    let resolvedRole = role || 'auditor';
    if (role_id) {
      const roleRow = await db('roles').where({ id: role_id }).first();
      if (roleRow) resolvedRole = roleRow.name;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db('users')
      .insert({
        email, password_hash: passwordHash, full_name,
        role: resolvedRole, role_id: role_id || null,
        department: department || null, position: position || null,
      })
      .returning(['id', 'email', 'full_name', 'role', 'role_id', 'department', 'is_active']);

    await writeAuditLog({
      entity_type: 'user', entity_id: user.id, action: 'create',
      changed_fields: { email, full_name, role: resolvedRole },
      actor_user_id: req.user?.userId, actor_role: req.user?.role,
    });

    res.status(201).json(user);
  } catch (error) {
    logger.error('Admin user create xəta:', error);
    res.status(500).json({ error: 'İstifadəçi yaradılarkən xəta' });
  }
});

/** PUT /api/admin/users/:id */
adminRouter.put('/users/:id', authorize('users:update'), async (req: AuthRequest, res: Response) => {
  try {
    const { full_name, role, role_id, department, position, is_active } = req.body;

    const existing = await db('users').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'İstifadəçi tapılmadı' });

    // Öz hesabını deaktiv etməsinin qarşısını al
    if (req.params.id === req.user?.userId && is_active === false) {
      return res.status(400).json({ error: 'Öz hesabınızı deaktiv edə bilməzsiniz' });
    }

    let resolvedRole = role || existing.role;
    if (role_id) {
      const roleRow = await db('roles').where({ id: role_id }).first();
      if (roleRow) resolvedRole = roleRow.name;
    }

    const updates: Record<string, unknown> = {};
    if (full_name !== undefined) updates.full_name = full_name;
    if (resolvedRole) updates.role = resolvedRole;
    if (role_id !== undefined) updates.role_id = role_id || null;
    if (department !== undefined) updates.department = department;
    if (position !== undefined) updates.position = position;
    if (is_active !== undefined) updates.is_active = is_active;

    const [updated] = await db('users').where({ id: req.params.id })
      .update(updates).returning(['id', 'email', 'full_name', 'role', 'role_id', 'is_active']);

    // Cache-i sıfırla
    permissionsCache.delete(updated.role_id || updated.role);

    await writeAuditLog({
      entity_type: 'user', entity_id: req.params.id, action: 'update',
      changed_fields: updates, actor_user_id: req.user?.userId, actor_role: req.user?.role,
    });

    res.json(updated);
  } catch (error) {
    logger.error('Admin user update xəta:', error);
    res.status(500).json({ error: 'İstifadəçi yenilənərkən xəta' });
  }
});

/** DELETE /api/admin/users/:id */
adminRouter.delete('/users/:id', authorize('users:delete'), async (req: AuthRequest, res: Response) => {
  try {
    if (req.params.id === req.user?.userId) {
      return res.status(400).json({ error: 'Öz hesabınızı silə bilməzsiniz' });
    }

    const existing = await db('users').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'İstifadəçi tapılmadı' });

    // Əvəzinə deaktiv et (audit trail xatirinə hard-delete etmirik)
    await db('users').where({ id: req.params.id }).update({ is_active: false });

    await writeAuditLog({
      entity_type: 'user', entity_id: req.params.id, action: 'delete',
      actor_user_id: req.user?.userId, actor_role: req.user?.role,
    });

    res.json({ message: 'İstifadəçi deaktiv edildi' });
  } catch (error) {
    logger.error('Admin user delete xəta:', error);
    res.status(500).json({ error: 'İstifadəçi silinərkən xəta' });
  }
});

/** POST /api/admin/users/:id/assign-role */
adminRouter.post('/users/:id/assign-role', authorize('users:update'), async (req: AuthRequest, res: Response) => {
  try {
    const { role_id } = req.body;
    if (!role_id) return res.status(400).json({ error: 'role_id tələb olunur' });

    const roleRow = await db('roles').where({ id: role_id }).first();
    if (!roleRow) return res.status(404).json({ error: 'Rol tapılmadı' });

    await db('users').where({ id: req.params.id }).update({ role_id, role: roleRow.name });
    permissionsCache.delete(role_id);

    await writeAuditLog({
      entity_type: 'user', entity_id: req.params.id, action: 'update',
      changed_fields: { role_id, role: roleRow.name },
      actor_user_id: req.user?.userId, actor_role: req.user?.role,
    });

    res.json({ message: 'Rol təyin edildi', role: roleRow });
  } catch (error) {
    logger.error('Assign role xəta:', error);
    res.status(500).json({ error: 'Rol təyin edilərkən xəta' });
  }
});

/** POST /api/admin/users/:id/reset-password */
adminRouter.post('/users/:id/reset-password', authorize('users:update'), async (req: AuthRequest, res: Response) => {
  try {
    const { new_password } = req.body;

    let password = new_password;
    let generated = false;

    if (!password) {
      // Avtomatik güclü şifrə yarat
      password = crypto.randomBytes(10).toString('base64url') + '!A1';
      generated = true;
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) return res.status(400).json({ error: pwCheck.message });

    const hash = await bcrypt.hash(password, 12);
    await db('users').where({ id: req.params.id }).update({
      password_hash: hash,
      login_attempts: 0,
      locked_until: null,
      refresh_token: null,
    });

    await writeAuditLog({
      entity_type: 'user', entity_id: req.params.id, action: 'update',
      changed_fields: { password_reset: true },
      actor_user_id: req.user?.userId, actor_role: req.user?.role,
    });

    res.json({ message: 'Şifrə sıfırlandı', ...(generated && { temporary_password: password }) });

    // Asinxron olaraq bildiriş göndər (istifadəçiyə)
    const userForEmail = await db('users').where({ id: req.params.id }).select('email').first();
    if (userForEmail) {
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Məlum deyil';
      mailService.sendPasswordResetNotification(userForEmail.email, Array.isArray(ip) ? ip[0] : ip).catch(() => { });
    }

  } catch (error) {
    logger.error('Reset password xəta:', error);
    res.status(500).json({ error: 'Şifrə sıfırlanarkən xəta' });
  }
});

/** POST /api/admin/users/:id/unlock */
adminRouter.post('/users/:id/unlock', authorize('users:update'), async (req: AuthRequest, res: Response) => {
  try {
    await db('users').where({ id: req.params.id }).update({ login_attempts: 0, locked_until: null });
    res.json({ message: 'Hesab kilidindən açıldı' });
  } catch (error) {
    logger.error('Unlock user xəta:', error);
    res.status(500).json({ error: 'Kilid açılarkən xəta' });
  }
});

// ══════════════════════════════════════════════════════════════
// ROL İDARƏETMƏSİ
// ══════════════════════════════════════════════════════════════

/** GET /api/admin/roles */
adminRouter.get('/roles', async (_req: AuthRequest, res: Response) => {
  try {
    const roles = await db('roles').select('*').orderBy('is_system', 'desc').orderBy('name');
    res.json(roles);
  } catch (error) {
    logger.error('Admin roles list xəta:', error);
    res.status(500).json({ error: 'Rollar siyahısı alınarkən xəta' });
  }
});

/** GET /api/admin/roles/:id */
adminRouter.get('/roles/:id', async (req: AuthRequest, res: Response) => {
  try {
    const role = await db('roles').where({ id: req.params.id }).first();
    if (!role) return res.status(404).json({ error: 'Rol tapılmadı' });

    const permissions = await db('role_permissions').where({ role_id: req.params.id });
    res.json({ ...role, permissions });
  } catch (error) {
    logger.error('Admin role get xəta:', error);
    res.status(500).json({ error: 'Xəta baş verdi' });
  }
});

/** POST /api/admin/roles */
adminRouter.post('/roles', authorize('roles:create'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, label, description, permissions } = req.body;
    if (!name || !label) return res.status(400).json({ error: 'Ad və etiket tələb olunur' });

    const exists = await db('roles').where({ name }).first();
    if (exists) return res.status(409).json({ error: 'Bu adda rol artıq mövcuddur' });

    const [role] = await db('roles')
      .insert({ name, label, description: description || null, is_custom: true })
      .returning('*');

    if (Array.isArray(permissions) && permissions.length > 0) {
      await db('role_permissions').insert(
        permissions.map((p: { resource: string; action: string }) => ({
          role_id: role.id, resource: p.resource, action: p.action,
        })),
      );
    }

    await writeAuditLog({
      entity_type: 'role', entity_id: role.id, action: 'create',
      changed_fields: { name, label }, actor_user_id: req.user?.userId, actor_role: req.user?.role,
    });

    res.status(201).json(role);
  } catch (error) {
    logger.error('Admin role create xəta:', error);
    res.status(500).json({ error: 'Rol yaradılarkən xəta' });
  }
});

/** PUT /api/admin/roles/:id */
adminRouter.put('/roles/:id', authorize('roles:update'), async (req: AuthRequest, res: Response) => {
  try {
    const existing = await db('roles').where({ id: req.params.id }).first();
    if (!existing) return res.status(404).json({ error: 'Rol tapılmadı' });

    const { label, description } = req.body;
    const [updated] = await db('roles').where({ id: req.params.id })
      .update({ label: label || existing.label, description: description ?? existing.description })
      .returning('*');

    permissionsCache.delete(req.params.id);

    await writeAuditLog({
      entity_type: 'role', entity_id: req.params.id, action: 'update',
      changed_fields: { label, description }, actor_user_id: req.user?.userId, actor_role: req.user?.role,
    });

    res.json(updated);
  } catch (error) {
    logger.error('Admin role update xəta:', error);
    res.status(500).json({ error: 'Rol yenilənərkən xəta' });
  }
});

/** DELETE /api/admin/roles/:id */
adminRouter.delete('/roles/:id', authorize('roles:delete'), async (req: AuthRequest, res: Response) => {
  try {
    const role = await db('roles').where({ id: req.params.id }).first();
    if (!role) return res.status(404).json({ error: 'Rol tapılmadı' });
    if (role.is_system) return res.status(400).json({ error: 'Sistem rolunu silmək olmaz' });

    const usersWithRole = await db('users').where({ role_id: req.params.id }).count('id as cnt').first();
    if (Number(usersWithRole?.cnt || 0) > 0) {
      return res.status(400).json({ error: 'Bu rola təyin olunmuş istifadəçilər var, əvvəlcə başqa rola keçirin' });
    }

    await db('roles').where({ id: req.params.id }).delete();
    permissionsCache.delete(req.params.id);

    await writeAuditLog({
      entity_type: 'role', entity_id: req.params.id, action: 'delete',
      actor_user_id: req.user?.userId, actor_role: req.user?.role,
    });

    res.json({ message: 'Rol silindi' });
  } catch (error) {
    logger.error('Admin role delete xəta:', error);
    res.status(500).json({ error: 'Rol silinərkən xəta' });
  }
});

/** GET /api/admin/roles/:id/permissions */
adminRouter.get('/roles/:id/permissions', async (req: AuthRequest, res: Response) => {
  try {
    const perms = await db('role_permissions').where({ role_id: req.params.id });
    res.json(perms);
  } catch (error) {
    logger.error('Get permissions xəta:', error);
    res.status(500).json({ error: 'İcazələr alınarkən xəta' });
  }
});

/** PUT /api/admin/roles/:id/permissions — icazə matrisini tam əvəz et */
adminRouter.put('/roles/:id/permissions', authorize('roles:update'), async (req: AuthRequest, res: Response) => {
  try {
    const { permissions } = req.body; // Array<{resource, action}>
    if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions array tələb olunur' });

    const role = await db('roles').where({ id: req.params.id }).first();
    if (!role) return res.status(404).json({ error: 'Rol tapılmadı' });

    await db.transaction(async (trx) => {
      await trx('role_permissions').where({ role_id: req.params.id }).delete();
      if (permissions.length > 0) {
        await trx('role_permissions').insert(
          permissions.map((p: { resource: string; action: string }) => ({
            role_id: req.params.id, resource: p.resource, action: p.action,
          })),
        );
      }
    });

    permissionsCache.delete(req.params.id);

    await writeAuditLog({
      entity_type: 'role', entity_id: req.params.id, action: 'update',
      changed_fields: { permissions_updated: permissions.length },
      actor_user_id: req.user?.userId, actor_role: req.user?.role,
    });

    res.json({ message: 'İcazələr yeniləndi', count: permissions.length });
  } catch (error) {
    logger.error('Update permissions xəta:', error);
    res.status(500).json({ error: 'İcazələr yenilənərkən xəta' });
  }
});

// ══════════════════════════════════════════════════════════════
// LDAP QRUP MAPPİNGLƏRİ
// ══════════════════════════════════════════════════════════════

/** GET /api/admin/ldap/group-mappings */
adminRouter.get('/ldap/group-mappings', async (_req: AuthRequest, res: Response) => {
  try {
    const mappings = await db('ldap_group_mappings as m')
      .leftJoin('roles as r', 'm.role_id', 'r.id')
      .select('m.*', 'r.name as role_name', 'r.label as role_label');
    res.json(mappings);
  } catch (error) {
    logger.error('LDAP mappings list xəta:', error);
    res.status(500).json({ error: 'LDAP mapping siyahısı alınarkən xəta' });
  }
});

/** POST /api/admin/ldap/group-mappings */
adminRouter.post('/ldap/group-mappings', authorize('roles:create'), async (req: AuthRequest, res: Response) => {
  try {
    const { ldap_group_dn, ldap_group_label, role_id } = req.body;
    if (!ldap_group_dn || !role_id) return res.status(400).json({ error: 'ldap_group_dn və role_id tələb olunur' });

    const [mapping] = await db('ldap_group_mappings')
      .insert({ ldap_group_dn, ldap_group_label: ldap_group_label || null, role_id })
      .returning('*');
    res.status(201).json(mapping);
  } catch (error) {
    logger.error('LDAP mapping create xəta:', error);
    res.status(500).json({ error: 'LDAP mapping yaradılarkən xəta' });
  }
});

/** DELETE /api/admin/ldap/group-mappings/:id */
adminRouter.delete('/ldap/group-mappings/:id', authorize('roles:delete'), async (req: AuthRequest, res: Response) => {
  try {
    await db('ldap_group_mappings').where({ id: req.params.id }).delete();
    res.json({ message: 'LDAP mapping silindi' });
  } catch (error) {
    logger.error('LDAP mapping delete xəta:', error);
    res.status(500).json({ error: 'LDAP mapping silinərkən xəta' });
  }
});

/** POST /api/admin/ldap/test — LDAP bağlantısını yoxla */
adminRouter.post('/ldap/test', async (_req: AuthRequest, res: Response) => {
  try {
    const { ldapService } = await import('../services/ldap');
    if (!ldapService.isEnabled()) {
      return res.json({ available: false, message: 'LDAP aktivləşdirilməyib (LDAP_ENABLED=false)' });
    }
    const available = await ldapService.isAvailable();
    res.json({ available, message: available ? 'LDAP əlçatandır' : 'LDAP əlçatmaz' });
  } catch (error) {
    logger.error('LDAP test xəta:', error);
    res.status(500).json({ error: 'LDAP testi zamanı xəta' });
  }
});
