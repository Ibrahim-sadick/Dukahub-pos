import type { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { ApiError, isApiError } from '../shared/errors';

export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: error.flatten()
    });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return res.status(400).json({
      success: false,
      message: 'Database request failed',
      code: error.code,
      meta: error.meta
    });
  }

  if (isApiError(error)) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
      details: error.details
    });
  }

  const fallback = error instanceof Error ? error : new ApiError(500, 'Unexpected server error', 'INTERNAL_ERROR');

  return res.status(500).json({
    success: false,
    message: fallback.message,
    code: 'INTERNAL_ERROR',
    stack: env.NODE_ENV === 'development' ? fallback.stack : undefined
  });
};
