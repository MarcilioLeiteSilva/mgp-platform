import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { ASO_QUEUES, AsoJobResult } from '@mgp/contracts';
import { WORKER_CONFIG } from '../config/worker.config';
import { AsoSyncProcessor } from '../processors/aso-sync.processor';

export function createAsoSyncQueue(connection: IORedis): Queue {
  return new Queue(ASO_QUEUES.SYNC, {
    connection,
    defaultJobOptions: {
      attempts: WORKER_CONFIG.DEFAULT_JOB_ATTEMPTS,
      backoff: {
        type: 'exponential',
        delay: WORKER_CONFIG.DEFAULT_BACKOFF_DELAY_MS,
      },
      removeOnComplete: {
        age: 86400, // Mantém jobs completados por 24 horas
        count: 1000,
      },
      removeOnFail: {
        age: 604800, // Mantém jobs com falha por 7 dias (DLQ/análise)
        count: 5000,
      },
    },
  });
}

export function createAsoSyncWorker(
  connection: IORedis,
  processor: AsoSyncProcessor,
): Worker<any, AsoJobResult> {
  const worker = new Worker<any, AsoJobResult>(
    ASO_QUEUES.SYNC,
    async (job: Job) => {
      return processor.process(job);
    },
    {
      connection,
      concurrency: WORKER_CONFIG.CONCURRENCY,
      limiter: {
        max: WORKER_CONFIG.RATE_LIMIT_MAX,
        duration: WORKER_CONFIG.RATE_LIMIT_DURATION_MS,
      },
    },
  );

  worker.on('active', (job: Job) => {
    console.info(`[Worker] Job ativo [${job.id}] - Tipo: ${job.name} (Tentativa ${job.attemptsMade + 1}/${job.opts.attempts || 1})`);
  });

  worker.on('completed', (job: Job, result: AsoJobResult) => {
    console.info(`[Worker] Job concluído com sucesso [${job.id}] - Tipo: ${job.name} em ${result.durationMs}ms`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    if (job) {
      const attemptsLeft = (job.opts.attempts || 1) - job.attemptsMade;
      console.error(
        `[Worker] Job com FALHA [${job.id}] - Tipo: ${job.name}. Erro: ${err.message}. Tentativas restantes: ${Math.max(0, attemptsLeft)}`,
      );
    } else {
      console.error(`[Worker] Job falhou sem contexto: ${err.message}`);
    }
  });

  worker.on('error', (err: Error) => {
    console.error(`[Worker] Erro operacional no Worker BullMQ (${ASO_QUEUES.SYNC}): ${err.message}`);
  });

  return worker;
}

