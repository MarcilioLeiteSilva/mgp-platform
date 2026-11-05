import { PrismaClient } from '@mgp/database';
import {
  AsoJobResult,
  AsoJobType,
  AuditAppJobPayload,
} from '@mgp/contracts';
import { WorkerAuditService } from '../services/worker-audit.service';

export async function handleAuditApp(
  payload: AuditAppJobPayload,
  deps: {
    prisma: PrismaClient;
    audit: WorkerAuditService;
  },
): Promise<AsoJobResult> {
  const startTime = Date.now();
  const { asoAppId, organizationId } = payload;

  const app = await deps.prisma.asoApp.findFirst({
    where: {
      id: asoAppId,
      ...(organizationId ? { organizationId } : {}),
    },
  });

  if (!app) {
    throw new Error(`[AuditApp] Aplicativo id="${asoAppId}" não encontrado.`);
  }

  const metadata: any = app.metadata || {};
  const calculated = deps.audit.calculateAudit({
    title: app.title,
    summary: metadata.summary,
    description: metadata.description,
    icon: app.icon,
    screenshots: metadata.screenshots,
    score: app.score ? Number(app.score) : null,
    ratings: app.ratings,
  });

  const record = await deps.prisma.asoAuditScore.create({
    data: {
      asoAppId: app.id,
      overallScore: calculated.overallScore,
      titleScore: calculated.titleScore,
      shortDescriptionScore: calculated.shortDescriptionScore,
      longDescriptionScore: calculated.longDescriptionScore,
      iconScore: calculated.iconScore,
      screenshotsScore: calculated.screenshotsScore,
      ratingsScore: calculated.ratingsScore,
      recommendations: calculated.recommendations as any,
      auditDate: new Date(),
    },
  });

  return {
    success: true,
    jobType: AsoJobType.AUDIT_APP,
    entityId: record.id,
    message: `Auditoria ASO recalculada para o app "${app.title}". Score: ${calculated.overallScore}/100.`,
    data: {
      overallScore: calculated.overallScore,
      recommendationsCount: calculated.recommendations.length,
      auditDate: record.auditDate,
    },
    processedAt: new Date().toISOString(),
    durationMs: Date.now() - startTime,
  };
}
