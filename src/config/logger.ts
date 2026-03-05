import pino from 'pino';
import { env } from './env.js';

export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport: env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:yyyy-mm-dd HH:MM:ss' } }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  base: { service: 'letsmeet-api' },
});

export function createChildLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
