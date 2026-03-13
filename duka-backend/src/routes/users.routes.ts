import { Router } from 'express';
import { requireActiveSubscription, requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createUserSchema, patchUserSchema } from '../validators/users.validators';
import { createUserHandler, listUsersHandler, patchUserHandler } from '../controllers/users.controller';
import { asyncHandler } from '../utils/asyncHandler';

export const usersRouter = Router();

usersRouter.get('/', requireAuth, requireActiveSubscription, requireRole(['ADMIN', 'MANAGER']), asyncHandler(listUsersHandler));
usersRouter.post('/', requireAuth, requireActiveSubscription, requireRole(['ADMIN', 'MANAGER']), validateBody(createUserSchema), asyncHandler(createUserHandler));
usersRouter.patch('/:id', requireAuth, requireActiveSubscription, requireRole(['ADMIN', 'MANAGER']), validateBody(patchUserSchema), asyncHandler(patchUserHandler));
