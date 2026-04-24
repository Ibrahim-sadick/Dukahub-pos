import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../shared/types';

const normalizeRole = (role: string) => String(role || '').trim().toLowerCase();

export const requireRole = (...roles: string[]) => {
  const allowed = new Set(roles.map(normalizeRole));

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const currentRole = normalizeRole(req.auth?.role || '');
    if (!currentRole || !allowed.has(currentRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden', code: 'ROLE_FORBIDDEN' });
    }
    return next();
  };
};

export const requirePermission = (...permissions: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const currentPermissions = new Set(req.auth?.permissions || []);
    const currentRole = normalizeRole(req.auth?.role || '');
    const isAdminLike = ['admin', 'owner', 'super admin', 'superadmin', 'manager'].includes(currentRole) || currentRole.includes('admin');

    if (isAdminLike || permissions.every((permission) => currentPermissions.has(permission))) {
      return next();
    }

    return res.status(403).json({ success: false, message: 'Permission denied', code: 'PERMISSION_FORBIDDEN' });
  };
};
