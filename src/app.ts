import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { correlationId } from './shared/middleware/correlation-id.js';
import { errorHandler } from './shared/middleware/error-handler.js';
import { generalLimiter } from './shared/middleware/rate-limiter.js';
import { NotFoundError } from './shared/errors/app-error.js';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { meetingsRouter } from './modules/meetings/meetings.routes.js';
import { chatRouter } from './modules/chat/chat.routes.js';
import { logger } from './config/logger.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(correlationId);

app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url, correlationId: req.correlationId }, 'Incoming request');
  next();
});

app.use(generalLimiter);

app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/meetings', meetingsRouter);
app.use('/api/v1/meetings', chatRouter);

app.use((_req, _res, next) => {
  next(new NotFoundError('Route not found'));
});

app.use(errorHandler);

export { app };
