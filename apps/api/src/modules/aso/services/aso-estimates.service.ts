import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  AsoAppEstimateDto,
  AsoEstimatesSummaryDto,
  AsoCategoryBenchmarkDto,
  AsoEstimateRecalculateDto,
} from '@mgp/contracts';
import {
  PLAY_STORE_CATEGORY_BENCHMARKS,
  resolveCategoryBenchmark,
} from '../constants/category-benchmarks.constant';
import { AsoEstimateQueryDto, RecalculateAsoEstimateDto } from '../dto/aso-estimates.dto';

@Injectable()
export class AsoEstimatesService {
  private readonly logger = new Logger(AsoEstimatesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula e persiste a estimativa preditiva para um aplicativo ASO.
   */
  async calculateAndSaveEstimate(
    asoAppId: string,
    organizationId: string,
    dto?: RecalculateAsoEstimateDto,
  ): Promise<AsoAppEstimateDto> {
    const app = await this.prisma.asoApp.findFirst({
      where: {
        id: asoAppId,
        organizationId,
      },
      include: {
        trackedKeywords: {
          where: { isActive: true },
          take: 10,
        },
      },
    });

    if (!app) {
      throw new NotFoundException(`Aplicativo com ID "${asoAppId}" não encontrado na organização.`);
    }

    const country = (dto?.country || app.country || 'BR').toUpperCase();
    const benchmark = resolveCategoryBenchmark(app.genre || app.genreId);

    // 1. Determina base do Rank na Categoria
    let rankBasis = dto?.forceRankBasis || null;

    if (!rankBasis) {
      const metadata = (app.metadata as Record<string, any>) || {};
      if (metadata.categoryRank && typeof metadata.categoryRank === 'number') {
        rankBasis = metadata.categoryRank;
      } else {
        // Estima o rank efetivo a partir de minInstalls e avaliações
        const minInstallsNum = app.minInstalls ? Number(app.minInstalls) : 10000;
        const estimatedDailyInstalls = Math.max(30, Math.min(25000, Math.round(minInstallsNum * 0.0035)));
        // Inversa da curva de Pareto: r = (alpha / D) ^ (1 / beta)
        const inferredRank = Math.round(Math.pow(benchmark.alpha / Math.max(1, estimatedDailyInstalls), 1 / benchmark.beta));
        rankBasis = Math.max(1, Math.min(500, inferredRank));
      }
    }

    // 2. Cálculo Base de Downloads (Power-Law / Pareto: D = alpha * r ^ -beta)
    const rawDailyDownloads = benchmark.alpha * Math.pow(rankBasis, -benchmark.beta);

    // 3. Fatores de Ajuste (Traction & Review Velocity)
    const reviewsCount = app.reviews || 0;
    const ratingsCount = app.ratings || 0;
    const minInstallsNum = app.minInstalls ? Number(app.minInstalls) : 5000;

    // Review Velocity Factor (V_R) em [0.75, 1.45]
    const expectedReviews = Math.max(10, minInstallsNum * 0.015);
    const reviewRatio = reviewsCount > 0 ? reviewsCount / expectedReviews : 1.0;
    const reviewVelocityFactor = Math.max(0.75, Math.min(1.45, Number((0.85 + (reviewRatio * 0.3)).toFixed(2))));

    // Score Quality Factor (Q_R) em [0.76, 1.20]
    const appScore = app.score ? Number(app.score) : 4.0;
    const scoreFactor = Math.max(0.76, Math.min(1.20, Number((0.65 + (appScore / 5.0) * 0.55).toFixed(2))));

    // Downloads Diários Ajustados
    const adjustedDaily = rawDailyDownloads * reviewVelocityFactor * scoreFactor;

    // Delimitação realista com base no piso e teto de installs declarados
    const minDailyFloor = Math.max(5, Math.round(minInstallsNum * benchmark.installsMultiplierRange.minDailyFactor));
    const maxDailyCeil = Math.max(100, Math.round(minInstallsNum * benchmark.installsMultiplierRange.maxDailyFactor));
    const finalDailyMedian = Math.max(minDailyFloor, Math.min(maxDailyCeil, Math.round(adjustedDaily)));

    const dailyDownloadsMin = Math.max(1, Math.round(finalDailyMedian * 0.75));
    const dailyDownloadsMedian = finalDailyMedian;
    const dailyDownloadsMax = Math.round(finalDailyMedian * 1.35);

    const monthlyDownloadsMin = Math.round(dailyDownloadsMin * 30.4);
    const monthlyDownloadsMedian = Math.round(dailyDownloadsMedian * 30.4);
    const monthlyDownloadsMax = Math.round(dailyDownloadsMax * 30.4);

    // 4. Estimativa de Receita
    const metadata = (app.metadata as Record<string, any>) || {};
    const isPaid = metadata.price && metadata.price > 0;
    const offersIap = metadata.offersIAP === true || metadata.inAppPurchases === true;

    let monetizationType: 'FREE_IAP' | 'PAID' | 'FREE_ADS' = 'FREE_ADS';
    let estimatedDailyRevenueMedian = 0;

    if (isPaid) {
      monetizationType = 'PAID';
      const price = Number(metadata.price) || 5.0;
      estimatedDailyRevenueMedian = Number((dailyDownloadsMedian * price * 0.85).toFixed(2));
    } else if (offersIap) {
      monetizationType = 'FREE_IAP';
      // Modelo IAP: ARPU diário por download = (ARPU mensal / 30) * conversão típica * fator multiplicador LTV
      const dailyIapPerDownload = (benchmark.arpuMonthlyBrl / 30.4) * (benchmark.typicalPayerConversionRate * 10);
      estimatedDailyRevenueMedian = Number((dailyDownloadsMedian * dailyIapPerDownload).toFixed(2));
    } else {
      monetizationType = 'FREE_ADS';
      estimatedDailyRevenueMedian = Number((dailyDownloadsMedian * benchmark.adArpuPerDownloadBrl).toFixed(2));
    }

    // Garante valor positivo
    estimatedDailyRevenueMedian = Math.max(0.50, estimatedDailyRevenueMedian);

    const dailyRevenueMin = Number((estimatedDailyRevenueMedian * 0.70).toFixed(2));
    const dailyRevenueMedian = estimatedDailyRevenueMedian;
    const dailyRevenueMax = Number((estimatedDailyRevenueMedian * 1.45).toFixed(2));

    const monthlyRevenueMin = Number((dailyRevenueMin * 30.4).toFixed(2));
    const monthlyRevenueMedian = Number((dailyRevenueMedian * 30.4).toFixed(2));
    const monthlyRevenueMax = Number((dailyRevenueMax * 30.4).toFixed(2));

    // 5. Índice de Confiabilidade (Confidence Score)
    let confidence = 50.0;
    if (ratingsCount > 1000) confidence += 10.0;
    if (reviewsCount > 200) confidence += 10.0;
    if (appScore > 0) confidence += 5.0;
    if (minInstallsNum > 10000) confidence += 10.0;
    if (dto?.forceRankBasis || metadata.categoryRank) confidence += 10.0;
    if (app.trackedKeywords && app.trackedKeywords.length >= 3) confidence += 5.0;
    const confidenceScore = Math.min(95.0, confidence);

    // 6. Data truncada para o dia atual (00:00:00 UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const breakdown = {
      alphaCategory: benchmark.alpha,
      betaCategory: benchmark.beta,
      reviewVelocityFactor,
      scoreFactor,
      arpuEstimate: benchmark.arpuMonthlyBrl,
      monetizationType,
      minInstallsFloor: minDailyFloor,
    };

    // 7. Upsert no banco de dados
    const saved = await this.prisma.asoAppEstimate.upsert({
      where: {
        asoAppId_date_country: {
          asoAppId: app.id,
          date: today,
          country: country.toLowerCase(),
        },
      },
      create: {
        organizationId,
        asoAppId: app.id,
        date: today,
        country: country.toLowerCase(),
        category: benchmark.category,
        categoryRankBasis: rankBasis,
        dailyDownloadsMin,
        dailyDownloadsMedian,
        dailyDownloadsMax,
        monthlyDownloadsMin,
        monthlyDownloadsMedian,
        monthlyDownloadsMax,
        dailyRevenueMin,
        dailyRevenueMedian,
        dailyRevenueMax,
        monthlyRevenueMin,
        monthlyRevenueMedian,
        monthlyRevenueMax,
        currency: 'BRL',
        confidenceScore,
        calculationMethod: 'POWER_LAW_PARETO_V1',
        breakdownJson: breakdown,
      },
      update: {
        category: benchmark.category,
        categoryRankBasis: rankBasis,
        dailyDownloadsMin,
        dailyDownloadsMedian,
        dailyDownloadsMax,
        monthlyDownloadsMin,
        monthlyDownloadsMedian,
        monthlyDownloadsMax,
        dailyRevenueMin,
        dailyRevenueMedian,
        dailyRevenueMax,
        monthlyRevenueMin,
        monthlyRevenueMedian,
        monthlyRevenueMax,
        confidenceScore,
        calculationMethod: 'POWER_LAW_PARETO_V1',
        breakdownJson: breakdown,
      },
    });

    return this.mapToDto(saved, breakdown);
  }

