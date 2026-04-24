import type { NextFunction, Request, Response } from 'express';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message: string;
  code: string;
  keyGenerator?: (req: Request) => string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

const pruneExpiredEntries = (now: number) => {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
};

const getClientIp = (req: Request) => {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)[0];
  return forwarded || req.ip || req.socket.remoteAddress || 'unknown';
};

const pruneIfExpired = (key: string, now: number) => {
  const entry = rateLimitStore.get(key);
  if (!entry) return null;
  if (entry.resetAt > now) return entry;
  rateLimitStore.delete(key);
  return null;
};

export const createRateLimiter = (options: RateLimitOptions) => {
  const windowMs = Math.max(1000, Number(options.windowMs || 0));
  const max = Math.max(1, Number(options.max || 0));

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    pruneExpiredEntries(now);
    const identity = String(options.keyGenerator?.(req) || getClientIp(req) || 'unknown').trim() || 'unknown';
    const key = `${options.keyPrefix}:${identity}`;
    const existing = pruneIfExpired(key, now);

    if (!existing) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (existing.count >= max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message: options.message,
        code: options.code
      });
    }

    existing.count += 1;
    rateLimitStore.set(key, existing);
    return next();
  };
};
