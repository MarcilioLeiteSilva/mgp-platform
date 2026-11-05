import { Job, Queue } from 'bullmq';
import { PrismaClient } from '@mgp/database';
import { AsoJobResult, AsoJobType } from '@mgp/contracts';
import { WorkerScraperService } from '../services/worker-scraper.service';
import { WorkerAuditService } from '../services/worker-audit.service';
import { handleSyncAppMetadata } from '../handlers/sync-app-metadata.handler';
import { handleCheckKeywordRank } from '../handlers/check-keyword-rank.handler';
import { handleDispatchDailyRankings } from '../handlers/dispatch-daily-rankings.handler';
import { handleDispatchMetadataSync } from '../handlers/dispatch-metadata-sync.handler';
import { handleAuditApp } from '../handlers/audit-app.handler';

export class AsoSyncProcessor {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly scraper: WorkerScraperService,
    private readonly audit: WorkerAuditService,
    private readonly queue: Queue,
  ) {}

  async process(job: Job): Promise<AsoJobResult> {
    const jobType = job.name as AsoJobType;

    switch (jobType) {
      case AsoJobType.SYNC_APP_METADATA:
        return handleSyncAppMetadata(job.data, {
          prisma: this.prisma,
          scraper: this.scraper,
          audit: this.audit,
        });

      case AsoJobType.CHECK_KEYWORD_RANK:
        return handleCheckKeywordRank(job.data, {
          prisma: this.prisma,
          scraper: this.scraper,
        });

      case AsoJobType.DISPATCH_DAILY_RANKINGS:
        return handleDispatchDailyRankings(job.data, {
          prisma: this.prisma,
          queue: this.queue,
        });

      case AsoJobType.DISPATCH_METADATA_SYNC:
        return handleDispatchMetadataSync(job.data, {
          prisma: this.prisma,
          queue: this.queue,
        });

      case AsoJobType.AUDIT_APP:
        return handleAuditApp(job.data, {
          prisma: this.prisma,
          audit: this.audit,
        });

      default:
        throw new Error(`[AsoSyncProcessor] Tipo de job desconhecido ou não suportado: ${job.name}`);
    }
  }
}

