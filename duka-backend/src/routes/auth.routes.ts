import { Router } from 'express';
import { validateBody } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { adminLoginSchema, passwordResetConfirmSchema, passwordResetRequestSchema, signupSchema, staffLoginSchema } from '../validators/auth.validators';
import {
  loginAdminHandler,
  loginStaffHandler,
  logoutHandler,
  meHandler,
  passwordResetConfirmHandler,
  passwordResetRequestHandler,
  signupHandler
} from '../controllers/auth.controller';
import { asyncHandler } from '../utils/asyncHandler';

export const authRouter = Router();

authRouter.post('/signup', validateBody(signupSchema), asyncHandler(signupHandler));
authRouter.post('/login/admin', validateBody(adminLoginSchema), asyncHandler(loginAdminHandler));
authRouter.post('/login/staff', validateBody(staffLoginSchema), asyncHandler(loginStaffHandler));
authRouter.post('/logout', asyncHandler(logoutHandler));
authRouter.get('/me', requireAuth, asyncHandler(meHandler));
authRouter.post('/password-reset/request', validateBody(passwordResetRequestSchema), asyncHandler(passwordResetRequestHandler));
authRouter.post('/password-reset/confirm', validateBody(passwordResetConfirmSchema), asyncHandler(passwordResetConfirmHandler));
