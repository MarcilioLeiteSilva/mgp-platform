import { Test, TestingModule } from '@nestjs/testing';
import { PublicAsoController } from './public-aso.controller';
import { ApiKeyAuthGuard } from '../guards/api-key-auth.guard';
import { PrismaService } from '../../../database/prisma.service';
import { PlayScraperEngineService } from '../../aso/services/play-scraper-engine.service';
import { AsoEstimatesService } from '../../aso/services/aso-estimates.service';
import { AsoTrendsService } from '../../aso/services/aso-trends.service';

describe('PublicAsoController (API Pública Comercial)', () => {
  let controller: PublicAsoController;
  let prisma: any;
  let playScraper: any;
  let estimatesService: any;
  let trendsService: any;

  const mockMeta = {
    organizationId: 'org-test-1',
    keyId: 'key-test-1',
    scopes: ['aso:read', 'estimates:read', 'trends:read'],
    quotaUsed: 10,
    quotaRemaining: 9990,
  };

  const mockApp = {
    id: 'app-1',
    organizationId: 'org-test-1',
    appId: 'com.growth.public',
    title: 'Growth App',
    developer: 'Growth Lab',
    icon: 'https://cdn.example.com/icon.png',
    genre: 'FINANCE',
    genreId: 'FINANCE',
    score: 4.8,
    ratings: 50000,
    reviews: 12000,
    minInstalls: BigInt(1000000),
    country: 'br',
    lastScrapedAt: new Date(),
  };

  const mockEstimatesSummary = {
    latestEstimate: {
      date: '2026-11-09',
      dailyDownloadsMedian: 5000,
      dailyRevenueMedian: 2500,
    },
    history: [],
    growthTrends: { downloadsWeekOverWeek: 12.5 },
  };

  const mockTrendsSummary = {
    category: 'FINANCE',
    country: 'BR',
    date: '2026-11-09',
    totalAppsAnalyzed: 45,
    topBreakouts: [],
    trendingKeywords: [],
    categoryGrowthIndex: 7.2,
    lastRefreshedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    prisma = {
      asoApp: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    playScraper = {
      getApp: jest.fn(),
      search: jest.fn(),
    };
    estimatesService = {
      getEstimatesSummary: jest.fn().mockResolvedValue(mockEstimatesSummary),
      calculateAndSaveEstimate: jest.fn(),
    };
    trendsService = {
      getCategoryTrends: jest.fn().mockResolvedValue(mockTrendsSummary),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicAsoController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: PlayScraperEngineService, useValue: playScraper },
        { provide: AsoEstimatesService, useValue: estimatesService },
        { provide: AsoTrendsService, useValue: trendsService },
      ],
    })
      .overrideGuard(ApiKeyAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PublicAsoController>(PublicAsoController);
  });

  it('deve ser instanciado corretamente', () => {
    expect(controller).toBeDefined();
  });

  it('GET /api/v1/public/aso/apps/:appId deve retornar dados do app do catálogo ou scraper com wrapper', async () => {
    prisma.asoApp.findFirst.mockResolvedValue(mockApp);

    const response = await controller.getAppDetails('com.growth.public', { country: 'BR' }, mockMeta);

    expect(response.success).toBe(true);
    expect(response.data.appId).toBe('com.growth.public');
    expect(response.data.title).toBe('Growth App');
    expect(response.meta.quotaRemaining).toBe(9990);
  });

  it('GET /api/v1/public/aso/apps/:appId/estimates deve retornar resumo preditivo de downloads e receita', async () => {
    prisma.asoApp.findFirst.mockResolvedValue(mockApp);

    const response = await controller.getAppEstimates('com.growth.public', { days: 30 }, mockMeta);

    expect(response.success).toBe(true);
    expect(response.data).toEqual(mockEstimatesSummary);
    expect(estimatesService.getEstimatesSummary).toHaveBeenCalledWith('app-1', 'org-test-1', {
      days: 30,
      country: 'br',
    });
  });

  it('GET /api/v1/public/aso/trends/categories/:category deve retornar tendências setoriais e breakouts', async () => {
    const response = await controller.getCategoryTrends('FINANCE', { country: 'BR' }, mockMeta);

    expect(response.success).toBe(true);
    expect(response.data.category).toBe('FINANCE');
    expect(trendsService.getCategoryTrends).toHaveBeenCalledWith('FINANCE', 'BR', 'org-test-1');
  });

  it('GET /api/v1/public/aso/keywords/ranking deve retornar posição do app no ranking de busca', async () => {
    playScraper.search.mockResolvedValue([
      { appId: 'com.other.app', title: 'Other' },
      { appId: 'com.growth.public', title: 'Growth App' },
    ]);

    const response = await controller.getKeywordRanking(
      { keyword: 'finanças', appId: 'com.growth.public' },
      mockMeta,
    );

    expect(response.success).toBe(true);
    expect(response.data.rank).toBe(2);
    expect(response.data.isRanked).toBe(true);
    expect(response.data.topRankedApp).toBe('com.other.app');
  });
});
