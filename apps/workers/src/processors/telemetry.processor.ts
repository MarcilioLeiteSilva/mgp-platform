import { Job } from 'bullmq';
import { PrismaClient } from '@mgp/database';
import { TelemetryBatchJobPayload } from '@mgp/contracts';
import { handleProcessTelemetryBatch, TelemetryBatchProcessResult } from '../handlers/process-telemetry-batch.handler';

export class TelemetryProcessor {
  constructor(private readonly prisma: PrismaClient) {}

  async process(job: Job<TelemetryBatchJobPayload>): Promise<TelemetryBatchProcessResult> {
    return handleProcessTelemetryBatch(job.data, {
      prisma: this.prisma,
    });
  }
}

