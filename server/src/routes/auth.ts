import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../config/database';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  authenticate,
  AuthRequest,
} from '../middleware/auth';
import { writeAuditLog } from '../middleware/auditLog';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email və şifrə tələb olunur' });
      return;
    }

    const user = await db('users').where({ email, is_active: true }).first();
    if (!user) {
      res.status(401).json({ error: 'Yanlış email və ya şifrə' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      res.status(401).json({ error: 'Yanlış email və ya şifrə' });
      return;
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Refresh token-i DB-yə yaz
    await db('users').where({ id: user.id }).update({
      refresh_token: refreshToken,
      last_login: new Date(),
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        department: user.department,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Giriş zamanı xəta baş verdi' });
  }
});

// POST /api/auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token tələb olunur' });
      return;
    }

    const decoded = verifyToken(refreshToken);
    const user = await db('users')
      .where({ id: decoded.userId, refresh_token: refreshToken, is_active: true })
      .first();

    if (!user) {
      res.status(401).json({ error: 'Etibarsız refresh token' });
      return;
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    };

    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    await db('users').where({ id: user.id }).update({ refresh_token: newRefreshToken });

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ error: 'Etibarsız və ya müddəti bitmiş token' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await db('users').where({ id: req.user!.userId }).update({ refresh_token: null });
    res.json({ message: 'Uğurla çıxış edildi' });
  } catch {
    res.status(500).json({ error: 'Çıxış zamanı xəta baş verdi' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db('users')
      .select('id', 'email', 'full_name', 'role', 'department', 'position', 'last_login')
      .where({ id: req.user!.userId })
      .first();

    if (!user) {
      res.status(404).json({ error: 'İstifadəçi tapılmadı' });
      return;
    }

    res.json(user);
  } catch {
    res.status(500).json({ error: 'Xəta baş verdi' });
  }
});

// POST /api/auth/register (admin only — seed üçün)
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, full_name, role, department, position } = req.body;

    if (!email || !password || !full_name || !role) {
      res.status(400).json({ error: 'Bütün məcburi sahələri doldurun' });
      return;
    }

    const existing = await db('users').where({ email }).first();
    if (existing) {
      res.status(409).json({ error: 'Bu email artıq qeydiyyatdadır' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await db('users')
      .insert({
        email,
        password_hash: passwordHash,
        full_name,
        role,
        department: department || null,
        position: position || null,
      })
      .returning(['id', 'email', 'full_name', 'role']);

    await writeAuditLog({
      entity_type: 'user',
      entity_id: user.id,
      action: 'create',
      changed_fields: { email, full_name, role },
    });

    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Qeydiyyat zamanı xəta baş verdi' });
  }
});