  /**
   * Retorna o resumo completo de estimativas (última estimativa, histórico e projeções de crescimento).
   */
  async getEstimatesSummary(
    asoAppId: string,
    organizationId: string,
    query?: AsoEstimateQueryDto,
  ): Promise<AsoEstimatesSummaryDto> {
    const app = await this.prisma.asoApp.findFirst({
      where: {
        id: asoAppId,
        organizationId,
      },
    });

    if (!app) {
      throw new NotFoundException(`Aplicativo com ID "${asoAppId}" não encontrado.`);
    }

    const country = (query?.country || app.country || 'br').toLowerCase();
    const daysLimit = query?.days || 30;

    // Busca histórico ordenado por data ascendente
    let estimates = await this.prisma.asoAppEstimate.findMany({
      where: {
        asoAppId,
        organizationId,
        country,
      },
      orderBy: { date: 'asc' },
      take: daysLimit,
    });

    // Se ainda não houver nenhuma estimativa para o app, calcula a primeira imediatamente
    if (estimates.length === 0) {
      await this.calculateAndSaveEstimate(asoAppId, organizationId, { country });
      estimates = await this.prisma.asoAppEstimate.findMany({
        where: {
          asoAppId,
          organizationId,
          country,
        },
        orderBy: { date: 'asc' },
        take: daysLimit,
      });
    }

    const latest = estimates[estimates.length - 1];
    const latestDto = this.mapToDto(latest, latest.breakdownJson as any);
    const historyDtos = estimates.map((e: any) => this.mapToDto(e, e.breakdownJson as any));

    // Calcula taxas de crescimento se houver histórico de 7d e 30d
    let downloadGrowthRate7d = 0;
    let downloadGrowthRate30d = 0;
    let revenueGrowthRate7d = 0;
    let revenueGrowthRate30d = 0;

    if (estimates.length >= 7) {
      const idx7 = estimates.length - 7;
      const past7 = estimates[idx7];
      if (past7.dailyDownloadsMedian > 0) {
        downloadGrowthRate7d = Number(
          (((latest.dailyDownloadsMedian - past7.dailyDownloadsMedian) / past7.dailyDownloadsMedian) * 100).toFixed(1),
        );
      }
      if (Number(past7.dailyRevenueMedian) > 0) {
        revenueGrowthRate7d = Number(
          (((Number(latest.dailyRevenueMedian) - Number(past7.dailyRevenueMedian)) / Number(past7.dailyRevenueMedian)) * 100).toFixed(1),
        );
      }
    }

    if (estimates.length >= 30) {
      const past30 = estimates[0];
      if (past30.dailyDownloadsMedian > 0) {
        downloadGrowthRate30d = Number(
          (((latest.dailyDownloadsMedian - past30.dailyDownloadsMedian) / past30.dailyDownloadsMedian) * 100).toFixed(1),
        );
      }
      if (Number(past30.dailyRevenueMedian) > 0) {
        revenueGrowthRate30d = Number(
          (((Number(latest.dailyRevenueMedian) - Number(past30.dailyRevenueMedian)) / Number(past30.dailyRevenueMedian)) * 100).toFixed(1),
        );
      }
    }

    return {
      appId: app.appId,
      title: app.title,
      icon: app.icon,
      category: latest.category,
      country: latest.country.toUpperCase(),
      latestEstimate: latestDto,
      history: historyDtos,
      growthTrends: {
        downloadGrowthRate7d,
        downloadGrowthRate30d,
        revenueGrowthRate7d,
        revenueGrowthRate30d,
      },
      methodologyNotice:
        'Estimativas estatísticas calculadas via modelagem de cauda longa (Distribuição de Pareto/Power-Law) baseadas em rankings, volume de avaliações e dados públicos de mercado. Não representam dados oficiais da Google Play.',
    };
  }

