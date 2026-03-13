import type { Request, Response } from 'express';
import { ok } from '../utils/apiResponse';
import { listPlans } from '../services/plans.service';

export async function listPlansHandler(_req: Request, res: Response) {
  const plans = await listPlans();
  res.json(ok(plans));
}

