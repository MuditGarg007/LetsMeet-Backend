import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger.js';
import { AppError } from '../errors/app-error.js';
import { env } from '../../config/env.js';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const correlationId = req.correlationId;

  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err, correlationId, path: req.path }, 'Non-operational error');
    } else {
      logger.warn({ err: { message: err.message, code: err.code }, correlationId, path: req.path }, 'Operational error');
    }

    res.status(err.statusCode).json({
      ...err.toJSON(),
      instance: req.originalUrl,
      correlationId,
    });
    return;
  }

  logger.error({ err, correlationId, path: req.path }, 'Unhandled error');

  res.status(500).json({
    type: 'https://letsmeet.app/errors/internal_error',
    title: 'Internal Server Error',
    status: 500,
    detail: env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    instance: req.originalUrl,
    correlationId,
  });
}
