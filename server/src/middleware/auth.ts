import { Request, Response, NextFunction } from 'express';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  fullName: string;
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

export function generateAccessToken(payload: JwtPayload): string {
  const expiresIn = parseExpiresIn(process.env.JWT_ACCESS_EXPIRY || '15m', '15m');
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
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

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Autentifikasiya tələb olunur' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Etibarsız və ya müddəti bitmiş token' });
  }
}
