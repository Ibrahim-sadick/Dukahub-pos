import { Router } from 'express';
import { listPlansHandler } from '../controllers/plans.controller';
import { asyncHandler } from '../utils/asyncHandler';

export const plansRouter = Router();

plansRouter.get('/', asyncHandler(listPlansHandler));
