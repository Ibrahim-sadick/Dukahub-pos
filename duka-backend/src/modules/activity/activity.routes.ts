import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { requirePermission } from '../../middleware/authorize';
import { asyncHandler } from '../../shared/async-handler';
import type { AuthenticatedRequest } from '../../shared/types';

export const activityRouter = Router();

activityRouter.use(requireAuth, requirePermission('logs.view'));

activityRouter.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const take = Math.min(Number(req.query.limit || 50), 200);
    const logs = await prisma.activityLog.findMany({
      where: { businessId: String(req.auth?.businessId) },
      include: {
        user: { select: { id: true, fullName: true, employeeId: true, roleLabel: true } }
      },
      orderBy: { createdAt: 'desc' },
      take
    });

    res.json({ success: true, data: { logs } });
  })
);

activityRouter.delete(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await prisma.activityLog.deleteMany({
      where: { businessId: String(req.auth?.businessId) }
    });

    res.json({ success: true, message: 'Activity logs cleared successfully', data: { cleared: true } });
  })
);
