import { Router } from 'express';
import { createRateLimiter } from '../../middleware/rate-limit';
import { requireAuth } from '../../middleware/auth';
import { asyncHandler } from '../../shared/async-handler';
import { ApiError } from '../../shared/errors';
import type { AuthenticatedRequest } from '../../shared/types';
import { clearSessionCookies, setSessionCookies } from './auth.cookies';
import {
  checkOwnerPhoneAvailability,
  confirmOwnerPasswordReset,
  getCurrentUser,
  loginOwner,
  logoutSession,
  refreshSession,
  registerOwner,
  requestOwnerPasswordReset
} from './auth.service';
import {
  ownerLoginSchema,
  passwordResetConfirmSchema,
  passwordResetRequestSchema,
  phoneAvailabilitySchema,
  refreshSchema,
  registerOwnerSchema
} from './auth.schemas';

export const authRouter = Router();

const phoneRateLimitKey = (req: { body?: { phone?: string } }) => {
  return String(req.body?.phone || '').replace(/[^0-9]/g, '') || 'anonymous';
};

const phoneCheckLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyPrefix: 'auth-check-phone',
  keyGenerator: phoneRateLimitKey,
  message: 'Too many phone availability checks. Please wait before trying again.',
  code: 'PHONE_CHECK_RATE_LIMITED'
});

const ownerLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: 'auth-login-owner',
  keyGenerator: phoneRateLimitKey,
  message: 'Too many login attempts. Please wait before trying again.',
  code: 'OWNER_LOGIN_RATE_LIMITED'
});

const staffLoginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: 'auth-login-staff',
  keyGenerator: phoneRateLimitKey,
  message: 'Too many staff login attempts. Please wait before trying again.',
  code: 'STAFF_LOGIN_RATE_LIMITED'
});

const refreshLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyPrefix: 'auth-refresh',
  message: 'Too many session refresh attempts. Please wait before trying again.',
  code: 'REFRESH_RATE_LIMITED'
});

const passwordResetRequestLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyPrefix: 'auth-password-reset-request',
  keyGenerator: phoneRateLimitKey,
  message: 'Too many password reset requests. Please wait before requesting another code.',
  code: 'PASSWORD_RESET_REQUEST_RATE_LIMITED'
});

const passwordResetConfirmLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyPrefix: 'auth-password-reset-confirm',
  keyGenerator: phoneRateLimitKey,
  message: 'Too many password reset attempts. Please wait before trying again.',
  code: 'PASSWORD_RESET_CONFIRM_RATE_LIMITED'
});

authRouter.post(
  '/check-phone',
  phoneCheckLimiter,
  asyncHandler(async (req, res) => {
    const payload = phoneAvailabilitySchema.parse(req.body);
    const result = await checkOwnerPhoneAvailability(payload.phone);
    res.json({ success: true, message: result.message, data: result });
  })
);

authRouter.post(
  '/register-owner',
  asyncHandler(async (req, res) => {
    const payload = registerOwnerSchema.parse(req.body);
    const result = await registerOwner(payload);
    setSessionCookies(res, result.accessToken, result.refreshToken);
    res.status(201).json({ success: true, message: 'Owner account created', data: result });
  })
);

authRouter.post(
  '/login/owner',
  ownerLoginLimiter,
  asyncHandler(async (req, res) => {
    const payload = ownerLoginSchema.parse(req.body);
    const result = await loginOwner(payload.phone, payload.password);
    setSessionCookies(res, result.accessToken, result.refreshToken);
    res.json({ success: true, message: 'Login successful', data: result });
  })
);

authRouter.post(
  '/login/staff',
  staffLoginLimiter,
  asyncHandler(async (req, res) => {
    void req;
    void res;
    throw new ApiError(410, 'Staff login has been removed from this system', 'STAFF_LOGIN_REMOVED');
  })
);

authRouter.post(
  '/refresh',
  refreshLimiter,
  asyncHandler(async (req, res) => {
    const payload = refreshSchema.safeParse({
      refreshToken: req.body?.refreshToken || req.cookies?.dh_refresh_token || ''
    });
    if (!payload.success) {
      throw new ApiError(401, 'Refresh token is required', 'REFRESH_TOKEN_REQUIRED');
    }
    const result = await refreshSession(payload.data.refreshToken);
    setSessionCookies(res, result.accessToken, result.refreshToken);
    res.json({ success: true, message: 'Token refreshed', data: result });
  })
);

authRouter.post(
  '/password-reset/request',
  passwordResetRequestLimiter,
  asyncHandler(async (req, res) => {
    const payload = passwordResetRequestSchema.parse(req.body);
    const result = await requestOwnerPasswordReset(payload.phone, payload.otp);
    res.json({ success: true, message: 'Password reset challenge created', data: result });
  })
);

authRouter.post(
  '/password-reset/confirm',
  passwordResetConfirmLimiter,
  asyncHandler(async (req, res) => {
    const payload = passwordResetConfirmSchema.parse(req.body);
    const result = await confirmOwnerPasswordReset(payload);
    res.json({ success: true, message: 'Password reset successful', data: result });
  })
);

authRouter.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await logoutSession(String(req.auth?.sessionId || ''), String(req.auth?.userId || ''), String(req.auth?.businessId || ''));
    clearSessionCookies(res);
    res.json({ success: true, message: 'Logout successful' });
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const currentUser = await getCurrentUser(String(req.auth?.userId || ''));
    res.json({ success: true, data: { currentUser } });
  })
);
