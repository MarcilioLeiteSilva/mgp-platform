import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { TELEMETRY_QUEUES, TelemetryBatchJobPayload } from '@mgp/contracts';
import { WORKER_CONFIG } from '../config/worker.config';
import { TelemetryProcessor } from '../processors/telemetry.processor';
import { TelemetryBatchProcessResult } from '../handlers/process-telemetry-batch.handler';

export function createTelemetryWorker(
  connection: IORedis,
  processor: TelemetryProcessor,
): Worker<TelemetryBatchJobPayload, TelemetryBatchProcessResult> {
  const worker = new Worker<TelemetryBatchJobPayload, TelemetryBatchProcessResult>(
    TELEMETRY_QUEUES.INGESTION,
    async (job: Job<TelemetryBatchJobPayload>) => {
      return processor.process(job);
    },
    {
      connection,
      concurrency: WORKER_CONFIG.CONCURRENCY,
    },
  );

  worker.on('active', (job: Job) => {
    console.info(`[TelemetryWorker] Processando lote de telemetria [${job.id}] (Batch: ${job.data?.batchId})`);
  });

  worker.on('completed', (job: Job, result: TelemetryBatchProcessResult) => {
    console.info(`[TelemetryWorker] Concluído lote [${job.id}] - Sessões: ${result.sessionsUpdated}, Eventos: ${result.eventsInserted}`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.error(`[TelemetryWorker] Falha no job [${job?.id}]: ${err.message}`);
  });

  return worker;
}

