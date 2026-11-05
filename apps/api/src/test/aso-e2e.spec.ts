import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AppConfigService } from '../config/app-config.service';
import { PlayScraperEngineService } from '../modules/aso/services/play-scraper-engine.service';
import { AsoCacheService } from '../modules/aso/services/aso-cache.service';
import { AsoRateLimiterService } from '../modules/aso/services/aso-rate-limiter.service';
import { AsoAppsService } from '../modules/aso/services/aso-apps.service';
import { AsoKeywordsService } from '../modules/aso/services/aso-keywords.service';
import { AsoAuditService } from '../modules/aso/services/aso-audit.service';
import { AsoQueueService } from '../modules/aso/services/aso-queue.service';
import { AsoController } from '../modules/aso/controllers/aso.controller';
import { PlayScraperController } from '../modules/aso/controllers/play-scraper.controller';
import { TenantGuard } from '../common/guards/tenant.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AsoJobType, ASO_QUEUES } from '@mgp/contracts';

describe('Suíte de Testes Ponta a Ponta (E2E) e Homologação — ETAPA 2 (ASO Studio)', () => {
  let scraperEngine: PlayScraperEngineService;
  let cacheService: AsoCacheService;
  let rateLimiter: AsoRateLimiterService;
  let appsService: AsoAppsService;
  let keywordsService: AsoKeywordsService;
  let auditService: AsoAuditService;
  let queueService: AsoQueueService;
  let asoController: AsoController;
  let playScraperController: PlayScraperController;

  const tenantOrgA = 'org-tenant-alpha-uuid';
  const tenantOrgB = 'org-tenant-beta-uuid';

  const mockAppScraped = {
    appId: 'com.nu.production',
    title: 'Nubank: conta, cartão e mais',
    summary: 'Conta digital completa, rendimento e cartão sem anuidade.',
    description: 'O aplicativo do Nu nasceu para devolver o controle da sua vida financeira... '.repeat(35),
    developer: 'Nu Pagamentos S.A.',
    developerId: 'Nu+Pagamentos+S.A.',
    score: 4.8,
    ratings: 2500000,
    reviews: 800000,
    minInstalls: 50000000,
    maxInstalls: 100000000,
    free: true,
    price: 0,
    genre: 'Finanças',
    genreId: 'FINANCE',
    icon: 'https://play-lh.googleusercontent.com/icon-nu.png',
    screenshots: [
      'https://screenshot1.png',
      'https://screenshot2.png',
      'https://screenshot3.png',
      'https://screenshot4.png',
      'https://screenshot5.png',
      'https://screenshot6.png',
    ],
    url: 'https://play.google.com/store/apps/details?id=com.nu.production',
  };

  const mockPrisma: Record<string, any> = {
    asoApp: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    asoKeyword: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    asoAppKeyword: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    asoKeywordRankingHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    asoAuditScore: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockQueueClient = {
    add: jest.fn().mockImplementation((name, data) =>
      Promise.resolve({ id: `job-${Date.now()}`, name, data }),
    ),
    getWaitingCount: jest.fn().mockResolvedValue(0),
    getActiveCount: jest.fn().mockResolvedValue(1),
    getCompletedCount: jest.fn().mockResolvedValue(50),
    getFailedCount: jest.fn().mockResolvedValue(0),
    getDelayedCount: jest.fn().mockResolvedValue(0),
    isPaused: jest.fn().mockResolvedValue(false),
    close: jest.fn().mockResolvedValue(undefined),
  };

  const mockScraperClient = {
    app: jest.fn().mockResolvedValue(mockAppScraped),
    search: jest.fn().mockResolvedValue([
      { appId: 'com.competitor.app', title: 'Competidor Digital' },
      { appId: 'com.nu.production', title: 'Nubank' },
    ]),
    suggest: jest.fn().mockResolvedValue(['nubank', 'nubank conta', 'nubank cartao']),
    list: jest.fn().mockResolvedValue([mockAppScraped]),
    categories: jest.fn().mockResolvedValue(['FINANCE', 'SHOPPING', 'TOOLS']),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AsoController, PlayScraperController],
      providers: [
        PlayScraperEngineService,
        AsoCacheService,
        AsoRateLimiterService,
        AsoAppsService,
        AsoKeywordsService,
        AsoAuditService,
        AsoQueueService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: AppConfigService,
          useValue: {
            redisUrl: 'redis://localhost:6379',
            isProduction: false,
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .compile();

    scraperEngine = module.get<PlayScraperEngineService>(PlayScraperEngineService);
    cacheService = module.get<AsoCacheService>(AsoCacheService);
    rateLimiter = module.get<AsoRateLimiterService>(AsoRateLimiterService);
    appsService = module.get<AsoAppsService>(AsoAppsService);
    keywordsService = module.get<AsoKeywordsService>(AsoKeywordsService);
    auditService = module.get<AsoAuditService>(AsoAuditService);
    queueService = module.get<AsoQueueService>(AsoQueueService);
    asoController = module.get<AsoController>(AsoController);
    playScraperController = module.get<PlayScraperController>(PlayScraperController);

    // Injeta clients mockados para testes sem IO de rede externa
    scraperEngine.setScraperClient(mockScraperClient);
    queueService.setQueueClient(mockQueueClient);
  });

  // ===========================================================================
  // 1. MOTOR DE COLETA, CACHE & RATE LIMITER (FASE 11)
  // ===========================================================================
  describe('1. Motor de Coleta, Cache Redis e Rate Limiter (Fase 11)', () => {
    it('deve obter e normalizar metadados completos de um app na Google Play Store', async () => {
      const app = await scraperEngine.getApp('com.nu.production', { country: 'br', lang: 'pt' });

      expect(app).toBeDefined();
      expect(app.appId).toBe('com.nu.production');
      expect(app.title).toBe(mockAppScraped.title);
      expect(app.score).toBe(4.8);
      expect(app.screenshots).toHaveLength(6);
      expect(mockScraperClient.app).toHaveBeenCalledWith({
        appId: 'com.nu.production',
        country: 'br',
        lang: 'pt',
      });
    });

    it('deve utilizar cache inteligente (Cache HIT) em consultas consecutivas', async () => {
      // 1ª Chamada: Popula o cache
      await scraperEngine.getApp('com.nu.production', { country: 'br', lang: 'pt' });
      const callsCountAfterFirst = mockScraperClient.app.mock.calls.length;

      // 2ª Chamada: Deve retornar do cache em memória/redis sem invocar o scraper novamente
      const cachedApp = await scraperEngine.getApp('com.nu.production', { country: 'br', lang: 'pt' });
      expect(cachedApp.appId).toBe('com.nu.production');
      expect(mockScraperClient.app.mock.calls.length).toBe(callsCountAfterFirst);
    });

    it('deve buscar rankings e retornar posição do aplicativo para busca orgânica', async () => {
      const searchResults = await scraperEngine.search('cartao de credito', {
        country: 'br',
        lang: 'pt',
        num: 10,
      });

      expect(searchResults).toHaveLength(2);
      expect(searchResults[1].appId).toBe('com.nu.production');
    });

    it('PlayScraperController - deve expor endpoints utilitários de busca e sugestão', async () => {
      const suggestResult = await playScraperController.suggest({ term: 'nubank', country: 'br', lang: 'pt' });
      expect(suggestResult).toContain('nubank');

      const appResult = await playScraperController.getApp('com.nu.production', { country: 'br', lang: 'pt' });
      expect(appResult.appId).toBe('com.nu.production');
    });
  });

  // ===========================================================================
  // 2. MODELAGEM DE DADOS RELACIONAL & ZERO DATA LEAKAGE (FASE 12)
  // ===========================================================================
  describe('2. Modelagem Relacional Prisma & Isolamento Multi-Tenant (Fase 12)', () => {
    it('deve garantir que o modelo AsoApp possui restrição de unicidade por (organizationId, appId)', async () => {
      mockPrisma.asoApp.findUnique.mockResolvedValueOnce({
        id: 'existing-app-uuid',
        organizationId: tenantOrgA,
        appId: 'com.nu.production',
        isMonitored: true,
      });

      await expect(
        appsService.trackApp(tenantOrgA, { appId: 'com.nu.production' }),
      ).rejects.toThrow(ConflictException);
    });

    it('deve isolar estritamente aplicativos entre organizações diferentes (Zero Data Leakage)', async () => {
      // Org B tenta acessar app da Org A
      mockPrisma.asoApp.findFirst.mockResolvedValueOnce(null);

      await expect(
        appsService.getAppById(tenantOrgB, 'app-da-org-a'),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.asoApp.findFirst).toHaveBeenCalledWith({
        where: { id: 'app-da-org-a', organizationId: tenantOrgB },
        include: expect.any(Object),
      });
    });
  });

  // ===========================================================================
  // 3. BACKEND CENTRAL ASO: SERVIÇOS & REST CONTROLLER (FASE 13)
  // ===========================================================================
  describe('3. Backend Central ASO (Fase 13)', () => {
    it('AsoAppsService: trackApp deve coletar metadados, criar registro e disparar auditoria inicial', async () => {
      mockPrisma.asoApp.findUnique.mockResolvedValueOnce(null);

      const createdAppRecord = {
        id: 'aso-app-new-uuid',
        organizationId: tenantOrgA,
        appId: 'com.nu.production',
        title: mockAppScraped.title,
        score: mockAppScraped.score,
        ratings: mockAppScraped.ratings,
        metadata: mockAppScraped,
      };

      mockPrisma.asoApp.create.mockResolvedValueOnce(createdAppRecord);
      mockPrisma.asoApp.findFirst.mockResolvedValueOnce(createdAppRecord);
      mockPrisma.asoAuditScore.create.mockResolvedValueOnce({
        id: 'initial-audit-uuid',
        overallScore: 92,
      });

      const tracked = await appsService.trackApp(tenantOrgA, {
        appId: 'com.nu.production',
        isCompetitor: false,
        country: 'br',
        lang: 'pt',
      });

      expect(tracked).toBeDefined();
      expect(tracked.appId).toBe('com.nu.production');
      expect(mockPrisma.asoApp.create).toHaveBeenCalled();
      expect(mockPrisma.asoAuditScore.create).toHaveBeenCalled();
    });

    it('AsoKeywordsService: trackKeyword deve associar termo ao app, checar rank e gravar snapshot histórico', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValueOnce({
        id: 'aso-app-new-uuid',
        organizationId: tenantOrgA,
        appId: 'com.nu.production',
        country: 'br',
        lang: 'pt',
      });

      mockPrisma.asoKeyword.upsert.mockResolvedValueOnce({
        id: 'kw-uuid-1',
        keyword: 'banco digital',
        country: 'br',
        lang: 'pt',
      });

      mockPrisma.asoAppKeyword.findUnique.mockResolvedValueOnce(null); // Palavra ainda não associada

      mockPrisma.asoAppKeyword.create.mockResolvedValueOnce({
        id: 'app-kw-uuid-1',
        asoAppId: 'aso-app-new-uuid',
        keywordId: 'kw-uuid-1',
        currentRank: 2, // Encontrado na 2ª posição do mock
        bestRank: 2,
        tag: 'core',
      });

      mockPrisma.asoKeywordRankingHistory.create.mockResolvedValueOnce({
        id: 'hist-uuid-1',
        appKeywordId: 'app-kw-uuid-1',
        rank: 2,
        recordedAt: new Date(),
      });

      const trackedKw = await keywordsService.trackKeyword(tenantOrgA, 'aso-app-new-uuid', {
        keyword: 'banco digital',
        tag: 'core',
      });

      expect(trackedKw).toBeDefined();
      expect(trackedKw.currentRank).toBe(2);
      expect(mockPrisma.asoKeywordRankingHistory.create).toHaveBeenCalledWith({
        data: {
          appKeywordId: 'app-kw-uuid-1',
          rank: 2,
          recordedAt: expect.any(Date),
        },
      });
    });

    it('AsoAuditService: deve executar auditoria heurística com pesos determinísticos e recomendações', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValueOnce({
        id: 'aso-app-new-uuid',
        organizationId: tenantOrgA,
        title: 'App Título Muito Longo Que Excede Trinta Caracteres Limite Loja',
        metadata: {
          summary: '', // Descrição curta vazia -> Deve penalizar e gerar recomendação HIGH
          description: 'Texto curto',
          screenshots: [],
        },
        score: 2.8, // Nota crítica (< 3.5)
        ratings: 50,
      });

      mockPrisma.asoAuditScore.create.mockImplementationOnce(({ data }: any) => Promise.resolve({ id: 'audit-1', ...data }));

      const audit = await auditService.runAudit(tenantOrgA, 'aso-app-new-uuid');

      expect(audit).toBeDefined();
      expect(audit.overallScore).toBeLessThan(50); // Nota geral baixa devido às infrações
      expect(audit.recommendations).toBeInstanceOf(Array);

      // Deve conter recomendações de severidade HIGH para título, descrição curta e screenshots
      const recs = audit.recommendations as any[];
      const highRecs = recs.filter((r) => r.severity === 'HIGH');
      expect(highRecs.length).toBeGreaterThanOrEqual(3);
    });

    it('AsoController: deve rotear chamadas protegidas por autenticação e tenant', async () => {
      mockPrisma.asoApp.findMany.mockResolvedValueOnce([]);
      mockPrisma.asoApp.count.mockResolvedValueOnce(0);

      const listResponse = await asoController.listApps(
        {},
        tenantOrgA,
        undefined,
        {},
      );

      expect(listResponse.data).toBeDefined();
      expect(listResponse.total).toBe(0);
    });
  });

  // ===========================================================================
  // 4. WORKERS ASSÍNCRONOS BULLMQ & AGENDADOR CRON (FASE 14)
  // ===========================================================================
  describe('4. Workers Assíncronos BullMQ, Pacing e Agendamento Cron (Fase 14)', () => {
    it('AsoQueueService: deve enfileirar sincronização assíncrona com jobId determinístico', async () => {
      const jobEnqueued = await queueService.enqueueSyncAppMetadata('app-uuid-1', tenantOrgA, true);

      expect(jobEnqueued.status).toBe('ENQUEUED');
      expect(jobEnqueued.jobType).toBe(AsoJobType.SYNC_APP_METADATA);
      expect(mockQueueClient.add).toHaveBeenCalledWith(
        AsoJobType.SYNC_APP_METADATA,
        {
          asoAppId: 'app-uuid-1',
          organizationId: tenantOrgA,
          forceAudit: true,
        },
        expect.any(Object),
      );
    });

    it('AsoQueueService: deve retornar telemetria operacional da fila BullMQ', async () => {
      const metrics = await queueService.getQueueMetrics();

      expect(metrics.queueName).toBe(ASO_QUEUES.SYNC);
      expect(metrics.active).toBe(1);
      expect(metrics.completed).toBe(50);
      expect(metrics.failed).toBe(0);
      expect(metrics.paused).toBe(false);
    });

    it('AsoController: rotas de background sync devem despachar para a fila', async () => {
      const syncAsyncRes = await asoController.syncAppAsync('app-uuid-1', tenantOrgA, undefined, {});
      expect(syncAsyncRes.status).toBe('ENQUEUED');

      const batchRankingsRes = await asoController.dispatchRankings(tenantOrgA, undefined, {});
      expect(batchRankingsRes.status).toBe('ENQUEUED');

      const metricsRes = await asoController.getQueueMetrics();
      expect(metricsRes.queueName).toBe(ASO_QUEUES.SYNC);
    });
  });

  // ===========================================================================
  // 5. ALINHAMENTO COM A INTERFACE VISUAL ASO STUDIO (FASE 15)
  // ===========================================================================
  describe('5. Conformidade de Contratos da API com o Frontend Web (Fase 15)', () => {
    it('deve retornar estrutura completa de app com contagem de keywords e score ASO para o catálogo', async () => {
      mockPrisma.asoApp.findMany.mockResolvedValueOnce([
        {
          id: 'app-1',
          organizationId: tenantOrgA,
          title: 'Nubank',
          appId: 'com.nu.production',
          score: 4.8,
          isCompetitor: false,
          _count: { trackedKeywords: 12 },
          auditScores: [{ overallScore: 94 }],
        },
      ]);
      mockPrisma.asoApp.count.mockResolvedValueOnce(1);

      const res = await asoController.listApps({}, tenantOrgA, undefined, {});

      expect(res.data[0]).toHaveProperty('_count');
      expect(res.data[0]._count.trackedKeywords).toBe(12);
      expect(res.data[0].auditScores[0].overallScore).toBe(94);
    });

    it('deve fornecer série temporal de posições no formato consumido pelo componente RankingChart', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValueOnce({ id: 'app-1', organizationId: tenantOrgA });
      mockPrisma.asoAppKeyword.findFirst.mockResolvedValueOnce({
        id: 'akw-1',
        asoAppId: 'app-1',
        keywordId: 'kw-1',
        currentRank: 2,
        bestRank: 1,
      });

      mockPrisma.asoKeywordRankingHistory.findMany.mockResolvedValueOnce([
        { id: 'h-1', rank: 5, recordedAt: new Date('2026-11-01') },
        { id: 'h-2', rank: 3, recordedAt: new Date('2026-11-03') },
        { id: 'h-3', rank: 2, recordedAt: new Date('2026-11-05') },
      ]);

      const historyData = await asoController.getKeywordHistory('app-1', 'kw-1', {}, tenantOrgA, undefined, {});

      expect(historyData.currentRank).toBe(2);
      expect(historyData.bestRank).toBe(1);
      expect(historyData.history).toHaveLength(3);
      expect(historyData.history[0].rank).toBe(5);
      expect(historyData.history[2].rank).toBe(2);
    });
  });
});
