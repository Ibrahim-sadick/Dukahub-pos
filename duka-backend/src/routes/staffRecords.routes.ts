import { Router } from 'express';
import { requireActiveSubscription, requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';
import { createStaffRecordHandler, listStaffRecordsHandler, patchStaffRecordHandler } from '../controllers/staffRecords.controller';
import { createStaffRecordSchema, patchStaffRecordSchema } from '../validators/staffRecords.validators';

export const staffRecordsRouter = Router();

staffRecordsRouter.get('/', requireAuth, requireActiveSubscription, requireRole(['ADMIN', 'MANAGER']), asyncHandler(listStaffRecordsHandler));
staffRecordsRouter.post(
  '/',
  requireAuth,
  requireActiveSubscription,
  requireRole(['ADMIN', 'MANAGER']),
  validateBody(createStaffRecordSchema),
  asyncHandler(createStaffRecordHandler)
);
staffRecordsRouter.patch(
  '/:id',
  requireAuth,
  requireActiveSubscription,
  requireRole(['ADMIN', 'MANAGER']),
  validateBody(patchStaffRecordSchema),
  asyncHandler(patchStaffRecordHandler)
);

