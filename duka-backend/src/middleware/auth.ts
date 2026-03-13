import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { verifyAccessToken } from '../config/jwt';
import { fail } from '../utils/apiResponse';

export type AuthContext = {
  userId: number;
  businessId: number;
  workspaceId: number | null;
  role: string;
  subscriptionLocked?: boolean;
};

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthContext;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = String(req.headers.authorization || '');
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    res.status(401).json(fail('UNAUTHORIZED', 'Missing access token'));
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: parseInt(payload.sub, 10),
      businessId: payload.businessId,
      workspaceId: payload.workspaceId ?? null,
      role: String(payload.role || '')
    };
    next();
  } catch {
    res.status(401).json(fail('UNAUTHORIZED', 'Invalid or expired access token'));
  }
}

export function requireRole(roles: string[]) {
  const allow = new Set((roles || []).map((r) => String(r || '').toUpperCase()));
  return (req: Request, res: Response, next: NextFunction) => {
    const role = String(req.auth?.role || '').toUpperCase();
    if (!role || !allow.has(role)) {
      res.status(403).json(fail('FORBIDDEN', 'Insufficient permissions'));
      return;
    }
    next();
  };
}

export function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  const businessId = req.auth?.businessId;
  if (!businessId) {
    res.status(401).json(fail('UNAUTHORIZED', 'Not authenticated'));
    return;
  }

  prisma.subscription
    .findFirst({
      where: { businessId },
      orderBy: { createdAt: 'desc' }
    })
    .then((sub) => {
      const now = Date.now();
      const endsAt = sub?.endsAt ? new Date(sub.endsAt).getTime() : 0;
      const trialEndsAt = sub?.trialEndsAt ? new Date(sub.trialEndsAt).getTime() : 0;
      const rawStatus = String(sub?.status || '').toUpperCase();

      const effectiveStatus = (() => {
        if (!sub) return 'EXPIRED';
        if (rawStatus === 'CANCELLED') return 'CANCELLED';
        if (endsAt && now > endsAt) return 'EXPIRED';
        return rawStatus || 'PAID';
      })();

      const locked = effectiveStatus === 'EXPIRED' || effectiveStatus === 'PENDING' || effectiveStatus === 'CANCELLED';
      req.auth = { ...(req.auth as any), subscriptionLocked: locked };

      if (!locked) {
        next();
        return;
      }

      const message =
        effectiveStatus === 'EXPIRED'
          ? 'Subscription expired. Please renew your plan.'
          : effectiveStatus === 'PENDING'
            ? 'Subscription payment is pending.'
            : 'Subscription is inactive.';

      res.status(403).json(
        fail('SUBSCRIPTION_EXPIRED', message, {
          status: String(effectiveStatus).toLowerCase(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          trialEndsAt: trialEndsAt ? new Date(trialEndsAt).toISOString() : null
        })
      );
    })
    .catch(() => {
      res.status(500).json(fail('SERVER_ERROR', 'Failed to verify subscription'));
    });
}
