import type { Request, Response } from 'express';
import { ok } from '../utils/apiResponse';
import { HttpError } from '../utils/httpError';
import { createUser, listUsers, patchUser } from '../services/users.service';

export async function listUsersHandler(req: Request, res: Response) {
  const businessId = req.auth?.businessId;
  if (!businessId) throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
  const users = await listUsers(businessId);
  res.json(ok(users));
}

export async function createUserHandler(req: Request, res: Response) {
  const businessId = req.auth?.businessId;
  if (!businessId) throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
  const user = await createUser(businessId, req.body);
  res.status(201).json(ok(user));
}

export async function patchUserHandler(req: Request, res: Response) {
  const businessId = req.auth?.businessId;
  if (!businessId) throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) throw new HttpError(400, 'INVALID_ID', 'Invalid user id');
  const user = await patchUser(businessId, id, req.body);
  res.json(ok(user));
}

