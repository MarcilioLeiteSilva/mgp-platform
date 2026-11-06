import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import {
  AD_SERVER_QUEUES,
  AdImpressionJobPayload,
  AdClickJobPayload,
} from '@mgp/contracts';

export class EventQueueService {
  private impressionQueue: Queue<AdImpressionJobPayload> | null = null;
  private clickQueue: Queue<AdClickJobPayload> | null = null;
  private redisConnection: IORedis | null = null;
  private isConnected = false;

  private metrics = {
    impressionsEnqueued: 0,
    clicksEnqueued: 0,
    failures: 0,
  };

  constructor(private readonly redisUrl: string) {
    this.initQueues();
  }

  private initQueues(): void {
    try {
      this.redisConnection = new IORedis(this.redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        connectTimeout: 2000,
        lazyConnect: true,
      });

      this.redisConnection.on('connect', () => {
        this.isConnected = true;
      });

      this.redisConnection.on('error', () => {
        this.isConnected = false;
      });

      this.redisConnection.connect().catch(() => {
        this.isConnected = false;
      });

      this.impressionQueue = new Queue<AdImpressionJobPayload>(
        AD_SERVER_QUEUES.IMPRESSIONS,
        {
          connection: this.redisConnection,
          defaultJobOptions: {
            removeOnComplete: 1000,
            removeOnFail: 5000,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          },
        },
      );

      this.clickQueue = new Queue<AdClickJobPayload>(AD_SERVER_QUEUES.CLICKS, {
        connection: this.redisConnection,
        defaultJobOptions: {
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      });
    } catch {
      this.isConnected = false;
    }
  }

  async enqueueImpression(payload: AdImpressionJobPayload): Promise<boolean> {
    try {
      if (this.impressionQueue && this.isConnected) {
        await this.impressionQueue.add(
          `impression_${payload.nonce}`,
          payload,
          {
            jobId: `imp_${payload.nonce}`,
          },
        );
      }
      this.metrics.impressionsEnqueued++;
      return true;
    } catch {
      this.metrics.failures++;
      // Falha não derruba a resposta HTTP (204 No Content garantido com degradação graciosa)
      return false;
    }
  }

  async enqueueClick(payload: AdClickJobPayload): Promise<boolean> {
    try {
      if (this.clickQueue && this.isConnected) {
        await this.clickQueue.add(
          `click_${payload.nonce}`,
          payload,
          {
            jobId: `clk_${payload.nonce}`,
          },
        );
      }
      this.metrics.clicksEnqueued++;
      return true;
    } catch {
      this.metrics.failures++;
      return false;
    }
  }

  getMetrics() {
    return { ...this.metrics };
  }

  async close(): Promise<void> {
    try {
      if (this.impressionQueue) await this.impressionQueue.close();
      if (this.clickQueue) await this.clickQueue.close();
      if (this.redisConnection) await this.redisConnection.quit();
    } catch {
      // Ignora erro no shutdown
    }
  }
}
