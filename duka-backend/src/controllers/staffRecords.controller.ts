import type { Request, Response } from 'express';
import { ok } from '../utils/apiResponse';
import { HttpError } from '../utils/httpError';
import { createStaffRecord, listStaffRecords, patchStaffRecord } from '../services/staffRecords.service';

export async function listStaffRecordsHandler(req: Request, res: Response) {
  const businessId = req.auth?.businessId;
  if (!businessId) throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
  const list = await listStaffRecords(businessId);
  res.json(ok(list));
}

export async function createStaffRecordHandler(req: Request, res: Response) {
  const businessId = req.auth?.businessId;
  if (!businessId) throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
  const created = await createStaffRecord(businessId, req.body);
  res.status(201).json(ok(created));
}

export async function patchStaffRecordHandler(req: Request, res: Response) {
  const businessId = req.auth?.businessId;
  if (!businessId) throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) throw new HttpError(400, 'INVALID_ID', 'Invalid staff record id');
  const updated = await patchStaffRecord(businessId, id, req.body);
  res.json(ok(updated));
}

