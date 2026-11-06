import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { AppConfigService } from '../../../config/app-config.service';
import { TELEMETRY_QUEUES, TelemetryBatchJobPayload } from '@mgp/contracts';

export interface TelemetryQueueMetrics {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  isPaused: boolean;
}

@Injectable()
export class TelemetryQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelemetryQueueService.name);
  private queue: Queue | null = null;
  private redisConnection: IORedis | null = null;
  private readonly inMemoryJobs: TelemetryBatchJobPayload[] = [];

  constructor(private readonly config: AppConfigService) {}

  /**
   * Permite injetar uma fila mockada para suítes de testes unitários.
   */
  setQueueClient(queue: any): void {
    this.queue = queue;
  }

  onModuleInit() {
    if (this.queue) {
      return;
    }

    try {
      this.redisConnection = new IORedis(this.config.redisUrl, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        retryStrategy: (times) => Math.min(times * 100, 3000),
      });

      this.queue = new Queue(TELEMETRY_QUEUES.INGESTION, {
        connection: this.redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      });

      this.logger.log(`Fila assíncrona "${TELEMETRY_QUEUES.INGESTION}" inicializada com sucesso.`);
    } catch (err: any) {
      this.logger.warn(`Não foi possível conectar ao Redis para fila de telemetria: ${err.message}. Operando em buffer de memória.`);
    }
  }

  async onModuleDestroy() {
    if (this.queue) {
      await this.queue.close();
      this.queue = null;
    }
    if (this.redisConnection) {
      this.redisConnection.disconnect();
      this.redisConnection = null;
    }
  }

  /**
   * Enfileira um lote de telemetria para processamento assíncrono pelos workers.
   */
  async enqueueBatch(payload: TelemetryBatchJobPayload): Promise<{ jobId: string }> {
    const jobName = `telemetry-batch-${payload.batchId}`;

    if (this.queue) {
      try {
        const job = await this.queue.add(jobName, payload, {
          jobId: `job_${payload.batchId}`,
        });
        return { jobId: job.id || jobName };
      } catch (err: any) {
        this.logger.warn(`Falha ao adicionar job na fila Redis: ${err.message}. Mantendo em buffer local.`);
      }
    }

    this.inMemoryJobs.push(payload);
    return { jobId: `mem_${payload.batchId}` };
  }

  /**
   * Retorna métricas operacionais e contagens de jobs da fila de telemetria.
   */
  async getMetrics(): Promise<TelemetryQueueMetrics> {
    if (!this.queue) {
      return {
        queueName: TELEMETRY_QUEUES.INGESTION,
        waiting: this.inMemoryJobs.length,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        isPaused: false,
      };
    }

    try {
      const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
        this.queue.isPaused(),
      ]);

      return {
        queueName: TELEMETRY_QUEUES.INGESTION,
        waiting,
        active,
        completed,
        failed,
        delayed,
        isPaused,
      };
    } catch (err: any) {
      this.logger.warn(`Erro ao obter métricas da fila de telemetria: ${err.message}`);
      return {
        queueName: TELEMETRY_QUEUES.INGESTION,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        isPaused: false,
      };
    }
  }
}

