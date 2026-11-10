import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service';
import { AsoEstimatesService } from '../modules/aso/services/aso-estimates.service';
import { AsoEstimatesController } from '../modules/aso/controllers/aso-estimates.controller';
import { AsoTrendsService } from '../modules/aso/services/aso-trends.service';
import { AsoTrendsController } from '../modules/aso/controllers/aso-trends.controller';
import { AsoAiRecommendationsService } from '../modules/aso/services/aso-ai-recommendations.service';
import { AsoAiRecommendationsController } from '../modules/aso/controllers/aso-ai-recommendations.controller';
import { ApiKeysService } from '../modules/api-keys/services/api-keys.service';
import { ApiKeysController } from '../modules/api-keys/controllers/api-keys.controller';
import { PublicAsoController } from '../modules/api-keys/controllers/public-aso.controller';
import { ApiKeyAuthGuard } from '../modules/api-keys/guards/api-key-auth.guard';
import { PlayScraperEngineService } from '../modules/aso/services/play-scraper-engine.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { PlansService } from '../modules/plans/services/plans.service';
import { PlansController } from '../modules/plans/controllers/plans.controller';
import { PLANS_CATALOG } from '../modules/plans/constants/plans.constants';

describe('Suíte de Testes Ponta a Ponta (E2E) e Homologação — ETAPA 5 (Inteligência Avançada, Modelos Preditivos, IA, API Pública & Planos SaaS)', () => {
  let estimatesService: AsoEstimatesService;
  let estimatesController: AsoEstimatesController;
  let trendsService: AsoTrendsService;
  let trendsController: AsoTrendsController;
  let aiService: AsoAiRecommendationsService;
  let aiController: AsoAiRecommendationsController;
  let apiKeysService: ApiKeysService;
  let apiKeysController: ApiKeysController;
  let publicAsoController: PublicAsoController;
  let apiKeyAuthGuard: ApiKeyAuthGuard;
  let plansService: PlansService;
  let plansController: PlansController;
  let playScraper: PlayScraperEngineService;

  const tenantAlphaOrgId = 'org-alpha-fintech-uuid';
  const tenantBetaOrgId = 'org-beta-competitor-uuid';
  const testUserId = 'user-growth-lead-uuid';

  // Repositórios em memória para simulação fiel do banco de dados
  let dbApps: any[] = [];
  let dbAppKeywords: any[] = [];
  let dbEstimates: any[] = [];
  let dbMarketTrends: any[] = [];
  let dbTrendAlerts: any[] = [];
  let dbAiRecommendations: any[] = [];
  let dbApiKeys: any[] = [];
  let dbSubscriptions: any[] = [];
  let dbMemberships: any[] = [];

  const resetInMemoryDatabase = () => {
    dbApps = [
      {
        id: 'app-alpha-primary',
        organizationId: tenantAlphaOrgId,
        appId: 'com.alphabank.app',
        title: 'AlphaBank: Conta Digital e Cartão',
        developer: 'AlphaBank S.A.',
        genre: 'Finance',
        score: 4.7,
        ratings: 185000,
        reviews: 42000,
        minInstalls: 5000000,
        country: 'br',
        isMonitored: true,
        isCompetitor: false,
        icon: 'https://cdn.alphabank.com/icon.png',
        url: 'https://play.google.com/store/apps/details?id=com.alphabank.app',
        createdAt: new Date(),
        updatedAt: new Date(),
        trackedKeywords: [
          {
            id: 'kw-1',
            asoAppId: 'app-alpha-primary',
            keywordText: 'conta digital',
            keyword: { keyword: 'conta digital' },
            currentRank: 3,
            previousRank: 4,
            bestRank: 2,
            searchVolume: 92,
            difficulty: 75,
            chanceScore: 80,
            isActive: true,
          },
          {
            id: 'kw-2',
            asoAppId: 'app-alpha-primary',
            keywordText: 'cartao de credito',
            keyword: { keyword: 'cartao de credito' },
            currentRank: 5,
            previousRank: 6,
            bestRank: 3,
            searchVolume: 88,
            difficulty: 82,
            chanceScore: 72,
            isActive: true,
          },
        ],
      },
      {
        id: 'app-beta-rival',
        organizationId: tenantBetaOrgId,
        appId: 'com.rivalfin.app',
        title: 'RivalFin: Investimentos & Pix',
        developer: 'Rival Finance Ltd',
        genre: 'Finance',
        score: 4.4,
        ratings: 95000,
        reviews: 18000,
        minInstalls: 1000000,
        country: 'br',
        isMonitored: true,
        isCompetitor: false,
        icon: 'https://cdn.rivalfin.com/icon.png',
        url: 'https://play.google.com/store/apps/details?id=com.rivalfin.app',
        createdAt: new Date(),
        updatedAt: new Date(),
        trackedKeywords: [],
      },
    ];

    dbAppKeywords = [
      {
        id: 'kw-1',
        asoAppId: 'app-alpha-primary',
        keywordText: 'conta digital',
        isActive: true,
        asoApp: { organizationId: tenantAlphaOrgId },
      },
      {
        id: 'kw-2',
        asoAppId: 'app-alpha-primary',
        keywordText: 'cartao de credito',
        isActive: true,
        asoApp: { organizationId: tenantAlphaOrgId },
      },
    ];

    dbEstimates = [];
    dbMarketTrends = [];
    dbTrendAlerts = [];
    dbAiRecommendations = [];
    dbApiKeys = [];
    dbSubscriptions = [];
    dbMemberships = [
      { id: 'mem-1', organizationId: tenantAlphaOrgId, userId: testUserId, role: 'ADMIN' },
    ];
  };

  const mockPrisma: any = {
    $transaction: jest.fn().mockImplementation(async (callback) => {
      if (typeof callback === 'function') {
        return callback(mockPrisma);
      }
      return callback;
    }),

    asoApp: {
      findFirst: jest.fn().mockImplementation(({ where, include }) => {
        const found = dbApps.find((app) => {
          if (where.id && app.id !== where.id) return false;
          if (where.appId && app.appId !== where.appId) return false;
          if (where.organizationId && app.organizationId !== where.organizationId) return false;
          return true;
        });
        if (!found) return Promise.resolve(null);
        const cloned = { ...found };
        if (include?.trackedKeywords) {
          cloned.trackedKeywords = cloned.trackedKeywords || [];
        }
        return Promise.resolve(cloned);
      }),
      findMany: jest.fn().mockImplementation(({ where, include, take }) => {
        let results = dbApps.filter((app) => {
          if (where?.organizationId && app.organizationId !== where.organizationId) return false;
          if (where?.country && app.country !== where.country) return false;
          return true;
        });
        if (take) results = results.slice(0, take);
        return Promise.resolve(results.map((r) => ({ ...r, estimates: [] })));
      }),
      count: jest.fn().mockImplementation(({ where }) => {
        const count = dbApps.filter((app) => {
          if (where?.organizationId && app.organizationId !== where.organizationId) return false;
          if (where?.isMonitored !== undefined && app.isMonitored !== where.isMonitored) return false;
          return true;
        }).length;
        return Promise.resolve(count);
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const newApp = {
          id: `app-${Date.now()}`,
          ...data,
          trackedKeywords: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        dbApps.push(newApp);
        return Promise.resolve(newApp);
      }),
    },

    asoAppKeyword: {
      count: jest.fn().mockImplementation(({ where }) => {
        const count = dbAppKeywords.filter((kw) => {
          if (where?.asoApp?.organizationId && kw.asoApp?.organizationId !== where.asoApp.organizationId)
            return false;
          if (where?.isActive !== undefined && kw.isActive !== where.isActive) return false;
          return true;
        }).length;
        return Promise.resolve(count);
      }),
    },

    asoKeyword: {
      findMany: jest.fn().mockImplementation(() =>
        Promise.resolve([
          { keyword: 'conta digital', country: 'br', searchVolume: 92, difficulty: 75, opportunityScore: 80 },
          { keyword: 'cartao de credito', country: 'br', searchVolume: 88, difficulty: 82, opportunityScore: 72 },
          { keyword: 'investimentos', country: 'br', searchVolume: 85, difficulty: 70, opportunityScore: 84 },
          { keyword: 'pix parcelado', country: 'br', searchVolume: 78, difficulty: 60, opportunityScore: 90 },
        ]),
      ),
    },

    asoAppEstimate: {
      upsert: jest.fn().mockImplementation(({ where, update, create }) => {
        const idx = dbEstimates.findIndex(
          (e) =>
            e.asoAppId === (where.asoAppId_country_date?.asoAppId || create.asoAppId) &&
            e.country === (where.asoAppId_country_date?.country || create.country),
        );
        let result: any;
        if (idx >= 0) {
          result = { ...dbEstimates[idx], ...update, updatedAt: new Date() };
          dbEstimates[idx] = result;
        } else {
          result = {
            id: `estimate-${Date.now()}-${Math.random()}`,
            ...create,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          dbEstimates.push(result);
        }
        return Promise.resolve(result);
      }),
      findMany: jest.fn().mockImplementation(({ where, take, orderBy }) => {
        let items = dbEstimates.filter((e) => {
          if (where?.asoAppId && e.asoAppId !== where.asoAppId) return false;
          if (where?.organizationId && e.organizationId !== where.organizationId) return false;
          if (where?.country && e.country !== where.country) return false;
          return true;
        });
        if (orderBy?.date === 'asc') {
          items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        } else {
          items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        if (take) items = items.slice(0, take);
        return Promise.resolve(items);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const found = dbEstimates.find((e) => {
          if (where?.asoAppId && e.asoAppId !== where.asoAppId) return false;
          if (where?.organizationId && e.organizationId !== where.organizationId) return false;
          return true;
        });
        return Promise.resolve(found || null);
      }),
    },

    asoMarketTrend: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const found = dbMarketTrends.find(
          (t) =>
            t.category === where?.category_country_date?.category &&
            t.country === where?.category_country_date?.country,
        );
        return Promise.resolve(found || null);
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const newTrend = {
          id: `trend-${Date.now()}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        dbMarketTrends.push(newTrend);
        return Promise.resolve(newTrend);
      }),
    },

    asoTrendAlert: {
      create: jest.fn().mockImplementation(({ data }) => {
        const alert = {
          id: `alert-${Date.now()}-${Math.random()}`,
          ...data,
          isRead: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        dbTrendAlerts.push(alert);
        return Promise.resolve(alert);
      }),
      findMany: jest.fn().mockImplementation(({ where, take }) => {
        let alerts = dbTrendAlerts.filter((a) => {
          if (where?.organizationId && a.organizationId !== where.organizationId) return false;
          if (where?.isRead !== undefined && a.isRead !== where.isRead) return false;
          return true;
        });
        if (take) alerts = alerts.slice(0, take);
        return Promise.resolve(alerts);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const found = dbTrendAlerts.find((a) => {
          if (where?.id && a.id !== where.id) return false;
          if (where?.organizationId && a.organizationId !== where.organizationId) return false;
          return true;
        });
        return Promise.resolve(found || null);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = dbTrendAlerts.findIndex((a) => a.id === where.id);
        if (idx >= 0) {
          dbTrendAlerts[idx] = { ...dbTrendAlerts[idx], ...data };
          return Promise.resolve(dbTrendAlerts[idx]);
        }
        return Promise.resolve(null);
      }),
    },

    asoAiRecommendation: {
      create: jest.fn().mockImplementation(({ data }) => {
        const rec = {
          id: `rec-${Date.now()}-${Math.random()}`,
          ...data,
          status: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        dbAiRecommendations.push(rec);
        return Promise.resolve(rec);
      }),
      findMany: jest.fn().mockImplementation(({ where, take }) => {
        let recs = dbAiRecommendations.filter((r) => {
          if (where?.asoAppId && r.asoAppId !== where.asoAppId) return false;
          if (where?.organizationId && r.organizationId !== where.organizationId) return false;
          return true;
        });
        if (take) recs = recs.slice(0, take);
        return Promise.resolve(recs);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const found = dbAiRecommendations.find((r) => {
          if (where?.id && r.id !== where.id) return false;
          if (where?.organizationId && r.organizationId !== where.organizationId) return false;
          return true;
        });
        return Promise.resolve(found || null);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = dbAiRecommendations.findIndex((r) => r.id === where.id);
        if (idx >= 0) {
          dbAiRecommendations[idx] = { ...dbAiRecommendations[idx], ...data, updatedAt: new Date() };
          return Promise.resolve(dbAiRecommendations[idx]);
        }
        return Promise.resolve(null);
      }),
    },

    apiKey: {
      create: jest.fn().mockImplementation(({ data }) => {
        const key = {
          id: `key-${Date.now()}`,
          ...data,
          quotaUsed: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        dbApiKeys.push(key);
        return Promise.resolve(key);
      }),
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const found = dbApiKeys.find((k) => {
          if (where?.keyHash && k.keyHash !== where.keyHash) return false;
          if (where?.id && k.id !== where.id) return false;
          return true;
        });
        return Promise.resolve(found ? { ...found } : null);
      }),
      findFirst: jest.fn().mockImplementation(({ where }) => {
        const found = dbApiKeys.find((k) => {
          if (where?.keyHash && k.keyHash !== where.keyHash) return false;
          if (where?.id && k.id !== where.id) return false;
          if (where?.organizationId && k.organizationId !== where.organizationId) return false;
          return true;
        });
        return Promise.resolve(found ? { ...found } : null);
      }),
      findMany: jest.fn().mockImplementation(({ where }) => {
        const keys = dbApiKeys.filter((k) => {
          if (where?.organizationId && k.organizationId !== where.organizationId) return false;
          return true;
        });
        return Promise.resolve(keys);
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = dbApiKeys.findIndex((k) => k.id === where.id);
        if (idx >= 0) {
          if (data.quotaUsed?.increment) {
            dbApiKeys[idx].quotaUsed += data.quotaUsed.increment;
            delete data.quotaUsed;
          }
          dbApiKeys[idx] = { ...dbApiKeys[idx], ...data, updatedAt: new Date() };
          return Promise.resolve(dbApiKeys[idx]);
        }
        return Promise.resolve(null);
      }),
      aggregate: jest.fn().mockImplementation(({ where }) => {
        const keys = dbApiKeys.filter((k) => {
          if (where?.organizationId && k.organizationId !== where.organizationId) return false;
          return true;
        });
        const totalUsed = keys.reduce((acc, curr) => acc + (curr.quotaUsed || 0), 0);
        return Promise.resolve({ _sum: { quotaUsed: totalUsed } });
      }),
    },

    subscription: {
      findUnique: jest.fn().mockImplementation(({ where }) => {
        const sub = dbSubscriptions.find((s) => s.organizationId === where.organizationId);
        return Promise.resolve(sub ? { ...sub } : null);
      }),
      create: jest.fn().mockImplementation(({ data }) => {
        const newSub = {
          id: `sub-${Date.now()}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        dbSubscriptions.push(newSub);
        return Promise.resolve({ ...newSub });
      }),
      upsert: jest.fn().mockImplementation(({ where, create, update }) => {
        const idx = dbSubscriptions.findIndex((s) => s.organizationId === where.organizationId);
        if (idx >= 0) {
          dbSubscriptions[idx] = { ...dbSubscriptions[idx], ...update, updatedAt: new Date() };
          return Promise.resolve({ ...dbSubscriptions[idx] });
        }
        const newSub = {
          id: `sub-${Date.now()}`,
          ...create,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        dbSubscriptions.push(newSub);
        return Promise.resolve({ ...newSub });
      }),
      update: jest.fn().mockImplementation(({ where, data }) => {
        const idx = dbSubscriptions.findIndex((s) => s.organizationId === where.organizationId);
        if (idx >= 0) {
          dbSubscriptions[idx] = { ...dbSubscriptions[idx], ...data, updatedAt: new Date() };
          return Promise.resolve({ ...dbSubscriptions[idx] });
        }
        return Promise.resolve(null);
      }),
    },

    membership: {
      count: jest.fn().mockImplementation(({ where }) => {
        const count = dbMemberships.filter((m) => {
          if (where?.organizationId && m.organizationId !== where.organizationId) return false;
          return true;
        }).length;
        return Promise.resolve(count);
      }),
    },

    organization: {
      update: jest.fn().mockResolvedValue({ id: 'org-updated' }),
      findUnique: jest.fn().mockResolvedValue({ id: 'org-found' }),
    },
  };

  const mockPlayScraper = {
    getApp: jest.fn().mockResolvedValue({
      appId: 'com.alphabank.app',
      title: 'AlphaBank: Conta Digital e Cartão',
      developer: 'AlphaBank S.A.',
      score: 4.7,
      minInstalls: 5000000,
      genre: 'Finance',
    }),
    search: jest.fn().mockResolvedValue([
      { appId: 'com.alphabank.app', title: 'AlphaBank', score: 4.7 },
      { appId: 'com.rivalfin.app', title: 'RivalFin', score: 4.4 },
    ]),
  };

  beforeAll(async () => {
    resetInMemoryDatabase();

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [
        AsoEstimatesController,
        AsoTrendsController,
        AsoAiRecommendationsController,
        ApiKeysController,
        PublicAsoController,
        PlansController,
      ],
      providers: [
        Reflector,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PlayScraperEngineService, useValue: mockPlayScraper },
        AsoEstimatesService,
        AsoTrendsService,
        AsoAiRecommendationsService,
        ApiKeysService,
        ApiKeyAuthGuard,
        PlansService,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .compile();

    estimatesService = moduleRef.get<AsoEstimatesService>(AsoEstimatesService);
    estimatesController = moduleRef.get<AsoEstimatesController>(AsoEstimatesController);
    trendsService = moduleRef.get<AsoTrendsService>(AsoTrendsService);
    trendsController = moduleRef.get<AsoTrendsController>(AsoTrendsController);
    aiService = moduleRef.get<AsoAiRecommendationsService>(AsoAiRecommendationsService);
    aiController = moduleRef.get<AsoAiRecommendationsController>(AsoAiRecommendationsController);
    apiKeysService = moduleRef.get<ApiKeysService>(ApiKeysService);
    apiKeysController = moduleRef.get<ApiKeysController>(ApiKeysController);
    publicAsoController = moduleRef.get<PublicAsoController>(PublicAsoController);
    apiKeyAuthGuard = moduleRef.get<ApiKeyAuthGuard>(ApiKeyAuthGuard);
    plansService = moduleRef.get<PlansService>(PlansService);
    plansController = moduleRef.get<PlansController>(PlansController);
    playScraper = moduleRef.get<PlayScraperEngineService>(PlayScraperEngineService);
  });

  beforeEach(() => {
    resetInMemoryDatabase();
    jest.clearAllMocks();
  });

  // ===========================================================================
  // MÓDULO 1: FASE 29 — ESTIMATIVAS PREDITIVAS DE DOWNLOADS E RECEITA
  // ===========================================================================
  describe('1. Modelos Preditivos de Downloads & Receita (Fase 29)', () => {
    it('deve calcular estimativa com modelo de Pareto e salvar snapshot com bandas de confiança', async () => {
      const estimate = await estimatesController.recalculateAppEstimate(
        'app-alpha-primary',
        tenantAlphaOrgId,
        { country: 'br' },
      );

      expect(estimate).toBeDefined();
      expect(estimate.asoAppId).toBe('app-alpha-primary');
      expect(estimate.category).toBe('FINANCE');
      expect(estimate.calculationMethod).toBe('POWER_LAW_PARETO_V1');
      expect(estimate.confidenceScore).toBeGreaterThanOrEqual(0.6);

      // Verificação de faixas coerentes: Min <= Median <= Max
      expect(estimate.dailyDownloads.min).toBeLessThanOrEqual(estimate.dailyDownloads.median);
      expect(estimate.dailyDownloads.median).toBeLessThanOrEqual(estimate.dailyDownloads.max);
      expect(estimate.dailyRevenue.min).toBeLessThanOrEqual(estimate.dailyRevenue.median);
      expect(estimate.dailyRevenue.median).toBeLessThanOrEqual(estimate.dailyRevenue.max);
      expect(estimate.monthlyDownloads.median).toBeGreaterThan(estimate.dailyDownloads.median);
      expect(estimate.monthlyRevenue.median).toBeGreaterThan(estimate.dailyRevenue.median);
    });

    it('deve retornar resumo histórico e benchmarks do setor', async () => {
      // Cria primeiro uma estimativa
      await estimatesService.calculateAndSaveEstimate('app-alpha-primary', tenantAlphaOrgId, {
        country: 'br',
      });

      const summary = await estimatesController.getAppEstimates(
        'app-alpha-primary',
        tenantAlphaOrgId,
        { country: 'br', days: 30 },
      );

      expect(summary.latestEstimate).toBeDefined();
      expect(summary.history.length).toBeGreaterThan(0);
      expect(summary.growthTrends.downloadGrowthRate7d).toBeDefined();

      const benchmarks = await estimatesController.getCategoryBenchmarks('FINANCE', 'BR');
      expect(benchmarks.category).toBe('FINANCE');
      expect(benchmarks.alpha).toBeGreaterThan(0);
      expect(benchmarks.beta).toBeGreaterThan(0);
    });

    it('deve bloquear consulta de estimativas para aplicativos pertencentes a outro tenant', async () => {
      await expect(
        estimatesController.recalculateAppEstimate('app-beta-rival', tenantAlphaOrgId, { country: 'br' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ===========================================================================
  // MÓDULO 2: FASE 30 — RADAR DE TENDÊNCIAS, BREAKOUTS & ALERTAS
  // ===========================================================================
  describe('2. Monitoramento de Tendências & Breakouts (Fase 30)', () => {
    it('deve calcular Breakout Score multidimensional e gerar resumo da categoria', async () => {
      const summary = await trendsController.getCategoryTrends(
        'FINANCE',
        tenantAlphaOrgId,
        { country: 'BR' },
      );

      expect(summary).toBeDefined();
      expect(summary.category).toBe('FINANCE');
      expect(summary.country).toBe('BR');
      expect(summary.topBreakouts.length).toBeGreaterThan(0);

      const topApp = summary.topBreakouts[0];
      expect(topApp.breakoutScore).toBeGreaterThanOrEqual(0);
      expect(topApp.tractionIndicators.score).toBeDefined();

      expect(summary.trendingKeywords.length).toBeGreaterThan(0);
      expect(summary.trendingKeywords[0].opportunityScore).toBeGreaterThan(0);
    });

    it('deve disparar alertas automáticos e permitir marcação como lido com isolamento de tenant', async () => {
      // Dispara radar para gerar alertas
      await trendsController.getBreakoutApps(tenantAlphaOrgId, { minBreakoutScore: 10 });

      const alerts = await trendsController.getOrganizationAlerts(tenantAlphaOrgId, {});
      expect(alerts.length).toBeGreaterThan(0);

      const alertToRead = alerts[0];
      expect(alertToRead.isRead).toBe(false);

      const updated = await trendsController.markAlertAsRead(alertToRead.id, tenantAlphaOrgId);
      expect(updated.isRead).toBe(true);

      // Tenant rival não pode marcar alerta do outro
      await expect(
        trendsController.markAlertAsRead(alertToRead.id, tenantBetaOrgId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ===========================================================================
  // MÓDULO 3: FASE 31 — RECOMENDAÇÕES DE ASO & CAMPANHAS COM IA
  // ===========================================================================
  describe('3. Recomendações de ASO com Inteligência Artificial (Fase 31)', () => {
    it('deve gerar sugestões de título respeitando o limite do Google Play (máximo 30 chars)', async () => {
      const rec = await aiController.generateRecommendations(
        'app-alpha-primary',
        tenantAlphaOrgId,
        { type: 'TITLE_OPTIMIZATION' },
      );

      expect(rec.type).toBe('TITLE_OPTIMIZATION');
      expect(rec.status).toBe('PENDING');
      expect(rec.suggestions.length).toBeGreaterThan(0);

      rec.suggestions.forEach((item) => {
        expect(item.suggestedValue.length).toBeLessThanOrEqual(30);
        expect(item.impactScore).toBeGreaterThanOrEqual(50);
        expect(item.rationale).toBeDefined();
      });
    });

    it('deve gerar sugestões de descrição respeitando limites de curta (máx 80) e longa (máx 4000)', async () => {
      const rec = await aiController.generateRecommendations(
        'app-alpha-primary',
        tenantAlphaOrgId,
        { type: 'DESCRIPTION_OPTIMIZATION' },
      );

      expect(rec.type).toBe('DESCRIPTION_OPTIMIZATION');
      const shortDesc = rec.suggestions.find((s) => s.field === 'shortDescription');
      expect(shortDesc).toBeDefined();
      expect(shortDesc!.suggestedValue.length).toBeLessThanOrEqual(80);

      const longDesc = rec.suggestions.find((s) => s.field === 'longDescription');
      expect(longDesc).toBeDefined();
      expect(longDesc!.maxCharacters).toBe(4000);
    });

    it('deve suportar ciclo de vida de recomendações (aplicar e descartar com isolamento)', async () => {
      const rec = await aiController.generateRecommendations(
        'app-alpha-primary',
        tenantAlphaOrgId,
        { type: 'KEYWORD_EXPANSION' },
      );

      const applied = await aiController.applyRecommendation(rec.id, tenantAlphaOrgId, {
        suggestionId: rec.suggestions[0].id,
      });
      expect(applied.status).toBe('APPLIED');

      // Tenant rival não pode acessar nem descartar
      await expect(aiController.dismissRecommendation(rec.id, tenantBetaOrgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ===========================================================================
  // MÓDULO 4: FASE 32 — API PÚBLICA COMERCIAL & API KEYS
  // ===========================================================================
  describe('4. API Pública Comercial & Gestão de API Keys (Fase 32)', () => {
    it('deve criar chave com prefixo mgp_live_, salvar hash SHA-256 e listar chaves do tenant', async () => {
      const created = await apiKeysController.createApiKey(tenantAlphaOrgId, {
        name: 'BI Production Key',
        scopes: ['aso:read', 'estimates:read', 'trends:read'],
      });

      expect(created.plainTextKey.startsWith('mgp_live_')).toBe(true);
      expect(created.apiKey.keyPrefix.startsWith('mgp_live_')).toBe(true);
      expect(created.apiKey.scopes).toContain('aso:read');

      const keys = await apiKeysController.listKeys(tenantAlphaOrgId);
      expect(keys.length).toBe(1);
      expect(keys[0].name).toBe('BI Production Key');

      // plainTextKey nunca deve ser exposta na listagem
      expect((keys[0] as any).plainTextKey).toBeUndefined();
    });

    it('deve autenticar requisição da API pública via ApiKeyAuthGuard e injetar headers informativos', async () => {
      const createdKey = await apiKeysService.createApiKey(tenantAlphaOrgId, {
        name: 'Guard Test Key',
        scopes: ['aso:read', 'estimates:read'],
      });

      const mockRequest: any = {
        headers: {
          'x-api-key': createdKey.plainTextKey,
        },
      };

      const setHeaderMock = jest.fn();
      const mockResponse: any = {
        setHeader: setHeaderMock,
      };

      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      };

      const canActivate = await apiKeyAuthGuard.canActivate(mockContext);
      expect(canActivate).toBe(true);
      expect(mockRequest.apiKeyMeta).toBeDefined();
      expect(mockRequest.apiKeyMeta.organizationId).toBe(tenantAlphaOrgId);

      expect(setHeaderMock).toHaveBeenCalledWith('X-RateLimit-Limit', '60');
      expect(setHeaderMock).toHaveBeenCalledWith('X-Quota-Used', '1');
      expect(setHeaderMock).toHaveBeenCalledWith('X-Quota-Remaining', '9999');
    });

    it('deve responder requisições comerciais em PublicAsoController com formato padronizado', async () => {
      const createdKey = await apiKeysService.createApiKey(tenantAlphaOrgId, {
        name: 'Public Test Key',
        scopes: ['aso:read', 'estimates:read'],
      });

      const meta = {
        apiKeyId: createdKey.apiKey.id,
        organizationId: tenantAlphaOrgId,
        keyPrefix: createdKey.apiKey.keyPrefix,
        quotaUsed: 1,
        quotaRemaining: 9999,
        rateLimitPerMin: 60,
      };

      const res = await publicAsoController.getAppEstimates('com.alphabank.app', { country: 'BR' }, meta as any);
      expect(res.meta.requestId).toBeDefined();
      expect(res.meta.version).toBe('v1');
      expect(res.data.appId).toBe('com.alphabank.app');
      expect(res.data.latestEstimate.dailyDownloads.median).toBeGreaterThan(0);
    });

    it('deve revogar chave de API e bloquear requisições subsequentes', async () => {
      const createdKey = await apiKeysService.createApiKey(tenantAlphaOrgId, {
        name: 'Key To Revoke',
        scopes: ['aso:read'],
      });

      await apiKeysController.revokeKey(createdKey.apiKey.id, tenantAlphaOrgId);

      const mockRequest: any = {
        headers: { 'x-api-key': createdKey.plainTextKey },
      };
      const mockContext: any = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
          getResponse: () => ({ setHeader: jest.fn() }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      };

      await expect(apiKeyAuthGuard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ===========================================================================
  // MÓDULO 5: FASE 33 — PLANOS SAAS, QUOTAS DINÂMICAS & ASSINATURA
  // ===========================================================================
  describe('5. Motor de Planos SaaS & Quotas Dinâmicas (Fase 33)', () => {
    it('deve listar o catálogo dos 4 planos com ciclo mensal e anual (20% OFF)', () => {
      const plans = plansController.listPlans();
      expect(plans.length).toBe(4);

      const tiers = plans.map((p) => p.tier);
      expect(tiers).toEqual(['FREE', 'STARTER', 'PRO', 'BUSINESS']);

      const proPlan = plans.find((p) => p.tier === 'PRO')!;
      expect(proPlan.priceMonthlyBrl).toBe(149);
      expect(proPlan.priceYearlyMonthlyBrl).toBe(119);
      expect(proPlan.priceYearlyTotalBrl).toBe(1428); // 119 * 12
      expect(proPlan.limits.maxMonitoredApps).toBe(10);
      expect(proPlan.limits.hasSmartBidding).toBe(true);
    });

    it('deve auto-inicializar plano FREE para nova organização e calcular consumo em tempo real', async () => {
      const orgPlan = await plansController.getOrganizationPlan('org-fresh-startup-uuid');

      expect(orgPlan.subscription.planTier).toBe('FREE');
      expect(orgPlan.subscription.status).toBe('ACTIVE');
      expect(orgPlan.plan.name).toBe('Plano Gratuito');
      expect(orgPlan.usage.appsLimit).toBe(1);
      expect(orgPlan.usage.appsUsed).toBe(0);
    });

    it('deve bloquear criação de recursos adicionais através do guard preventivo checkQuota', async () => {
      // tenantAlpha já possui 1 app monitorado (app-alpha-primary). No plano FREE, o limite é 1.
      await expect(
        plansService.checkQuota(tenantAlphaOrgId, 'apps'),
      ).rejects.toThrow(ForbiddenException);

      try {
        await plansService.checkQuota(tenantAlphaOrgId, 'apps');
      } catch (err: any) {
        expect(err.getResponse().code).toBe('QUOTA_EXCEEDED');
        expect(err.getResponse().resource).toBe('apps');
        expect(err.getResponse().upgradeUrl).toBe('/plans');
      }
    });

    it('deve efetivar upgrade de plano de FREE para PRO e expandir limites imediatamente', async () => {
      const upgradeRes = await plansController.subscribeOrChangePlan(tenantAlphaOrgId, {
        planTier: 'PRO',
        billingCycle: 'YEARLY',
      });

      expect(upgradeRes.subscription.planTier).toBe('PRO');
      expect(upgradeRes.subscription.billingCycle).toBe('YEARLY');

      // Verifica novos limites ativos
      const currentPlan = await plansController.getOrganizationPlan(tenantAlphaOrgId);
      expect(currentPlan.plan.tier).toBe('PRO');
      expect(currentPlan.usage.appsLimit).toBe(10);
      expect(currentPlan.usage.keywordsLimit).toBeGreaterThanOrEqual(100);

      // Agora checkQuota de apps deve passar sem erro
      const checkResult = await plansService.checkQuota(tenantAlphaOrgId, 'apps');
      expect(checkResult).toBe(true);
    });

    it('deve permitir cancelamento elegante mantendo vigência até o final do período', async () => {
      // Garante que a organização possui uma assinatura ativa
      await plansController.getOrganizationPlan(tenantAlphaOrgId);

      const cancelRes = await plansController.cancelSubscription(tenantAlphaOrgId);
      expect(cancelRes.canceledAt).toBeDefined();
      expect(cancelRes.status).toBe('ACTIVE');

      const planAfterCancel = await plansController.getOrganizationPlan(tenantAlphaOrgId);
      expect(planAfterCancel.subscription.canceledAt).toBeDefined();
    });
  });

  // ===========================================================================
  // MÓDULO 6: JORNADA COMPLETA INTEGRADA END-TO-END (ORQUESTRAÇÃO ETAPA 5)
  // ===========================================================================
  describe('6. Jornada Integrada E2E (Onboarding, Quotas, Up-sell, IA, Predição e API Comercial)', () => {
    it('deve executar o fluxo comercial e técnico completo de um cliente MGP', async () => {
      const journeyOrgId = 'org-fintech-super-journey';

      // 1. Cliente novo entra na plataforma -> Plano FREE auto-inicializado
      const initialPlan = await plansController.getOrganizationPlan(journeyOrgId);
      expect(initialPlan.subscription.planTier).toBe('FREE');
      expect(initialPlan.usage.appsUsed).toBe(0);

      // 2. Cliente monitora o 1º app (dentro da cota gratuita)
      dbApps.push({
        id: 'app-journey-1',
        organizationId: journeyOrgId,
        appId: 'com.journey.app',
        title: 'Journey App Financeiro',
        developer: 'Journey Dev',
        genre: 'Finance',
        score: 4.6,
        ratings: 50000,
        reviews: 12000,
        minInstalls: 1000000,
        country: 'br',
        isMonitored: true,
        isCompetitor: false,
        trackedKeywords: [],
      });

      // 3. Cliente tenta adicionar o 2º app -> Quota estoura e bloqueia
      await expect(plansService.checkQuota(journeyOrgId, 'apps')).rejects.toThrow(
        ForbiddenException,
      );

      // 4. Cliente faz Upgrade para o plano STARTER no ciclo Anual (20% OFF)
      const upgradeStarter = await plansController.subscribeOrChangePlan(journeyOrgId, {
        planTier: 'STARTER',
        billingCycle: 'YEARLY',
      });
      expect(upgradeStarter.subscription.planTier).toBe('STARTER');

      // Limite agora é 3 apps
      const afterUpgradePlan = await plansController.getOrganizationPlan(journeyOrgId);
      expect(afterUpgradePlan.usage.appsLimit).toBe(3);
      expect(await plansService.checkQuota(journeyOrgId, 'apps')).toBe(true);

      // 5. Cliente monitora o 2º app com sucesso
      dbApps.push({
        id: 'app-journey-2',
        organizationId: journeyOrgId,
        appId: 'com.journey.crypto',
        title: 'Journey Crypto & Web3',
        developer: 'Journey Dev',
        genre: 'Finance',
        score: 4.8,
        ratings: 70000,
        reviews: 16000,
        minInstalls: 2000000,
        country: 'br',
        isMonitored: true,
        isCompetitor: false,
        trackedKeywords: [],
      });

      // 6. Otimização com IA: gera recomendações de título dentro das regras do Google Play
      const aiRec = await aiController.generateRecommendations(
        'app-journey-1',
        journeyOrgId,
        { type: 'TITLE_OPTIMIZATION' },
      );
      expect(aiRec.suggestions[0].suggestedValue.length).toBeLessThanOrEqual(30);

      // 7. Modela downloads e receita previstos para o app concorrente no mercado (Pareto)
      const estimate = await estimatesController.recalculateAppEstimate(
        'app-journey-1',
        journeyOrgId,
        { country: 'br' },
      );
      expect(estimate.monthlyDownloads.median).toBeGreaterThan(0);
      expect(estimate.monthlyRevenue.median).toBeGreaterThan(0);

      // 8. O cliente gera uma API Key para sincronizar métricas com seu PowerBI / Tableau
      const commercialKey = await apiKeysController.createApiKey(journeyOrgId, {
        name: 'Data Team Connector',
        scopes: ['aso:read', 'estimates:read'],
      });
      expect(commercialKey.plainTextKey).toBeDefined();

      // 9. O time de BI consome o endpoint comercial público via API Key
      const authMeta = {
        apiKeyId: commercialKey.apiKey.id,
        organizationId: journeyOrgId,
        keyPrefix: commercialKey.apiKey.keyPrefix,
        quotaUsed: 1,
        quotaRemaining: 4999,
        rateLimitPerMin: 60,
      };

      const publicAsoResult = await publicAsoController.getAppDetails('com.journey.app', { country: 'BR' }, authMeta as any);
      expect(publicAsoResult.data.appId).toBe('com.journey.app');
      expect(publicAsoResult.meta.version).toBe('v1');

      // 10. Consulta final do painel de planos reflete os 2 apps e a API Key consumida
      const finalPlanUsage = await plansController.getOrganizationPlan(journeyOrgId);
      expect(finalPlanUsage.usage.appsUsed).toBe(2);
      expect(finalPlanUsage.usage.appsLimit).toBe(3);
    });
  });
});
