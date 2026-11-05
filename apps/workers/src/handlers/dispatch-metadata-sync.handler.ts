import { PrismaClient } from '@mgp/database';
import { Queue } from 'bullmq';
import {
  AsoJobResult,
  AsoJobType,
  DispatchMetadataSyncJobPayload,
  SyncAppMetadataJobPayload,
} from '@mgp/contracts';
import { WORKER_CONFIG } from '../config/worker.config';

export async function handleDispatchMetadataSync(
  payload: DispatchMetadataSyncJobPayload,
  deps: {
    prisma: PrismaClient;
    queue: Queue;
  },
): Promise<AsoJobResult> {
  const startTime = Date.now();
  const { organizationId } = payload;

  const monitoredApps = await deps.prisma.asoApp.findMany({
    where: {
      isMonitored: true,
      ...(organizationId ? { organizationId } : {}),
    },
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  let dispatchedCount = 0;

  for (let i = 0; i < monitoredApps.length; i++) {
    const app = monitoredApps[i];
    const jobPayload: SyncAppMetadataJobPayload = {
      asoAppId: app.id,
      organizationId: app.organizationId,
      forceAudit: true,
    };

    const delayMs = i * (WORKER_CONFIG.PACING_BETWEEN_BATCH_JOBS_MS * 2);
    const jobId = `sync-meta-${app.id}-${todayStr}`;

    await deps.queue.add(AsoJobType.SYNC_APP_METADATA, jobPayload, {
      delay: delayMs,
      jobId, // Evita re-sincronizações redundantes no mesmo dia
      attempts: WORKER_CONFIG.DEFAULT_JOB_ATTEMPTS,
      backoff: {
        type: 'exponential',
        delay: WORKER_CONFIG.DEFAULT_BACKOFF_DELAY_MS,
      },
      removeOnComplete: true,
    });

    dispatchedCount++;
  }

  return {
    success: true,
    jobType: AsoJobType.DISPATCH_METADATA_SYNC,
    message: `Disparada a sincronização de metadados para ${dispatchedCount} aplicativos monitorados.`,
    data: {
      totalDispatched: dispatchedCount,
      targetOrganization: organizationId || 'ALL',
      date: todayStr,
    },
    processedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
  };
}

