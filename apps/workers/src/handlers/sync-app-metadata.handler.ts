import { PrismaClient } from '@mgp/database';
import {
  AsoJobResult,
  AsoJobType,
  SyncAppMetadataJobPayload,
} from '@mgp/contracts';
import { WorkerScraperService } from '../services/worker-scraper.service';
import { WorkerAuditService } from '../services/worker-audit.service';

export async function handleSyncAppMetadata(
  payload: SyncAppMetadataJobPayload,
  deps: {
    prisma: PrismaClient;
    scraper: WorkerScraperService;
    audit: WorkerAuditService;
  },
): Promise<AsoJobResult> {
  const startTime = Date.now();
  const { asoAppId, organizationId, forceAudit = true } = payload;

  const app = await deps.prisma.asoApp.findFirst({
    where: {
      id: asoAppId,
      ...(organizationId ? { organizationId } : {}),
    },
  });

  if (!app) {
    throw new Error(`[SyncAppMetadata] Aplicativo id="${asoAppId}" não encontrado na organização.`);
  }

  // Coleta dados atualizados da Play Store
  const scraped = await deps.scraper.getApp(app.appId, app.country, app.lang);

  // Atualiza entidade AsoApp
  const updatedApp = await deps.prisma.asoApp.update({
    where: { id: app.id },
    data: {
      title: scraped.title || app.title,
      developer: scraped.developer || app.developer,
      developerId: scraped.developerId || app.developerId,
      icon: scraped.icon || app.icon,
      genre: scraped.genre || app.genre,
      genreId: scraped.genreId || app.genreId,
      score: scraped.score !== undefined ? scraped.score : app.score,
      ratings: scraped.ratings !== undefined ? scraped.ratings : app.ratings,
      reviews: scraped.reviews !== undefined ? scraped.reviews : app.reviews,
      minInstalls: scraped.minInstalls || app.minInstalls,
      metadata: scraped as any,
      lastScrapedAt: new Date(),
    },
  });

  let auditScoreResult = null;
  if (forceAudit) {
    const auditCalc = deps.audit.calculateAudit({
      title: updatedApp.title,
      summary: scraped.summary,
      description: scraped.description,
      icon: updatedApp.icon,
      screenshots: scraped.screenshots,
      score: updatedApp.score ? Number(updatedApp.score) : null,
      ratings: updatedApp.ratings,
    });

    auditScoreResult = await deps.prisma.asoAuditScore.create({
      data: {
        asoAppId: updatedApp.id,
        overallScore: auditCalc.overallScore,
        titleScore: auditCalc.titleScore,
        shortDescriptionScore: auditCalc.shortDescriptionScore,
        longDescriptionScore: auditCalc.longDescriptionScore,
        iconScore: auditCalc.iconScore,
        screenshotsScore: auditCalc.screenshotsScore,
        ratingsScore: auditCalc.ratingsScore,
        recommendations: auditCalc.recommendations as any,
        auditDate: new Date(),
      },
    });
  }

  return {
    success: true,
    jobType: AsoJobType.SYNC_APP_METADATA,
    entityId: updatedApp.id,
    message: `Metadados do app "${updatedApp.title}" (${updatedApp.appId}) sincronizados com sucesso.`,
    data: {
      appId: updatedApp.appId,
      title: updatedApp.title,
      score: updatedApp.score ? Number(updatedApp.score) : null,
      ratings: updatedApp.ratings,
      overallAuditScore: auditScoreResult?.overallScore,
    },
    processedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
  };
}
