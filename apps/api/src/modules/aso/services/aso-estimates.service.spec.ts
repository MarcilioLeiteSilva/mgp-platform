import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AsoEstimatesService } from './aso-estimates.service';
import { PrismaService } from '../../../database/prisma.service';

describe('AsoEstimatesService (InteligÃªncia Preditiva de Downloads e Receita)', () => {
  let service: AsoEstimatesService;
  let prisma: any;

  const mockApp = {
    id: 'aso-app-100',
    organizationId: 'org-tenant-1',
    appId: 'com.game.studio.adventure',
    title: 'Epic Adventure Game',
    icon: 'https://cdn.mgp.com/icon.png',
    genre: 'GAME',
    genreId: 'GAME_ACTION',
    score: 4.5,
    ratings: 45000,
    reviews: 12000,
    minInstalls: BigInt(1000000),
    country: 'br',
    lang: 'pt-BR',
    metadata: {
      categoryRank: 15,
      offersIAP: true,
      price: 0,
    },
    trackedKeywords: [
      { id: 'kw-1', isActive: true },
      { id: 'kw-2', isActive: true },
      { id: 'kw-3', isActive: true },
    ],
  };

  const mockSavedEstimate = {
    id: 'est-1',
    organizationId: 'org-tenant-1',
    asoAppId: 'aso-app-100',
    date: new Date('2026-11-09T00:00:00.000Z'),
    country: 'br',
    category: 'GAME',
    categoryRankBasis: 15,
    dailyDownloadsMin: 5600,
    dailyDownloadsMedian: 7500,
    dailyDownloadsMax: 10100,
    monthlyDownloadsMin: 170240,
    monthlyDownloadsMedian: 228000,
    monthlyDownloadsMax: 307040,
    dailyRevenueMin: 1450.0,
    dailyRevenueMedian: 2070.0,
    dailyRevenueMax: 3000.0,
    monthlyRevenueMin: 44080.0,
    monthlyRevenueMedian: 62928.0,
    monthlyRevenueMax: 91200.0,
    currency: 'BRL',
    confidenceScore: 85.0,
    calculationMethod: 'POWER_LAW_PARETO_V1',
    breakdownJson: {
      alphaCategory: 85000,
      betaCategory: 0.88,
      monetizationType: 'FREE_IAP',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      asoApp: {
        findFirst: jest.fn(),
      },
      asoAppEstimate: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsoEstimatesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AsoEstimatesService>(AsoEstimatesService);
  });

  it('deve ser instanciado corretamente', () => {
    expect(service).toBeDefined();
  });

  describe('calculateAndSaveEstimate', () => {
    it('deve calcular e persistir estimativa de downloads e receita para um app de jogos (IAP)', async () => {
      prisma.asoApp.findFirst.mockResolvedValue(mockApp);
      prisma.asoAppEstimate.upsert.mockResolvedValue(mockSavedEstimate);

      const result = await service.calculateAndSaveEstimate('aso-app-100', 'org-tenant-1', {
        country: 'BR',
      });

      expect(prisma.asoApp.findFirst).toHaveBeenCalledWith({
        where: { id: 'aso-app-100', organizationId: 'org-tenant-1' },
        include: expect.any(Object),
      });

      expect(prisma.asoAppEstimate.upsert).toHaveBeenCalledTimes(1);
      const upsertArgs = prisma.asoAppEstimate.upsert.mock.calls[0][0];

      expect(upsertArgs.create.category).toBe('GAME');
      expect(upsertArgs.create.dailyDownloadsMedian).toBeGreaterThan(0);
      expect(upsertArgs.create.dailyRevenueMedian).toBeGreaterThan(0);
      expect(upsertArgs.create.confidenceScore).toBeGreaterThanOrEqual(50);
      expect(upsertArgs.create.confidenceScore).toBeLessThanOrEqual(95);

      expect(result.id).toBe('est-1');
      expect(result.country).toBe('BR');
      expect(result.dailyDownloads.median).toBe(7500);
    });

    it('deve calcular receita direta para aplicativos pagos (PAID)', async () => {
      const paidApp = {
        ...mockApp,
        metadata: {
          categoryRank: 8,
          price: 19.9,
          offersIAP: false,
        },
      };

      prisma.asoApp.findFirst.mockResolvedValue(paidApp);
      prisma.asoAppEstimate.upsert.mockImplementation((args: any) => Promise.resolve({
        ...mockSavedEstimate,
        ...args.create,
      }));

      const result = await service.calculateAndSaveEstimate('aso-app-100', 'org-tenant-1');
      expect(prisma.asoAppEstimate.upsert).toHaveBeenCalled();
      const upsertCreate = prisma.asoAppEstimate.upsert.mock.calls[0][0].create;
      expect(upsertCreate.breakdownJson.monetizationType).toBe('PAID');
      expect(Number(upsertCreate.dailyRevenueMedian)).toBeGreaterThan(0);
    });

    it('deve calcular receita estimada de anÃºncios para aplicativos gratuitos sem IAP (FREE_ADS)', async () => {
      const freeApp = {
        ...mockApp,
        metadata: {
          categoryRank: 30,
          price: 0,
          offersIAP: false,
        },
      };

      prisma.asoApp.findFirst.mockResolvedValue(freeApp);
      prisma.asoAppEstimate.upsert.mockImplementation((args: any) => Promise.resolve({
        ...mockSavedEstimate,
        ...args.create,
      }));

      await service.calculateAndSaveEstimate('aso-app-100', 'org-tenant-1');
      const upsertCreate = prisma.asoAppEstimate.upsert.mock.calls[0][0].create;
      expect(upsertCreate.breakdownJson.monetizationType).toBe('FREE_ADS');
    });

    it('deve respeitar limites (bounds) realistas derivados de minInstalls', async () => {
      const smallApp = {
        ...mockApp,
        minInstalls: BigInt(500),
        ratings: 12,
        reviews: 3,
        metadata: { categoryRank: 500 },
      };

      prisma.asoApp.findFirst.mockResolvedValue(smallApp);
      prisma.asoAppEstimate.upsert.mockImplementation((args: any) => Promise.resolve({
        ...mockSavedEstimate,
        ...args.create,
      }));

      await service.calculateAndSaveEstimate('aso-app-100', 'org-tenant-1');
      const upsertCreate = prisma.asoAppEstimate.upsert.mock.calls[0][0].create;
      // Para um app com 500 installs, nÃ£o pode gerar 10.000 downloads diÃ¡rios
      expect(upsertCreate.dailyDownloadsMedian).toBeLessThanOrEqual(100);
      expect(upsertCreate.dailyDownloadsMedian).toBeGreaterThanOrEqual(1);
    });

    it('deve lanÃ§ar NotFoundException se aplicativo nÃ£o pertencer Ã  organizaÃ§Ã£o (Tenant Isolation)', async () => {
      prisma.asoApp.findFirst.mockResolvedValue(null);

      await expect(
        service.calculateAndSaveEstimate('unauthorized-app', 'org-tenant-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getEstimatesSummary', () => {
    it('deve retornar resumo completo com taxas de crescimento e metodologia', async () => {
      prisma.asoApp.findFirst.mockResolvedValue(mockApp);

      const mockHistory = Array.from({ length: 30 }, (_, i) => ({
        ...mockSavedEstimate,
        id: `est-${i}`,
        date: new Date(Date.now() - (29 - i) * 86400000),
        dailyDownloadsMedian: 5000 + i * 100,
        dailyRevenueMedian: 1000 + i * 20,
      }));

      prisma.asoAppEstimate.findMany.mockResolvedValue(mockHistory);

      const summary = await service.getEstimatesSummary('aso-app-100', 'org-tenant-1', {
        days: 30,
        country: 'BR',
      });

      expect(summary.appId).toBe('com.game.studio.adventure');
      expect(summary.latestEstimate).toBeDefined();
      expect(summary.history.length).toBe(30);
      expect(summary.growthTrends.downloadGrowthRate7d).toBeGreaterThan(0);
      expect(summary.growthTrends.downloadGrowthRate30d).toBeGreaterThan(0);
      expect(summary.methodologyNotice).toContain('Pareto');
    });

    it('deve calcular a primeira estimativa sob demanda caso o histÃ³rico esteja vazio', async () => {
      prisma.asoApp.findFirst.mockResolvedValue(mockApp);
      // Primeiro findMany retorna vazio, depois retorna com 1 elemento
      prisma.asoAppEstimate.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockSavedEstimate]);

      prisma.asoAppEstimate.upsert.mockResolvedValue(mockSavedEstimate);

      const summary = await service.getEstimatesSummary('aso-app-100', 'org-tenant-1');
      expect(prisma.asoAppEstimate.upsert).toHaveBeenCalledTimes(1);
      expect(summary.latestEstimate.id).toBe('est-1');
    });
  });

  describe('getCategoryBenchmarks', () => {
    it('deve retornar parÃ¢metros calibrados para a categoria FINANCE', () => {
      const benchmark = service.getCategoryBenchmarks('FINANCE', 'BR');

      expect(benchmark.category).toBe('FINANCE');
      expect(benchmark.alpha).toBe(65000);
      expect(benchmark.beta).toBe(0.84);
      expect(benchmark.baseArpuBrl).toBe(8.5);
      expect(benchmark.sampleTopRanks.length).toBeGreaterThan(0);
    });

    it('deve retornar parÃ¢metro DEFAULT para categorias desconhecidas', () => {
      const benchmark = service.getCategoryBenchmarks('UNKNOWN_GENRE_XYZ');
      expect(benchmark.category).toBe('DEFAULT');
      expect(benchmark.alpha).toBe(30000);
    });
  });
});

