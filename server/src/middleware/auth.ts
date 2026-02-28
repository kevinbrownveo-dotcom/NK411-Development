import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { isBlacklisted } from '../services/tokenBlacklist';
import db from '../config/database';

// In-memory cache for user active status to prevent hitting the DB on every single API request
const USER_ACTIVE_CACHE = new Map<string, { active: boolean, expiresAt: number }>();
const CACHE_TTL_MS = 5000; // 5 seconds

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  fullName: string;
  jti?: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'dev-secret-key';

function parseExpiresIn(value: string, fallback: SignOptions['expiresIn']): SignOptions['expiresIn'] {
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }
  return trimmed as SignOptions['expiresIn'];
}

export function generateAccessToken(payload: Omit<JwtPayload, 'jti'>): string {
  const expiresIn = parseExpiresIn(process.env.JWT_ACCESS_EXPIRY || '15m', '15m');
  const jti = randomBytes(16).toString('hex');
  return jwt.sign({ ...payload, jti }, JWT_SECRET, {
    expiresIn,
  });
}

export function generateMfaTempToken(userId: string): string {
  return jwt.sign({ userId, isMfaFlow: true }, JWT_SECRET, {
    expiresIn: '5m', // Temporary token valid only for 5 minutes to complete MFA
  });
}

export function generateRefreshToken(payload: JwtPayload): string {
  const expiresIn = parseExpiresIn(process.env.JWT_REFRESH_EXPIRY || '8h', '8h');
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Autentifikasiya tələb olunur' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyToken(token) as any;

    // Prevent MFA temp tokens from accessing normal routes
    if (decoded.isMfaFlow) {
      res.status(401).json({ error: 'MFA tamamlanmalıdır (Bu müvəqqəti tokendir)' });
      return;
    }

    // Check Blacklist for instant revocation (Epic 1.2)
    if (decoded.jti && decoded.userId) {
      // Find token issue time (iat)
      const iat = decoded.iat || 0;
      const blacklisted = await isBlacklisted(decoded.jti, decoded.userId, iat);
      if (blacklisted) {
        res.status(401).json({ error: 'Token ləğv edilib (Sistemdən çıxarılmısınız)' });
        return;
      }

      // Epic 1.3: Per-Request Active Check (with 5s cache to avoid DB spam)
      const now = Date.now();
      let isActive = true;

      const cached = USER_ACTIVE_CACHE.get(decoded.userId);
      if (cached && cached.expiresAt > now) {
        isActive = cached.active;
      } else {
        // Check DB
        try {
          const dbUser = await db('users').select('is_active', 'locked_until').where({ id: decoded.userId }).first();
          if (!dbUser || !dbUser.is_active || (dbUser.locked_until && new Date(dbUser.locked_until).getTime() > now)) {
            isActive = false;
          }
          USER_ACTIVE_CACHE.set(decoded.userId, { active: isActive, expiresAt: now + CACHE_TTL_MS });
        } catch (err) {
          // If DB is down, fail open defensively? No, assume active if DB fails, or fail closed. Let's fail open to avoid catastrophic outage if DB blips
          isActive = true;
        }
      }

      if (!isActive) {
        res.status(401).json({ error: 'Hesabınız passivləşdirilib və ya kilitlənib' });
        return;
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Etibarsız və ya müddəti bitmiş token' });
  }
}
