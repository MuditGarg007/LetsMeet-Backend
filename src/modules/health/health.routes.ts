import { Router } from 'express';
import { checkDatabaseConnection } from '../../config/database.js';
import { checkRedisConnection } from '../../config/redis.js';

const router = Router();

router.get('/', async (_req, res) => {
  const [dbOk, redisOk] = await Promise.all([
    checkDatabaseConnection(),
    checkRedisConnection(),
  ]);

  const allHealthy = dbOk && redisOk;

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'ok' : 'down',
      redis: redisOk ? 'ok' : 'down',
    },
  });
});

router.head('/', async (_req, res) => {
  const [dbOk, redisOk] = await Promise.all([
    checkDatabaseConnection(),
    checkRedisConnection(),
  ]);
  res.sendStatus(dbOk && redisOk ? 200 : 503);
});

export { router as healthRouter };
