import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import db from '../config/database';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  authenticate,
  AuthRequest,
} from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { writeAuditLog } from '../middleware/auditLog';
import { validatePassword } from '../utils/passwordPolicy';
import { logger } from '../utils/logger';
import { ldapService } from '../services/ldap';

export const authRouter = Router();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 dəqiqə

// Login üçün xüsusi rate limiter (hər 15 dəq 10 cəhd)
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Çox sayda yanlış giriş cəhdi. 15 dəqiqə sonra yenidən cəhd edin.' },
});

// ── POST /api/auth/login ────────────────────────────────────
authRouter.post('/login', loginRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email və şifrə tələb olunur' });
      return;
    }

    // Əvvəlcə LDAP cəhdi (hibrid rejim)
    if (ldapService.isEnabled()) {
      try {
        const available = await ldapService.isAvailable();
        if (available) {
          const ldapUser = await ldapService.authenticate(email, password);
          if (ldapUser) {
            // LDAP-dan gələn istifadəçini DB-də upsert et
            let dbUser = await db('users').where({ email: ldapUser.email }).first();

            // LDAP qrup → rol mapping
            let roleId: string | null = null;
            let roleName = 'auditor';
            if (ldapUser.groups.length > 0) {
              const mapping = await db('ldap_group_mappings')
                .whereIn('ldap_group_dn', ldapUser.groups)
                .leftJoin('roles', 'ldap_group_mappings.role_id', 'roles.id')
                .select('ldap_group_mappings.role_id', 'roles.name as role_name')
                .first();
              if (mapping) { roleId = mapping.role_id; roleName = mapping.role_name; }
            }

            if (!dbUser) {
              const [created] = await db('users').insert({
                email: ldapUser.email,
                password_hash: await bcrypt.hash(Math.random().toString(36), 12),
                full_name: ldapUser.fullName,
                role: roleName,
                role_id: roleId,
                auth_source: 'ldap',
                ldap_dn: ldapUser.dn,
              }).returning('*');
              dbUser = created;
            } else {
              await db('users').where({ id: dbUser.id }).update({
                full_name: ldapUser.fullName,
                auth_source: 'ldap',
                ldap_dn: ldapUser.dn,
                role: roleName,
                role_id: roleId,
                last_login: new Date(),
              });
              dbUser = await db('users').where({ id: dbUser.id }).first();
            }

            const payload = { userId: dbUser.id, email: dbUser.email, role: dbUser.role, fullName: dbUser.full_name };
            const accessToken = generateAccessToken(payload);
            const refreshToken = generateRefreshToken(payload);
            const refreshHash = await bcrypt.hash(refreshToken, 8);

            await db('users').where({ id: dbUser.id }).update({ refresh_token: refreshHash });

            res.json({
              accessToken, refreshToken,
              user: { id: dbUser.id, email: dbUser.email, fullName: dbUser.full_name, role: dbUser.role, department: dbUser.department },
            });
            return;
          }
          // LDAP auth uğursuz → local login-ə keç
        }
      } catch (ldapErr) {
        logger.warn('LDAP autentifikasiyası uğursuz oldu, lokal loginə keçilir:', ldapErr);
      }
    }

    // ── Lokal autentifikasiya ───────────────────────────────
    const user = await db('users').where({ email, is_active: true }).first();
    if (!user) {
      res.status(401).json({ error: 'Yanlış email və ya şifrə' });
      return;
    }

    // Kilit yoxlaması
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutes = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      res.status(423).json({ error: `Hesab kilitlidir. ${minutes} dəqiqə sonra yenidən cəhd edin.` });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      const newAttempts = (user.login_attempts || 0) + 1;
      const updates: Record<string, unknown> = { login_attempts: newAttempts };
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        updates.locked_until = new Date(Date.now() + LOCK_DURATION_MS);
        logger.warn(`Hesab kilitləndi: ${email} (${newAttempts} uğursuz cəhd)`);
      }
      await db('users').where({ id: user.id }).update(updates);
      res.status(401).json({ error: 'Yanlış email və ya şifrə' });
      return;
    }

    // Uğurlu giriş — cəhd sayğacını sıfırla
    const payload = { userId: user.id, email: user.email, role: user.role, fullName: user.full_name };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    const refreshHash = await bcrypt.hash(refreshToken, 8);

    await db('users').where({ id: user.id }).update({
      refresh_token: refreshHash,
      last_login: new Date(),
      login_attempts: 0,
      locked_until: null,
    });

    res.json({
      accessToken, refreshToken,
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, department: user.department },
    });
  } catch (error) {
    logger.error('Login xəta:', error);
    res.status(500).json({ error: 'Giriş zamanı xəta baş verdi' });
  }
});

