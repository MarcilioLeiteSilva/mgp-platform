import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import {
  AD_SERVER_QUEUES,
  AdClickJobPayload,
  AdImpressionJobPayload,
  AdRewardJobPayload,
} from '@mgp/contracts';
import { WORKER_CONFIG } from '../config/worker.config';
import { AdEventProcessResult, AdEventsProcessor } from '../processors/ad-events.processor';

export interface AdServerWorkersGroup {
  impressionsWorker: Worker<AdImpressionJobPayload, AdEventProcessResult>;
  clicksWorker: Worker<AdClickJobPayload, AdEventProcessResult>;
  rewardsWorker: Worker<AdRewardJobPayload, AdEventProcessResult>;
  closeAll: () => Promise<void>;
}

export function createAdEventsWorkers(
  connection: IORedis,
  processor: AdEventsProcessor,
): AdServerWorkersGroup {
  const impressionsWorker = new Worker<AdImpressionJobPayload, AdEventProcessResult>(
    AD_SERVER_QUEUES.IMPRESSIONS,
    async (job: Job<AdImpressionJobPayload>) => processor.processImpression(job),
    { connection, concurrency: WORKER_CONFIG.CONCURRENCY },
  );

  const clicksWorker = new Worker<AdClickJobPayload, AdEventProcessResult>(
    AD_SERVER_QUEUES.CLICKS,
    async (job: Job<AdClickJobPayload>) => processor.processClick(job),
    { connection, concurrency: WORKER_CONFIG.CONCURRENCY },
  );

  const rewardsWorker = new Worker<AdRewardJobPayload, AdEventProcessResult>(
    AD_SERVER_QUEUES.REWARDS,
    async (job: Job<AdRewardJobPayload>) => processor.processReward(job),
    { connection, concurrency: WORKER_CONFIG.CONCURRENCY },
  );

  impressionsWorker.on('completed', (job: Job, result: AdEventProcessResult) => {
    console.info(`[ImpressionsWorker] Processada impressão [${job.id}] - Req: ${result.requestId}, Custo: R$ ${result.costApplied}`);
  });

  clicksWorker.on('completed', (job: Job, result: AdEventProcessResult) => {
    console.info(`[ClicksWorker] Processado clique [${job.id}] - Req: ${result.requestId}, Custo: R$ ${result.costApplied}`);
  });

  rewardsWorker.on('completed', (job: Job, result: AdEventProcessResult) => {
    console.info(`[RewardsWorker] Processada recompensa [${job.id}] - Req: ${result.requestId}`);
  });

  return {
    impressionsWorker,
    clicksWorker,
    rewardsWorker,
    closeAll: async () => {
      await Promise.all([
        impressionsWorker.close(),
        clicksWorker.close(),
        rewardsWorker.close(),
      ]);
    },
  };
}
