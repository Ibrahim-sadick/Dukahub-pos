import type { Request, Response } from 'express';
import { fail } from '../utils/apiResponse';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json(fail('NOT_FOUND', 'Route not found'));
}