  /**
   * Retorna os benchmarks de mercado para uma categoria e país.
   */
  getCategoryBenchmarks(genreOrCategory?: string, country: string = 'BR'): AsoCategoryBenchmarkDto {
    const config = resolveCategoryBenchmark(genreOrCategory);

    // Amostra de ranks de referência (1, 5, 10, 25, 50, 100)
    const sampleRanks = [1, 5, 10, 25, 50, 100].map((r) => {
      const dailyDl = Math.round(config.alpha * Math.pow(r, -config.beta));
      const dailyRev = Number((dailyDl * config.adArpuPerDownloadBrl).toFixed(2));
      return {
        rank: r,
        estimatedDailyDownloads: dailyDl,
        estimatedDailyRevenueBrl: dailyRev,
      };
    });

    return {
      category: config.category,
      country: country.toUpperCase(),
      alpha: config.alpha,
      beta: config.beta,
      baseArpuBrl: config.arpuMonthlyBrl,
      baseArpuUsd: config.arpuMonthlyUsd,
      typicalConversionRate: config.typicalPayerConversionRate,
      sampleTopRanks: sampleRanks,
    };
  }

  private mapToDto(estimate: any, breakdown?: any): AsoAppEstimateDto {
    return {
      id: estimate.id,
      organizationId: estimate.organizationId,
      asoAppId: estimate.asoAppId,
      date: estimate.date instanceof Date ? estimate.date.toISOString().split('T')[0] : String(estimate.date),
      country: (estimate.country || 'br').toUpperCase(),
      category: estimate.category,
      categoryRankBasis: estimate.categoryRankBasis,
      dailyDownloads: {
        min: estimate.dailyDownloadsMin,
        median: estimate.dailyDownloadsMedian,
        max: estimate.dailyDownloadsMax,
      },
      monthlyDownloads: {
        min: estimate.monthlyDownloadsMin,
        median: estimate.monthlyDownloadsMedian,
        max: estimate.monthlyDownloadsMax,
      },
      dailyRevenue: {
        min: Number(estimate.dailyRevenueMin),
        median: Number(estimate.dailyRevenueMedian),
        max: Number(estimate.dailyRevenueMax),
      },
      monthlyRevenue: {
        min: Number(estimate.monthlyRevenueMin),
        median: Number(estimate.monthlyRevenueMedian),
        max: Number(estimate.monthlyRevenueMax),
      },
      currency: estimate.currency || 'BRL',
      confidenceScore: Number(estimate.confidenceScore),
      calculationMethod: estimate.calculationMethod,
      breakdown: breakdown || null,
      createdAt: estimate.createdAt instanceof Date ? estimate.createdAt.toISOString() : String(estimate.createdAt),
      updatedAt: estimate.updatedAt instanceof Date ? estimate.updatedAt.toISOString() : String(estimate.updatedAt),
    };
  }
}

