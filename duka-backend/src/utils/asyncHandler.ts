import type { NextFunction, Request, Response } from 'express';

export function asyncHandler<TReq extends Request = Request, TRes extends Response = Response>(
  fn: (req: TReq, res: TRes, next: NextFunction) => unknown | Promise<unknown>
) {
  return (req: TReq, res: TRes, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
