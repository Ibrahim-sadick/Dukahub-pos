import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from './env';

export type AccessTokenPayload = {
  sub: string;
  businessId: number;
  workspaceId: number | null;
  role: string;
};

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL_SECONDS });
}

export type RefreshTokenPayload = {
  sub: string;
  jti: string;
};

export function signRefreshToken(payload: RefreshTokenPayload, ttlDays?: number) {
  const days = ttlDays ?? env.JWT_REFRESH_TTL_DAYS;
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: `${days}d` });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

export function hashToken(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export function randomId() {
  return crypto.randomBytes(16).toString('hex');
}

