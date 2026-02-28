import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import db from '../config/database';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  authenticate,
  generateMfaTempToken,
  AuthRequest,
} from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { writeAuditLog } from '../middleware/auditLog';
import { validatePassword } from '../utils/passwordPolicy';
import { logger, logSecurityEvent } from '../utils/logger';
import { ldapService } from '../services/ldap';
import { mailService } from '../utils/mailer';
import { generateMfaSecret, verifyTOTP, generateBackupCodes, verifyBackupCode } from '../services/mfa';
import { blacklistToken } from '../services/tokenBlacklist';

export const authRouter = Router();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATIONS = [15 * 60 * 1000, 60 * 60 * 1000, 24 * 60 * 60 * 1000]; // 15min, 1h, 24h

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
      const newAttempts = (user.failed_login_count || user.login_attempts || 0) + 1;
      const updates: Record<string, unknown> = {
        failed_login_count: newAttempts,
        login_attempts: newAttempts,
        last_failed_login: new Date(),
      };

      // Progressive lockout: 5→15min, 10→1h, 15→24h
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        const lockoutLevel = Math.min(Math.floor(newAttempts / MAX_LOGIN_ATTEMPTS) - 1, 2);
        const lockDuration = LOCKOUT_DURATIONS[lockoutLevel];
        updates.locked_until = new Date(Date.now() + lockDuration);
        updates.lockout_level = lockoutLevel + 1;
        logger.warn(`Hesab kilitləndi: ${email} (level ${lockoutLevel + 1}, ${lockDuration / 60000} dəq)`);

        logSecurityEvent({
          event_type: 'LOGIN_LOCKOUT',
          user_id: user.id,
          role_snapshot: user.role,
          source_ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || undefined,
          user_agent: req.headers['user-agent'] || undefined,
          result: 'DENY',
          reason_code: `LOCKOUT_LEVEL_${lockoutLevel + 1}`,
          severity: 'WARN',
          metadata: { attempts: newAttempts, lock_minutes: lockDuration / 60000 },
        }).catch(() => { });

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Məlum deyil';
        const lockMinutes = lockDuration / 60000;
        mailService.sendAccountLockNotification(user.email, Array.isArray(ip) ? ip[0] : ip, lockMinutes).catch(() => { });
      }

      // LOGIN_FAIL event
      logSecurityEvent({
        event_type: 'LOGIN_FAIL',
        user_id: user.id,
        role_snapshot: user.role,
        source_ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || undefined,
        user_agent: req.headers['user-agent'] || undefined,
        result: 'FAIL',
        reason_code: 'INVALID_PASSWORD',
        severity: 'WARN',
        metadata: { attempts: newAttempts },
      }).catch(() => { });

      await db('users').where({ id: user.id }).update(updates);
      res.status(401).json({ error: 'Yanlış email və ya şifrə' });
      return;
    }

    // ── MFA Check (Epic 1.1) ───────────────────────────────────
    if (user.mfa_enabled) {
      const tempToken = generateMfaTempToken(user.id);
      res.json({
        mfaRequired: true,
        tempToken,
        user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, department: user.department },
      });
      return;
    }

    // Uğurlu giriş (MFA yoxdursa) — cəhd sayğacını sıfırla
    const payload = { userId: user.id, email: user.email, role: user.role, fullName: user.full_name };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    const refreshHash = await bcrypt.hash(refreshToken, 8);

    await db('users').where({ id: user.id }).update({
      refresh_token: refreshHash,
      last_login: new Date(),
      login_attempts: 0,
      failed_login_count: 0,
      locked_until: null,
      lockout_level: 0,
    });

    // LOGIN_SUCCESS event
    logSecurityEvent({
      event_type: 'LOGIN_SUCCESS',
      user_id: user.id,
      role_snapshot: user.role,
      source_ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || undefined,
      user_agent: req.headers['user-agent'] || undefined,
      result: 'SUCCESS',
      severity: 'INFO',
    }).catch(() => { });

    res.json({
      accessToken, refreshToken,
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, department: user.department },
    });
  } catch (error) {
    logger.error('Login xəta:', error);
    res.status(500).json({ error: 'Giriş zamanı xəta baş verdi' });
  }
});

