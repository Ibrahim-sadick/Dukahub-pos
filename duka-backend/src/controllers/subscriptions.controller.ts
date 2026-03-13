import type { Request, Response } from 'express';
import { ok } from '../utils/apiResponse';
import { HttpError } from '../utils/httpError';
import { confirmPayment, getCurrentSubscription, selectPlan } from '../services/subscriptions.service';

export async function currentSubscriptionHandler(req: Request, res: Response) {
  const businessId = req.auth?.businessId;
  if (!businessId) throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
  const sub = await getCurrentSubscription(businessId);
  res.json(ok(sub));
}

export async function selectPlanHandler(req: Request, res: Response) {
  const businessId = req.auth?.businessId;
  if (!businessId) throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
  const sub = await selectPlan(businessId, req.body);
  res.status(201).json(ok(sub));
}

export async function confirmPaymentHandler(req: Request, res: Response) {
  const businessId = req.auth?.businessId;
  if (!businessId) throw new HttpError(401, 'UNAUTHORIZED', 'Not authenticated');
  const result = await confirmPayment(businessId, req.body);
  res.status(201).json(ok(result));
}
