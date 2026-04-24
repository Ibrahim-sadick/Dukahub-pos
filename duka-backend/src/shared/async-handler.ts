import type { NextFunction, Request, Response } from 'express';

export const asyncHandler = <TRequest extends Request = Request>(
  fn: (req: TRequest, res: Response, next: NextFunction) => Promise<unknown>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as TRequest, res, next)).catch(next);
  };
};
