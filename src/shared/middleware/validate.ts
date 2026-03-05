import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from '../errors/app-error.js';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[target]);
      (req as any)[target] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = (error as any).issues?.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        })) ?? [{ field: 'unknown', message: error.message }];
        next(new BadRequestError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
}
