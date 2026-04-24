import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../shared/async-handler';
import { ApiError } from '../../shared/errors';
import type { AuthenticatedRequest } from '../../shared/types';
import { normalizeTzPhone255 } from '../../shared/utils';
import { recordActivity } from '../../shared/activity-log';
import { assertEntityOwnership } from '../../shared/documents';

export const usersRouter = Router();

usersRouter.use(requireAuth);

const normalizeOptionalPhone = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const phone = normalizeTzPhone255(raw);
  if (!phone) throw new ApiError(400, 'Phone number is invalid', 'PHONE_INVALID');
  return phone;
};

const assertPhoneAvailable = async (phone: string | null, excludeUserId?: string) => {
  if (!phone) return;
  const existing = await prisma.user.findFirst({
    where: {
      phone,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {})
    },
    select: { id: true }
  });
  if (existing) {
    throw new ApiError(409, 'Phone number already exists', 'PHONE_EXISTS');
  }
};

const throwStaffModuleRemoved = () => {
  throw new ApiError(410, 'Staff management has been removed from this system', 'STAFF_MODULE_REMOVED');
};

usersRouter.patch(
  '/me',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const userId = String(req.auth?.userId || '');
    const businessId = String(req.auth?.businessId || '');
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found', code: 'USER_NOT_FOUND' });
    }

    assertEntityOwnership(existingUser.businessId, businessId);

    const phone = normalizeOptionalPhone(req.body.phone);
    await assertPhoneAvailable(phone, existingUser.id);

    const user = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        fullName: req.body.fullName,
        email: req.body.email,
        phone,
        profilePhoto: req.body.profilePhoto
      },
      include: {
        role: true,
        staffProfile: true
      }
    });

    await recordActivity({
      businessId,
      userId,
      action: 'profile_update',
      title: 'Profile updated',
      details: `${user.fullName} updated their profile`,
      entityType: 'User',
      entityId: user.id
    });

    res.json({ success: true, message: 'Profile updated successfully', data: { user } });
  })
);

usersRouter.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    void req;
    void res;
    throwStaffModuleRemoved();
  })
);

usersRouter.post(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    void req;
    void res;
    throwStaffModuleRemoved();
  })
);

usersRouter.patch(
  '/:userId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    void req;
    void res;
    throwStaffModuleRemoved();
  })
);
