import type { Request, Response } from 'express';
import { ok } from '../utils/apiResponse';
import { HttpError } from '../utils/httpError';
import { createWorkspace, listWorkspaces } from '../services/workspaces.service';

export async function listWorkspacesHandler(req: Request, res: Response) {
  const businessId = req.auth?.businessId;
  if (!businessId) throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
  const list = await listWorkspaces(businessId);
  res.json(ok(list));
}

export async function createWorkspaceHandler(req: Request, res: Response) {
  const businessId = req.auth?.businessId;
  if (!businessId) throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
  const created = await createWorkspace(businessId, req.body);
  res.status(201).json(ok(created));
}

