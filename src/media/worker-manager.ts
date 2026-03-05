import * as mediasoup from 'mediasoup';
import { types as mediasoupTypes } from 'mediasoup';
import os from 'node:os';
import { mediasoupConfig } from '../config/mediasoup.js';
import { logger } from '../config/logger.js';

export class WorkerManager {
  private static workers: mediasoupTypes.Worker[] = [];
  private static nextWorkerIdx = 0;

  static async init() {
    // Use at most 2 workers on constrained environments, otherwise use CPU count
    const numWorkers = Math.min(os.cpus().length, 2);
    logger.info({ numWorkers }, 'Creating mediasoup workers');

    for (let i = 0; i < numWorkers; i++) {
      const worker = await mediasoup.createWorker(mediasoupConfig.worker);

      worker.on('died', (error) => {
        logger.fatal({ err: error, workerId: worker.pid }, 'mediasoup worker died — restarting');
        setTimeout(async () => {
          const idx = this.workers.indexOf(worker);
          if (idx >= 0) {
            const newWorker = await mediasoup.createWorker(mediasoupConfig.worker);
            this.workers[idx] = newWorker;
            logger.info({ workerId: newWorker.pid }, 'mediasoup worker restarted');
          }
        }, 2000);
      });

      this.workers.push(worker);
      logger.info({ workerId: worker.pid }, `mediasoup worker created`);
    }
  }

  static getNextWorker(): mediasoupTypes.Worker {
    if (this.workers.length === 0) {
      throw new Error('No mediasoup workers available');
    }
    const worker = this.workers[this.nextWorkerIdx];
    this.nextWorkerIdx = (this.nextWorkerIdx + 1) % this.workers.length;
    return worker;
  }

  static async close() {
    for (const worker of this.workers) {
      worker.close();
    }
    this.workers = [];
    logger.info('All mediasoup workers closed');
  }
}
