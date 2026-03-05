import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from './env.js';
import { logger } from './logger.js';
import * as schema from '../shared/db/schema.js';

const sql = neon(env.DATABASE_URL);
export const db = drizzle(sql, { schema });

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    logger.info('Database connection established');
    return true;
  } catch (error) {
    logger.error({ err: error }, 'Database connection failed');
    return false;
  }
}
