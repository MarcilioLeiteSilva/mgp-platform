import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import * as crypto from 'crypto';
import { ApiKeyAuthGuard } from '../guards/api-key-auth.guard';
import { PublicApiScope } from '../decorators/public-api-scope.decorator';
import { ApiKeyMeta, RequestApiKeyMeta } from '../decorators/api-key-meta.decorator';
import {
  PublicAsoAppQueryDto,
  PublicAsoEstimatesQueryDto,
  PublicTrendsQueryDto,
  PublicKeywordRankingQueryDto,
} from '../dto/api-keys.dto';
import { PrismaService } from '../../../database/prisma.service';
import { PlayScraperEngineService } from '../../aso/services/play-scraper-engine.service';
import { AsoEstimatesService } from '../../aso/services/aso-estimates.service';
import { AsoTrendsService } from '../../aso/services/aso-trends.service';
import {
  PublicApiResponseDto,
  CategoryTrendSummaryDto,
  AsoEstimatesSummaryDto,
} from '@mgp/contracts';

@ApiTags('API Pública Comercial (v1)')
@ApiHeader({
  name: 'X-API-Key',
  required: true,
  description: 'Chave de API comercial (formato: mgp_live_...)',
})
@UseGuards(ApiKeyAuthGuard)
@Controller('api/v1/public/aso')
export class PublicAsoController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly playScraper: PlayScraperEngineService,
    private readonly estimatesService: AsoEstimatesService,
    private readonly trendsService: AsoTrendsService,
  ) {}

  @Get('apps/:appId')
  @PublicApiScope('aso:read')
  @ApiOperation({
    summary: 'Consultar metadados e score ASO de um aplicativo',
    description:
      'Retorna metadados oficiais da Google Play Store (título, desenvolvedor, score, downloads mínimos e categoria).',
  })
  @ApiParam({
    name: 'appId',
    description: 'Package name do aplicativo (ex: com.whatsapp, com.nu.production)',
  })
  @ApiResponse({
    status: 200,
    description: 'Metadados consolidados do aplicativo.',
  })
  async getAppDetails(
    @Param('appId') appId: string,
    @Query() query: PublicAsoAppQueryDto,
    @ApiKeyMeta() meta: RequestApiKeyMeta,
  ): Promise<PublicApiResponseDto<any>> {
    const country = (query.country || 'BR').toLowerCase();

    // 1. Tenta buscar no banco de dados primeiro
    const dbApp = await this.prisma.asoApp.findFirst({
      where: { appId, country },
    });

    if (dbApp) {
      return this.wrapResponse(
        {
          id: dbApp.id,
          appId: dbApp.appId,
          title: dbApp.title,
          developer: dbApp.developer,
          icon: dbApp.icon,
          genre: dbApp.genre,
          genreId: dbApp.genreId,
          score: dbApp.score ? Number(dbApp.score) : null,
          ratings: dbApp.ratings,
          reviews: dbApp.reviews,
          minInstalls: dbApp.minInstalls ? Number(dbApp.minInstalls) : 0,
          country: dbApp.country,
          source: 'catalog',
          lastSyncedAt: dbApp.lastScrapedAt,
        },
        meta,
      );
    }

    // 2. Se não estiver no catálogo, consulta ao vivo via scraper
    try {
      const liveData = await this.playScraper.getApp(appId, {
        country,
        lang: country === 'br' ? 'pt-BR' : 'en',
      });

      return this.wrapResponse(
        {
          appId: liveData.appId,
          title: liveData.title,
          developer: liveData.developer,
          icon: liveData.icon,
          genre: liveData.genre,
          genreId: liveData.genreId,
          score: liveData.score,
          ratings: liveData.ratings,
          reviews: liveData.reviews,
          minInstalls: liveData.minInstalls,
          country,
          source: 'live_play_store',
          lastSyncedAt: new Date().toISOString(),
        },
        meta,
      );
    } catch (err: any) {
      throw new NotFoundException(`Aplicativo "${appId}" não encontrado na Google Play Store.`);
    }
  }

  @Get('apps/:appId/estimates')
  @PublicApiScope('estimates:read')
  @ApiOperation({
    summary: 'Consultar estimativas preditivas de downloads e faturamento',
    description:
      'Retorna projeções de downloads diários/mensais e receita financeira com bandas de confiança (min, mediana e max) baseadas em distribuição de Pareto/Power-Law.',
  })
  @ApiParam({
    name: 'appId',
    description: 'Package name do aplicativo (ex: com.nu.production)',
  })
  @ApiResponse({
    status: 200,
    description: 'Estimativas preditivas e série temporal histórica.',
  })
  async getAppEstimates(
    @Param('appId') appId: string,
    @Query() query: PublicAsoEstimatesQueryDto,
    @ApiKeyMeta() meta: RequestApiKeyMeta,
  ): Promise<PublicApiResponseDto<AsoEstimatesSummaryDto>> {
    const country = (query.country || 'BR').toLowerCase();
    const days = query.days || 30;

    // Localiza ou garante registro do app no tenant para histórico
    let app = await this.prisma.asoApp.findFirst({
      where: { appId, organizationId: meta.organizationId },
    });

    if (!app) {
      // Cria temporariamente ou associa para cálculo determinístico
      const liveData = await this.playScraper.getApp(appId, {
        country,
      });

      app = await this.prisma.asoApp.create({
        data: {
          organizationId: meta.organizationId,
          appId,
          title: liveData.title,
          developer: liveData.developer || 'Desenvolvedor',
          icon: liveData.icon || '',
          genre: liveData.genre || 'GERAL',
          genreId: liveData.genreId || 'OVERALL',
          score: liveData.score || 4.2,
          ratings: liveData.ratings || 1000,
          reviews: liveData.reviews || 250,
          minInstalls: BigInt(liveData.minInstalls || 10000),
          country,
          lang: 'pt-BR',
          isMonitored: false,
          isCompetitor: true,
          metadata: {
            categoryRank: 15,
          },
        },
      });

      // Gera primeira estimativa atômica
      await this.estimatesService.calculateAndSaveEstimate(app.id, meta.organizationId, {
        country: country.toUpperCase(),
      });
    }

    const summary = await this.estimatesService.getEstimatesSummary(
      app.id,
      meta.organizationId,
      { days, country },
    );

    return this.wrapResponse(summary, meta);
  }

  @Get('trends/categories/:category')
  @PublicApiScope('trends:read')
  @ApiOperation({
    summary: 'Consultar tendências de mercado e aplicativos em ascensão (Breakouts)',
    description:
      'Retorna índice de crescimento setorial, top breakouts com pontuação de ascensão e palavras-chave emergentes da categoria.',
  })
  @ApiParam({
    name: 'category',
    description: 'Categoria da Play Store (ex: FINANCE, GAME, SHOPPING, TOOLS)',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumo setorial de tendências de mercado.',
  })
  async getCategoryTrends(
    @Param('category') category: string,
    @Query() query: PublicTrendsQueryDto,
    @ApiKeyMeta() meta: RequestApiKeyMeta,
  ): Promise<PublicApiResponseDto<CategoryTrendSummaryDto>> {
    const country = query.country || 'BR';
    const trends = await this.trendsService.getCategoryTrends(
      category.toUpperCase(),
      country,
      meta.organizationId,
    );

    return this.wrapResponse(trends, meta);
  }

  @Get('keywords/ranking')
  @PublicApiScope('aso:read')
  @ApiOperation({
    summary: 'Consultar posição de ranking orgânico de um app para palavra-chave',
    description:
      'Pesquisa na Google Play Store a posição exata em que o aplicativo aparece para o termo buscado.',
  })
  @ApiResponse({
    status: 200,
    description: 'Posição no ranking e top concorrentes imediatos.',
  })
  async getKeywordRanking(
    @Query() query: PublicKeywordRankingQueryDto,
    @ApiKeyMeta() meta: RequestApiKeyMeta,
  ): Promise<PublicApiResponseDto<any>> {
    const results = await this.playScraper.search(query.keyword, {
      country: query.country || 'br',
      num: 50,
    });

    const index = results.findIndex((item: any) => item.appId === query.appId);
    const rank = index >= 0 ? index + 1 : null;

    return this.wrapResponse(
      {
        keyword: query.keyword,
        appId: query.appId,
        country: query.country || 'BR',
        rank,
        isRanked: rank !== null,
        topRankedApp: results[0] ? results[0].appId : null,
        totalResultsAnalyzed: results.length,
      },
      meta,
    );
  }

  private wrapResponse<T>(data: T, meta: RequestApiKeyMeta): PublicApiResponseDto<T> {
    return {
      success: true,
      data,
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        version: 'v1',
        quotaUsed: meta.quotaUsed,
        quotaRemaining: meta.quotaRemaining,
      },
    };
  }
}
