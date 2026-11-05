import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { PlayScraperEngineService } from './play-scraper-engine.service';
import { AsoAuditService } from './aso-audit.service';
import { ListAsoAppsQueryDto, TrackAppDto } from '../dto';
import { AppPlatform } from '@mgp/database';

@Injectable()
export class AsoAppsService {
  private readonly logger = new Logger(AsoAppsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scraper: PlayScraperEngineService,
    private readonly auditService: AsoAuditService,
  ) {}

  /**
   * Cadastra e inicia o monitoramento de um aplicativo para a organização.
   * Coleta dados frescos na Google Play Store e executa a primeira auditoria ASO.
   */
  async trackApp(organizationId: string, dto: TrackAppDto) {
    const cleanAppId = dto.appId.trim();
    const country = dto.country || 'br';
    const lang = dto.lang || 'pt-BR';
    const platform = dto.platform || AppPlatform.ANDROID;

    // 1. Verifica se já está monitorado para este tenant
    const existing = await this.prisma.asoApp.findUnique({
      where: {
        organizationId_appId_country_lang: {
          organizationId,
          appId: cleanAppId,
          country,
          lang,
        },
      },
    });

    if (existing) {
      if (existing.isMonitored) {
        throw new ConflictException(
          `O aplicativo "${cleanAppId}" já está ativo no monitoramento da organização.`,
        );
      }

      // Reativa monitoramento
      const reactivated = await this.prisma.asoApp.update({
        where: { id: existing.id },
        data: { isMonitored: true },
      });
      return reactivated;
    }

    // 2. Coleta metadados reais na Play Store via Scraper Engine
    const playData = await this.scraper.getApp(cleanAppId, {
      country,
      lang,
    });

    // 3. Persistência no banco relacional
    const createdApp = await this.prisma.asoApp.create({
      data: {
        organizationId,
        appId: cleanAppId,
        platform,
        title: playData.title || cleanAppId,
        developer: playData.developer || 'Desconhecido',
        developerId: playData.developerId || undefined,
        icon: playData.icon || 'https://placehold.co/512x512/0f172a/38bdf8?text=App',
        genre: playData.genre || 'Geral',
        genreId: playData.genreId || 'APPLICATION',
        score: playData.score || 0,
        ratings: playData.ratings || 0,
        reviews: playData.reviews || 0,
        minInstalls: BigInt(playData.minInstalls || 0),
        isMonitored: true,
        isCompetitor: Boolean(dto.isCompetitor),
        targetAppId: dto.targetAppId || null,
        country,
        lang,
        metadata: {
          summary: playData.summary || '',
          description: playData.description || '',
          screenshots: playData.screenshots || [],
          recentChanges: playData.recentChanges || '',
          url: playData.url || '',
          offersIAP: playData.offersIAP || false,
          adSupported: playData.adSupported || false,
        },
        lastScrapedAt: new Date(),
      },
    });

    // 4. Executa auditoria inicial automatizada
    try {
      await this.auditService.runAudit(organizationId, createdApp.id);
    } catch (err: any) {
      this.logger.warn(`Falha na auditoria inicial de ${cleanAppId}: ${err.message}`);
    }

    this.logger.log(
      `Novo aplicativo monitorado: ${cleanAppId} (${createdApp.title}) para a organização ${organizationId}`,
    );

    return createdApp;
  }

  /**
   * Lista os aplicativos monitorados da organização com suporte a filtros e paginação.
   */
  async listApps(organizationId: string, query: ListAsoAppsQueryDto = {}) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      ...(query.isMonitored !== undefined && { isMonitored: query.isMonitored }),
      ...(query.isCompetitor !== undefined && { isCompetitor: query.isCompetitor }),
    };

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { appId: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.asoApp.count({ where }),
      this.prisma.asoApp.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { trackedKeywords: true },
          },
          auditScores: {
            take: 1,
            orderBy: { auditDate: 'desc' },
          },
        },
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtém detalhes de um aplicativo monitorado com validação estrita de isolamento de tenant.
   */
  async getAppById(organizationId: string, id: string) {
    const app = await this.prisma.asoApp.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        _count: {
          select: { trackedKeywords: true },
        },
        auditScores: {
          take: 1,
          orderBy: { auditDate: 'desc' },
        },
      },
    });

    if (!app) {
      throw new NotFoundException('Aplicativo monitorado não encontrado.');
    }

    return app;
  }

  /**
   * Sincroniza metadados frescos diretamente da Play Store sob demanda.
   */
  async syncApp(organizationId: string, id: string) {
    const app = await this.getAppById(organizationId, id);

    // Coleta metadados atualizados
    const freshData = await this.scraper.getApp(app.appId, {
      country: app.country,
      lang: app.lang,
    });

    const updated = await this.prisma.asoApp.update({
      where: { id: app.id },
      data: {
        title: freshData.title || app.title,
        developer: freshData.developer || app.developer,
        icon: freshData.icon || app.icon,
        genre: freshData.genre || app.genre,
        score: freshData.score || app.score,
        ratings: freshData.ratings || app.ratings,
        reviews: freshData.reviews || app.reviews,
        minInstalls: BigInt(freshData.minInstalls || 0),
        metadata: {
          summary: freshData.summary || '',
          description: freshData.description || '',
          screenshots: freshData.screenshots || [],
          recentChanges: freshData.recentChanges || '',
          url: freshData.url || '',
          offersIAP: freshData.offersIAP || false,
          adSupported: freshData.adSupported || false,
        },
        lastScrapedAt: new Date(),
      },
    });

    // Reexecuta auditoria ASO
    await this.auditService.runAudit(organizationId, app.id);

    return updated;
  }

  /**
   * Remove o monitoramento de um aplicativo.
   */
  async deleteApp(organizationId: string, id: string) {
    const app = await this.getAppById(organizationId, id);

    await this.prisma.asoApp.delete({
      where: { id: app.id },
    });

    return {
      success: true,
      message: `Monitoramento do aplicativo "${app.title}" removido com sucesso.`,
    };
  }
}

