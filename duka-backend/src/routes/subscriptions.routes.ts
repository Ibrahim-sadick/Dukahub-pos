import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { confirmPaymentSchema, selectPlanSchema } from '../validators/subscriptions.validators';
import { confirmPaymentHandler, currentSubscriptionHandler, selectPlanHandler } from '../controllers/subscriptions.controller';
import { asyncHandler } from '../utils/asyncHandler';

export const subscriptionsRouter = Router();

subscriptionsRouter.get('/current', requireAuth, asyncHandler(currentSubscriptionHandler));
subscriptionsRouter.post('/select-plan', requireAuth, validateBody(selectPlanSchema), asyncHandler(selectPlanHandler));
subscriptionsRouter.post('/confirm-payment', requireAuth, validateBody(confirmPaymentSchema), asyncHandler(confirmPaymentHandler));
