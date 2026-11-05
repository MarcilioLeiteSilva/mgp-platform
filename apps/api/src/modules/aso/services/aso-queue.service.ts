import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { AppConfigService } from '../../../config/app-config.service';
import {
  ASO_QUEUES,
  AsoJobType,
  SyncAppMetadataJobPayload,
  CheckKeywordRankJobPayload,
  DispatchDailyRankingsJobPayload,
  DispatchMetadataSyncJobPayload,
  AuditAppJobPayload,
} from '@mgp/contracts';

export interface AsoQueueMetrics {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

@Injectable()
export class AsoQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AsoQueueService.name);
  private queue: Queue | null = null;
  private redisConnection: IORedis | null = null;

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
        retryStrategy(times: number) {
          return Math.min(times * 100, 3000);
        },
      });

      this.queue = new Queue(ASO_QUEUES.SYNC, {
        connection: this.redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            age: 86400,
            count: 1000,
          },
          removeOnFail: {
            age: 604800,
            count: 5000,
          },
        },
      });

      this.logger.log(`AsoQueueService inicializado com sucesso para a fila "${ASO_QUEUES.SYNC}".`);
    } catch (err: any) {
      this.logger.error(`Erro ao inicializar conexão BullMQ: ${err.message}`);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.queue) {
        await this.queue.close();
      }
      if (this.redisConnection) {
        await this.redisConnection.quit();
      }
    } catch (err: any) {
      this.logger.warn(`Erro no shutdown do AsoQueueService: ${err.message}`);
    }
  }

  private ensureQueue(): Queue {
    if (!this.queue) {
      throw new Error('A fila BullMQ não foi inicializada corretamente.');
    }
    return this.queue;
  }

  /**
   * Enfileira sincronização assíncrona de metadados para um aplicativo.
   */
  async enqueueSyncAppMetadata(
    asoAppId: string,
    organizationId: string,
    forceAudit = true,
  ) {
    const queue = this.ensureQueue();
    const payload: SyncAppMetadataJobPayload = {
      asoAppId,
      organizationId,
      forceAudit,
    };

    const job = await queue.add(AsoJobType.SYNC_APP_METADATA, payload, {
      jobId: `sync-meta-${asoAppId}-${Date.now()}`,
    });

    this.logger.log(`Job de sincronização enfileirado: ${job.id} (App: ${asoAppId})`);
    return {
      jobId: job.id,
      jobType: AsoJobType.SYNC_APP_METADATA,
      asoAppId,
      status: 'ENQUEUED',
    };
  }

  /**
   * Enfileira verificação assíncrona de ranking de palavra-chave.
   */
  async enqueueCheckKeywordRank(payload: CheckKeywordRankJobPayload) {
    const queue = this.ensureQueue();
    const job = await queue.add(AsoJobType.CHECK_KEYWORD_RANK, payload, {
      jobId: `rank-check-${payload.appKeywordId}-${Date.now()}`,
    });

    this.logger.log(`Job de ranking enfileirado: ${job.id} (Keyword: ${payload.keyword})`);
    return {
      jobId: job.id,
      jobType: AsoJobType.CHECK_KEYWORD_RANK,
      appKeywordId: payload.appKeywordId,
      status: 'ENQUEUED',
    };
  }

  /**
   * Enfileira disparo em lote de checagem diária de rankings.
   */
  async enqueueDailyRankingsDispatch(organizationId?: string) {
    const queue = this.ensureQueue();
    const payload: DispatchDailyRankingsJobPayload = { organizationId };

    const job = await queue.add(AsoJobType.DISPATCH_DAILY_RANKINGS, payload, {
      jobId: `dispatch-rankings-${organizationId || 'all'}-${Date.now()}`,
    });

    this.logger.log(`Job de lote de rankings enfileirado: ${job.id}`);
    return {
      jobId: job.id,
      jobType: AsoJobType.DISPATCH_DAILY_RANKINGS,
      targetOrganization: organizationId || 'ALL',
      status: 'ENQUEUED',
    };
  }

  /**
   * Enfileira disparo em lote de sincronização de metadados de apps monitorados.
   */
  async enqueueMetadataSyncDispatch(organizationId?: string) {
    const queue = this.ensureQueue();
    const payload: DispatchMetadataSyncJobPayload = { organizationId };

    const job = await queue.add(AsoJobType.DISPATCH_METADATA_SYNC, payload, {
      jobId: `dispatch-metadata-${organizationId || 'all'}-${Date.now()}`,
    });

    this.logger.log(`Job de lote de metadados enfileirado: ${job.id}`);
    return {
      jobId: job.id,
      jobType: AsoJobType.DISPATCH_METADATA_SYNC,
      targetOrganization: organizationId || 'ALL',
      status: 'ENQUEUED',
    };
  }

  /**
   * Enfileira recálculo de auditoria ASO.
   */
  async enqueueAuditApp(asoAppId: string, organizationId: string) {
    const queue = this.ensureQueue();
    const payload: AuditAppJobPayload = { asoAppId, organizationId };

    const job = await queue.add(AsoJobType.AUDIT_APP, payload, {
      jobId: `audit-app-${asoAppId}-${Date.now()}`,
    });

    this.logger.log(`Job de auditoria enfileirado: ${job.id} (App: ${asoAppId})`);
    return {
      jobId: job.id,
      jobType: AsoJobType.AUDIT_APP,
      asoAppId,
      status: 'ENQUEUED',
    };
  }

  /**
   * Retorna métricas operacionais e contagens de jobs da fila no Redis.
   */
  async getQueueMetrics(): Promise<AsoQueueMetrics> {
    const queue = this.ensureQueue();
    const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused(),
    ]);

    return {
      queueName: ASO_QUEUES.SYNC,
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused,
    };
  }
}

