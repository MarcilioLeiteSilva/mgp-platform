import { PrismaClient } from '@mgp/database';
import { Queue } from 'bullmq';
import {
  AsoJobResult,
  AsoJobType,
  CheckKeywordRankJobPayload,
  DispatchDailyRankingsJobPayload,
} from '@mgp/contracts';
import { WORKER_CONFIG } from '../config/worker.config';

export async function handleDispatchDailyRankings(
  payload: DispatchDailyRankingsJobPayload,
  deps: {
    prisma: PrismaClient;
    queue: Queue;
  },
): Promise<AsoJobResult> {
  const startTime = Date.now();
  const { organizationId } = payload;

  const activeKeywords = await deps.prisma.asoAppKeyword.findMany({
    where: {
      isActive: true,
      ...(organizationId ? { asoApp: { organizationId } } : {}),
    },
    include: {
      asoApp: true,
      keyword: true,
    },
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  let dispatchedCount = 0;

  for (let i = 0; i < activeKeywords.length; i++) {
    const item = activeKeywords[i];
    const jobPayload: CheckKeywordRankJobPayload = {
      asoAppId: item.asoAppId,
      appKeywordId: item.id,
      keyword: item.keyword.keyword,
      appId: item.asoApp.appId,
      country: item.asoApp.country,
      lang: item.asoApp.lang,
      organizationId: item.asoApp.organizationId,
    };

    const delayMs = i * WORKER_CONFIG.PACING_BETWEEN_BATCH_JOBS_MS;
    const jobId = `rank-check-${item.id}-${todayStr}`;

    await deps.queue.add(AsoJobType.CHECK_KEYWORD_RANK, jobPayload, {
      delay: delayMs,
      jobId, // Idempotência diária para a mesma palavra-chave
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
    jobType: AsoJobType.DISPATCH_DAILY_RANKINGS,
    message: `Disparada a verificação diária de rankings para ${dispatchedCount} palavras-chave ativas.`,
    data: {
      totalDispatched: dispatchedCount,
      targetOrganization: organizationId || 'ALL',
      date: todayStr,
    },
    processedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
  };
}

