import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { fail } from '../utils/apiResponse';
import { HttpError } from '../utils/httpError';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json(fail('VALIDATION_ERROR', 'Invalid request payload', err.flatten()));
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json(fail(err.code, err.message, err.details));
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  res.status(500).json(fail('INTERNAL_ERROR', message));
}