// ── POST /api/auth/login/mfa-verify ─────────────────────────
authRouter.post('/login/mfa-verify', async (req: Request, res: Response) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      res.status(400).json({ error: 'Token və təsdiq kodu tələb olunur' });
      return;
    }

    let decoded: any;
    try {
      decoded = verifyToken(tempToken);
      if (!decoded.isMfaFlow) throw new Error('Etibarsız token tipli');
    } catch {
      res.status(401).json({ error: 'MFA sessiyasının vaxtı bitib və ya etibarsızdır' });
      return;
    }

    const user = await db('users').where({ id: decoded.userId }).first();
    if (!user || !user.mfa_enabled || !user.mfa_secret) {
      res.status(400).json({ error: 'MFA aktiv deyil' });
      return;
    }

    let isValid = false;
    let usedBackupCode = false;

    // 1. Try TOTP code
    isValid = verifyTOTP(user.mfa_secret, code);

    // 2. Try Backup Codes if TOTP failed
    if (!isValid && user.mfa_backup_codes && code.length === 8) {
      const backupCodes = JSON.parse(user.mfa_backup_codes);
      const codeIndex = verifyBackupCode(code, backupCodes);
      if (codeIndex !== -1) {
        isValid = true;
        usedBackupCode = true;
        // Remove used code
        backupCodes.splice(codeIndex, 1);
        await db('users').where({ id: user.id }).update({ mfa_backup_codes: JSON.stringify(backupCodes) });
      }
    }

    if (!isValid) {
      // Log failed MFA 
      logSecurityEvent({
        event_type: 'MFA_FAIL', user_id: user.id, role_snapshot: user.role,
        source_ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || undefined,
        result: 'FAIL', reason_code: 'INVALID_MFA_CODE', severity: 'WARN',
      }).catch(() => { });

      res.status(401).json({ error: 'Yanlış MFA kodu' });
      return;
    }

    // Uğurlu MFA giriş
    const payload = { userId: user.id, email: user.email, role: user.role, fullName: user.full_name };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    const refreshHash = await bcrypt.hash(refreshToken, 8);

    await db('users').where({ id: user.id }).update({
      refresh_token: refreshHash, last_login: new Date(),
      login_attempts: 0, failed_login_count: 0, locked_until: null, lockout_level: 0,
    });

    logSecurityEvent({
      event_type: 'LOGIN_SUCCESS', user_id: user.id, role_snapshot: user.role,
      source_ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || undefined,
      result: 'SUCCESS', severity: 'INFO', metadata: { mfa_used: true, used_backup: usedBackupCode }
    }).catch(() => { });

    res.json({
      accessToken, refreshToken,
      user: { id: user.id, email: user.email, fullName: user.full_name, role: user.role, department: user.department },
    });
  } catch (error) {
    logger.error('MFA Verify xəta:', error);
    res.status(500).json({ error: 'MFA yoxlanılarkən xəta baş verdi' });
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

    // Epic 1.2: Instant Token Revocation (Blacklist)
    if (req.user!.jti) {
      // Assuming access tokens are max 15m, we blacklist until expiration to prevent bloat
      const expiry = new Date(Date.now() + 15 * 60 * 1000);
      await blacklistToken(req.user!.jti, expiry, req.user!.userId, 'logout');
    }

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
        'u.department', 'u.position', 'u.last_login', 'u.mfa_enabled'
      )
      .where({ 'u.id': req.user!.userId, 'u.is_active': true })
      .first();

    if (!user) {
      res.status(404).json({ error: 'İstifadəçi tapılmadı və ya passivdir' });
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

// ── PUT /api/auth/profile ─────────────────────────────────────
authRouter.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { full_name, department, position } = req.body;

    if (!full_name) {
      res.status(400).json({ error: 'Ad və soyad bölməsi boş qala bilməz' });
      return;
    }

    await db('users')
      .where({ id: req.user!.userId })
      .update({
        full_name,
        department: department || null,
        position: position || null,
      });

    await writeAuditLog({
      entity_type: 'user', entity_id: req.user!.userId, action: 'update',
      changed_fields: { full_name, department, position },
      actor_user_id: req.user?.userId, actor_role: req.user?.role,
    });

    res.json({ message: 'Profil uğurla yeniləndi' });
  } catch (error) {
    logger.error('Profil yeniləmə xətası:', error);
    res.status(500).json({ error: 'Profil yenilənərkən xəta baş verdi' });
  }
});

