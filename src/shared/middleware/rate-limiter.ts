import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../../config/redis.js';
import { TooManyRequestsError } from '../errors/app-error.js';
import type { Request, Response } from 'express';

function createLimiter(windowMs: number, max: number, prefix: string) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: async (...args: string[]) => {
        return redis.call(args[0], ...args.slice(1)) as any;
      },
      prefix: `ratelimit:${prefix}:`,
    }),
    handler: (_req: Request, _res: Response) => {
      throw new TooManyRequestsError();
    },
  });
}

export const generalLimiter = createLimiter(60_000, 100, 'general');
export const authLimiter = createLimiter(60_000, 10, 'auth');
