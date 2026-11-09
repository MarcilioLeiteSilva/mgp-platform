import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AsoTrendsService } from './aso-trends.service';
import { PrismaService } from '../../../database/prisma.service';
import { AsoEstimatesService } from './aso-estimates.service';

describe('AsoTrendsService (DetecÃ§Ã£o de Breakouts e Monitoramento de TendÃªncias)', () => {
  let service: AsoTrendsService;
  let prisma: any;
  let estimatesService: any;

  const mockApp = {
    id: 'app-trend-1',
    organizationId: 'org-1',
    appId: 'com.breakout.fintech',
    title: 'Fintech Veloz',
    developer: 'Fintech S.A.',
    icon: 'https://cdn.mgp.com/fintech.png',
    genre: 'FINANCE',
    score: 4.8,
    ratings: 25000,
    reviews: 6000,
    minInstalls: BigInt(500000),
    country: 'br',
    isCompetitor: true,
    metadata: {
      categoryRank: 12,
      previousCategoryRank: 34,
    },
    estimates: [
      {
        date: new Date(),
        dailyDownloadsMedian: 4500,
      },
      {
        date: new Date(Date.now() - 7 * 86400000),
        dailyDownloadsMedian: 2800,
      },
    ],
  };

  const mockAlert = {
    id: 'alert-1',
    organizationId: 'org-1',
    category: 'FINANCE',
    title: 'App em RÃ¡pida AscensÃ£o: Fintech Veloz',
    message: 'Subiu 22 posiÃ§Ãµes no ranking.',
    severity: 'HIGH',
    targetAppId: 'com.breakout.fintech',
    metadata: { breakoutScore: 88 },
    isRead: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      asoApp: {
        findMany: jest.fn(),
      },
      asoMarketTrend: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      asoKeyword: {
        findMany: jest.fn(),
      },
      asoTrendAlert: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    estimatesService = {
      getCategoryBenchmarks: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsoTrendsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AsoEstimatesService, useValue: estimatesService },
      ],
    }).compile();

    service = module.get<AsoTrendsService>(AsoTrendsService);
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeDefined();
  });

  describe('getBreakoutApps', () => {
    it('deve identificar aplicativos em ascensÃ£o rÃ¡pida e calcular Breakout Score', async () => {
      prisma.asoApp.findMany.mockResolvedValue([mockApp]);
      prisma.asoTrendAlert.findFirst.mockResolvedValue(null);
      prisma.asoTrendAlert.create.mockResolvedValue(mockAlert);

      const breakouts = await service.getBreakoutApps(
        { country: 'BR', category: 'FINANCE', minBreakoutScore: 50 },
        'org-1',
      );

      expect(breakouts.length).toBeGreaterThan(0);
      const first = breakouts[0];
      expect(first.appId).toBe('com.breakout.fintech');
      expect(first.rankDelta).toBe(22);
      expect(first.breakoutScore).toBeGreaterThanOrEqual(50);
      expect(first.breakoutScore).toBeLessThanOrEqual(100);
    });

    it('deve gerar alerta automÃ¡tico para breakouts com score elevado', async () => {
      prisma.asoApp.findMany.mockResolvedValue([mockApp]);
      prisma.asoTrendAlert.findFirst.mockResolvedValue(null);
      prisma.asoTrendAlert.create.mockResolvedValue(mockAlert);

      await service.getBreakoutApps(
        { country: 'BR', minBreakoutScore: 50 },
        'org-1',
      );

      expect(prisma.asoTrendAlert.create).toHaveBeenCalled();
    });
  });

  describe('getCategoryTrends', () => {
    it('deve retornar snapshot existente se disponÃ­vel para a data de hoje', async () => {
      const mockSnapshot = {
        category: 'FINANCE',
        country: 'br',
        date: new Date(),
        breakoutAppsJson: [
          {
            appId: 'com.breakout.fintech',
            title: 'Fintech Veloz',
            breakoutScore: 88,
          },
        ],
        trendingKeywordsJson: [
          {
            keyword: 'cartao sem anuidade',
            searchVolume: 85,
            opportunityScore: 82,
          },
        ],
        summaryMetricsJson: { totalAppsAnalyzed: 40, categoryGrowthIndex: 7.5 },
        updatedAt: new Date(),
      };

      prisma.asoMarketTrend.findUnique.mockResolvedValue(mockSnapshot);

      const trends = await service.getCategoryTrends('FINANCE', 'BR', 'org-1');
      expect(trends.category).toBe('FINANCE');
      expect(trends.topBreakouts.length).toBe(1);
      expect(trends.trendingKeywords.length).toBe(1);
    });

    it('deve criar novo snapshot se nÃ£o houver registro no dia atual', async () => {
      prisma.asoMarketTrend.findUnique.mockResolvedValue(null);
      prisma.asoApp.findMany.mockResolvedValue([mockApp]);
      prisma.asoKeyword.findMany.mockResolvedValue([]);
      prisma.asoMarketTrend.create.mockImplementation((args: any) => Promise.resolve({
        ...args.data,
        updatedAt: new Date(),
      }));

      const trends = await service.getCategoryTrends('FINANCE', 'BR', 'org-1');
      expect(prisma.asoMarketTrend.create).toHaveBeenCalledTimes(1);
      expect(trends.category).toBe('FINANCE');
    });
  });

  describe('getTrendingKeywords', () => {
    it('deve calcular Ã­ndice de oportunidade a partir de volume e dificuldade', async () => {
      prisma.asoKeyword.findMany.mockResolvedValue([
        {
          keyword: 'investimentos iniciantes',
          country: 'br',
          searchVolume: 80,
          difficulty: 30,
        },
      ]);

      const keywords = await service.getTrendingKeywords({ country: 'BR' });
      expect(keywords.length).toBe(1);
      expect(keywords[0].opportunityScore).toBe(76); // (80 * 0.6) + (70 * 0.4) = 48 + 28 = 76
    });
  });

  describe('Alertas da OrganizaÃ§Ã£o', () => {
    it('deve listar alertas da organizaÃ§Ã£o com suporte a unreadOnly', async () => {
      prisma.asoTrendAlert.findMany.mockResolvedValue([mockAlert]);

      const alerts = await service.getOrganizationAlerts('org-1', true);
      expect(alerts.length).toBe(1);
      expect(alerts[0].id).toBe('alert-1');
      expect(prisma.asoTrendAlert.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    });

    it('deve marcar alerta como lido respeitando o isolamento do tenant', async () => {
      prisma.asoTrendAlert.findFirst.mockResolvedValue(mockAlert);
      prisma.asoTrendAlert.update.mockResolvedValue({ ...mockAlert, isRead: true });

      const result = await service.markAlertAsRead('alert-1', 'org-1');
      expect(result.isRead).toBe(true);
      expect(prisma.asoTrendAlert.findFirst).toHaveBeenCalledWith({
        where: { id: 'alert-1', organizationId: 'org-1' },
      });
    });

    it('deve lanÃ§ar NotFoundException se alerta pertencer a outra organizaÃ§Ã£o', async () => {
      prisma.asoTrendAlert.findFirst.mockResolvedValue(null);

      await expect(service.markAlertAsRead('alert-outra-org', 'org-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