// ── POST /api/auth/refresh ──────────────────────────────────
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token tələb olunur' });
      return;
    }

    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch {
      res.status(401).json({ error: 'Etibarsız və ya müddəti bitmiş token' });
      return;
    }

    const user = await db('users').where({ id: decoded.userId, is_active: true }).first();
    if (!user || !user.refresh_token) {
      res.status(401).json({ error: 'Etibarsız refresh token' });
      return;
    }

    // Hashed refresh token müqayisəsi
    const tokenMatch = await bcrypt.compare(refreshToken, user.refresh_token);
    if (!tokenMatch) {
      res.status(401).json({ error: 'Etibarsız refresh token' });
      return;
    }

    const payload = { userId: user.id, email: user.email, role: user.role, fullName: user.full_name };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);
    const newRefreshHash = await bcrypt.hash(newRefreshToken, 8);

    await db('users').where({ id: user.id }).update({ refresh_token: newRefreshHash });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    logger.error('Refresh token xəta:', error);
    res.status(401).json({ error: 'Etibarsız və ya müddəti bitmiş token' });
  }
});

// ── POST /api/auth/logout ───────────────────────────────────
authRouter.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await db('users').where({ id: req.user!.userId }).update({ refresh_token: null });
    res.json({ message: 'Uğurla çıxış edildi' });
  } catch (error) {
    logger.error('Logout xəta:', error);
    res.status(500).json({ error: 'Çıxış zamanı xəta baş verdi' });
  }
});

// ── GET /api/auth/me ────────────────────────────────────────
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db('users as u')
      .leftJoin('roles as r', 'u.role_id', 'r.id')
      .select(
        'u.id', 'u.email', 'u.full_name', 'u.role', 'u.role_id',
        'r.name as role_name', 'r.label as role_label',
        'u.department', 'u.position', 'u.last_login',
      )
      .where({ 'u.id': req.user!.userId })
      .first();

    if (!user) {
      res.status(404).json({ error: 'İstifadəçi tapılmadı' });
      return;
    }

    // Role permission-ları da cavaba əlavə et (frontend guard üçün)
    let permissions: string[] = [];
    if (user.role_id) {
      const perms = await db('role_permissions')
        .where({ role_id: user.role_id })
        .select('resource', 'action');
      permissions = perms.map((p) => `${p.resource}:${p.action}`);
    }

    res.json({ ...user, permissions });
  } catch (error) {
    logger.error('/me xəta:', error);
    res.status(500).json({ error: 'Xəta baş verdi' });
  }
});

// ── POST /api/auth/register (yalnız admin) ─────────────────
authRouter.post('/register', authenticate, authorize('users:create'), async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, full_name, role, department, position } = req.body;

    if (!email || !password || !full_name || !role) {
      res.status(400).json({ error: 'Bütün məcburi sahələri doldurun' });
      return;
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      res.status(400).json({ error: pwCheck.message });
      return;
    }

    const existing = await db('users').where({ email }).first();
    if (existing) {
      res.status(409).json({ error: 'Bu email artıq qeydiyyatdadır' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db('users')
      .insert({ email, password_hash: passwordHash, full_name, role, department: department || null, position: position || null })
      .returning(['id', 'email', 'full_name', 'role']);

    await writeAuditLog({
      entity_type: 'user', entity_id: user.id, action: 'create',
      changed_fields: { email, full_name, role },
      actor_user_id: req.user?.userId, actor_role: req.user?.role,
    });

    res.status(201).json(user);
  } catch (error) {
    logger.error('Register xəta:', error);
    res.status(500).json({ error: 'Qeydiyyat zamanı xəta baş verdi' });
  }
});


