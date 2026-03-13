import { Router } from 'express';
import { requireActiveSubscription, requireAuth } from '../middleware/auth';
import { businessMeHandler } from '../controllers/business.controller';
import { asyncHandler } from '../utils/asyncHandler';

export const businessRouter = Router();

businessRouter.get('/me', requireAuth, requireActiveSubscription, asyncHandler(businessMeHandler));
