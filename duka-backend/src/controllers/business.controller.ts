import type { Request, Response } from 'express';
import { ok } from '../utils/apiResponse';
import { HttpError } from '../utils/httpError';
import { getBusinessMe } from '../services/business.service';

export async function businessMeHandler(req: Request, res: Response) {
  const businessId = req.auth?.businessId;
  if (!businessId) throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
  const business = await getBusinessMe(businessId);
  res.json(ok(business));
}

