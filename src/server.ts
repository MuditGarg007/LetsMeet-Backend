import http from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { checkRedisConnection, redis } from './config/redis.js';
import { checkDatabaseConnection } from './config/database.js';
import { initSocketServer } from './socket/index.js';
import { WorkerManager } from './media/worker-manager.js';

async function bootstrap() {
  logger.info('Starting LetsMeet API server...');

  const dbOk = await checkDatabaseConnection();
  if (!dbOk) {
    logger.fatal('Cannot start without database connection');
    process.exit(1);
  }

  const redisOk = await checkRedisConnection();
  if (!redisOk) {
    logger.fatal('Cannot start without Redis connection');
    process.exit(1);
  }

  await WorkerManager.init();

  const server = http.createServer(app);

  initSocketServer(server);

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, `LetsMeet API listening on port ${env.PORT}`);
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Received shutdown signal');

    server.close(async () => {
      logger.info('HTTP server closed');
      await redis.quit();
      logger.info('Redis connection closed');
      await WorkerManager.close();
      logger.info('mediasoup workers closed');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — shutting down');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
