import type { NextFunction, Response } from 'express';
import { verifyAccessToken } from '../shared/auth';
import type { AuthenticatedRequest } from '../shared/types';

export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const cookieToken = String(req.cookies?.dh_access_token || '').trim();
  const token = bearerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required', code: 'AUTH_REQUIRED' });
  }

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token', code: 'TOKEN_INVALID' });
  }
};