// ── PUT /api/auth/profile/password ────────────────────────────
authRouter.put('/profile/password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      res.status(400).json({ error: 'Cari və yeni şifrə daxil edilməlidir' });
      return;
    }

    const pwCheck = validatePassword(new_password);
    if (!pwCheck.valid) {
      res.status(400).json({ error: pwCheck.message });
      return;
    }

    const user = await db('users').where({ id: req.user!.userId }).first();
    if (!user) {
      res.status(404).json({ error: 'İstifadəçi tapılmadı' });
      return;
    }

    if (user.auth_source === 'ldap') {
      res.status(403).json({ error: 'LDAP/AD istifadəçiləri şifrəni bu portaldan dəyişə bilməz' });
      return;
    }

    const validPassword = await bcrypt.compare(current_password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: 'Cari şifrə yanlışdır' });
      return;
    }

    const newHash = await bcrypt.hash(new_password, 12);

    await db('users').where({ id: user.id }).update({ password_hash: newHash });

    await writeAuditLog({
      entity_type: 'user', entity_id: user.id, action: 'update',
      changed_fields: { password_hash: '[REDACTED]' },
      actor_user_id: req.user?.userId, actor_role: req.user?.role,
    });

    res.json({ message: 'Şifrə uğurla yeniləndi' });

    // Asinxron olaraq bildiriş göndər
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Məlum deyil';
    mailService.sendPasswordResetNotification(user.email, Array.isArray(ip) ? ip[0] : ip).catch(() => { });

  } catch (error) {
    logger.error('Şifrə yeniləmə xətası:', error);
    res.status(500).json({ error: 'Şifrə yenilənərkən xəta baş verdi' });
  }
});

// ── POST /api/auth/mfa/setup ─────────────────────────────────
authRouter.post('/mfa/setup', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db('users').where({ id: req.user!.userId }).first();
    if (!user) { res.status(404).json({ error: 'İstifadəçi tapılmadı' }); return; }

    const setupData = await generateMfaSecret(user.email);

    // Save secret temporarily (not fully active yet)
    await db('users').where({ id: user.id }).update({ mfa_secret: setupData.secret });

    res.json({
      qrCodeUrl: setupData.qrCodeUrl,
      secret: setupData.secret,
      message: 'QR Kodu authenticator tətbiqi ilə oxudun'
    });
  } catch (error) {
    logger.error('MFA setup error:', error);
    res.status(500).json({ error: 'MFA konfiqurasiya edilərkən xəta baş verdi' });
  }
});

// ── POST /api/auth/mfa/confirm ───────────────────────────────
authRouter.post('/mfa/confirm', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) { res.status(400).json({ error: 'Təsdiq kodu daxil edilməlidir' }); return; }

    const user = await db('users').where({ id: req.user!.userId }).first();
    if (!user || !user.mfa_secret) { res.status(400).json({ error: 'MFA setup tapılmadı' }); return; }

    const isValid = verifyTOTP(user.mfa_secret, code);
    if (!isValid) { res.status(400).json({ error: 'MFA kodu yanlışdır' }); return; }

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    await db('users').where({ id: user.id }).update({
      mfa_enabled: true,
      mfa_enabled_at: new Date(),
      mfa_backup_codes: JSON.stringify(backupCodes.hashed)
    });

    logSecurityEvent({
      event_type: 'MFA_ENABLED', user_id: user.id, role_snapshot: user.role,
      source_ip: req.ip, result: 'SUCCESS', severity: 'INFO'
    }).catch(() => { });

    res.json({
      message: 'İki Faktorlu Doğrulama (MFA) uğurla aktivləşdirildi',
      backupCodes: backupCodes.plain // Only shown once!
    });
  } catch (error) {
    logger.error('MFA confirm error:', error);
    res.status(500).json({ error: 'MFA təsdiqlənərkən xəta baş verdi' });
  }
});

authRouter.post('/mfa/disable', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const user = await db('users').where({ id: req.user!.userId }).first();
    if (!user || !user.mfa_enabled) { res.status(400).json({ error: 'MFA aktiv deyil' }); return; }

    if (!code || !verifyTOTP(user.mfa_secret, code)) {
      res.status(400).json({ error: 'Doğrulama kodu yanlışdır' }); return;
    }

    await db('users').where({ id: user.id }).update({
      mfa_enabled: false, mfa_secret: null, mfa_backup_codes: null, mfa_enabled_at: null
    });

    res.json({ message: 'MFA deaktiv edildi' });
  } catch (error) {
    res.status(500).json({ error: 'Xəta baş verdi' });
  }
});
