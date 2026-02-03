import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidateTarget = 'body' | 'query' | 'params';

export const validate = <T>(
  schema: ZodSchema<T>,
  target: ValidateTarget = 'body'
): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = schema.parse(req[target]);
      req[target] = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error);
        return;
      }
      next(error);
    }
  };
};
