import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as mediasoup from 'mediasoup';
import { config } from './config/mediasoup.config';
import type {
  Worker as MediasoupWorker,
  Router as MediasoupRouter,
  RtpCapabilities,
} from 'mediasoup/types';

@Injectable()
export class WorkerManager implements OnModuleInit {
  private readonly logger = new Logger(WorkerManager.name);
  private worker: MediasoupWorker | null = null;
  private routers: Map<string, MediasoupRouter> = new Map();
  private isClosing = false;

  async onModuleInit(): Promise<void> {
    await this.createWorker();
  }

  async createWorker(): Promise<MediasoupWorker> {
    if (this.worker && !this.worker.closed) {
      return this.worker;
    }

    this.logger.log('Creating mediasoup Worker...');
    this.worker = await mediasoup.createWorker(config.worker);

    this.worker.on('died', () => {
      this.logger.error('mediasoup Worker died!');
      this.handleWorkerDeath().catch((error) => {
        console.error('Error handling worker death', error);
      });
    });

    this.logger.log(`mediasoup Worker created (pid: ${this.worker.pid})`);
    return this.worker;
  }

  private async handleWorkerDeath(): Promise<void> {
    if (this.isClosing) {
      return;
    }

    this.worker = null;
    this.routers.clear();

    // Attempt to restart worker after a delay
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    setTimeout(async () => {
      try {
        this.logger.log('Attempting to restart mediasoup Worker...');
        await this.createWorker();
        this.logger.log('mediasoup Worker restarted successfully');
      } catch (error) {
        this.logger.error('Failed to restart mediasoup Worker', error);
      }
    }, 2000);
  }

  async createRouter(roomId: string): Promise<MediasoupRouter> {
    const existingRouter = this.routers.get(roomId);
    if (existingRouter && !existingRouter.closed) {
      return existingRouter;
    }

    if (!this.worker || this.worker.closed) {
      throw new Error('No worker available');
    }

    this.logger.log(`Creating router for room ${roomId}`);
    const router = await this.worker.createRouter({
      mediaCodecs: config.router.mediaCodecs,
    });
    this.routers.set(roomId, router);
    this.logger.log(`Router created for room ${roomId}`);

    return router;
  }

  getRouter(roomId: string): MediasoupRouter | undefined {
    return this.routers.get(roomId);
  }

  getRtpCapabilities(roomId: string): RtpCapabilities | null {
    const router = this.routers.get(roomId);
    if (!router) {
      return null;
    }
    return router.rtpCapabilities;
  }

  async closeRouter(roomId: string): Promise<void> {
    const router = this.routers.get(roomId);
    if (router && !router.closed) {
      router.close();
      this.routers.delete(roomId);
      this.logger.log(`Router closed for room ${roomId}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.isClosing = true;
    this.logger.log('Closing WorkerManager...');

    for (const [roomId, router] of this.routers) {
      if (!router.closed) {
        router.close();
        this.logger.log(`Router closed for room ${roomId}`);
      }
    }
    this.routers.clear();

    if (this.worker && !this.worker.closed) {
      this.worker.close();
      this.logger.log('mediasoup Worker closed');
    }
  }
}
