import type { Request, Response } from 'express';
import { ok } from '../utils/apiResponse';
import { signup, loginAdmin, loginStaff, logout, getMe, requestPasswordReset, confirmPasswordReset } from '../services/auth.service';
import { HttpError } from '../utils/httpError';

export async function signupHandler(req: Request, res: Response) {
  const result = await signup(req.body);
  res.status(201).json(ok(result));
}

export async function loginAdminHandler(req: Request, res: Response) {
  const result = await loginAdmin(req.body);
  res.json(ok(result));
}

export async function loginStaffHandler(req: Request, res: Response) {
  const result = await loginStaff(req.body);
  res.json(ok(result));
}

export async function logoutHandler(req: Request, res: Response) {
  const token = String(req.body?.refreshToken || '').trim();
  if (!token) throw new HttpError(400, 'MISSING_REFRESH_TOKEN', 'refreshToken is required');
  await logout(token);
  res.json(ok({}));
}

export async function meHandler(req: Request, res: Response) {
  const userId = req.auth?.userId;
  if (!userId) throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
  const result = await getMe(userId);
  res.json(ok(result));
}

export async function passwordResetRequestHandler(req: Request, res: Response) {
  const result = await requestPasswordReset(req.body);
  res.json(ok(result));
}

export async function passwordResetConfirmHandler(req: Request, res: Response) {
  const result = await confirmPasswordReset(req.body);
  res.json(ok(result));
}
