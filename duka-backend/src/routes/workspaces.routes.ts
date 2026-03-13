import { Router } from 'express';
import { requireActiveSubscription, requireAuth, requireRole } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createWorkspaceSchema } from '../validators/workspaces.validators';
import { createWorkspaceHandler, listWorkspacesHandler } from '../controllers/workspaces.controller';
import { asyncHandler } from '../utils/asyncHandler';

export const workspacesRouter = Router();

workspacesRouter.get('/', requireAuth, requireActiveSubscription, asyncHandler(listWorkspacesHandler));
workspacesRouter.post(
  '/',
  requireAuth,
  requireActiveSubscription,
  requireRole(['ADMIN', 'MANAGER']),
  validateBody(createWorkspaceSchema),
  asyncHandler(createWorkspaceHandler)
);
