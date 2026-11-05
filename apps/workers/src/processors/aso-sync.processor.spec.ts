import { AsoSyncProcessor } from './aso-sync.processor';
import { AsoJobType } from '@mgp/contracts';

describe('AsoSyncProcessor (Processador Central de Tarefas BullMQ ASO)', () => {
  let processor: AsoSyncProcessor;
  let mockPrisma: any;
  let mockScraper: any;
  let mockAudit: any;
  let mockQueue: any;

  beforeEach(() => {
    mockPrisma = {
      asoApp: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      asoAppKeyword: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      asoKeywordRankingHistory: {
        create: jest.fn(),
      },
      asoAuditScore: {
        create: jest.fn(),
      },
    };

    mockScraper = {
      getApp: jest.fn(),
      searchAppRank: jest.fn(),
    };

    mockAudit = {
      calculateAudit: jest.fn().mockReturnValue({
        overallScore: 88,
        titleScore: 90,
        shortDescriptionScore: 85,
        longDescriptionScore: 90,
        iconScore: 100,
        screenshotsScore: 80,
        ratingsScore: 85,
        recommendations: [],
      }),
    };

    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'enqueued-job-1' }),
    };

    processor = new AsoSyncProcessor(
      mockPrisma,
      mockScraper,
      mockAudit,
      mockQueue,
    );
  });

  it('deve processar com sucesso o job SYNC_APP_METADATA', async () => {
    mockPrisma.asoApp.findFirst.mockResolvedValue({
      id: 'app-1',
      appId: 'com.whatsapp',
      organizationId: 'org-1',
      country: 'br',
      lang: 'pt',
      title: 'WhatsApp Messenger',
    });

    mockScraper.getApp.mockResolvedValue({
      appId: 'com.whatsapp',
      title: 'WhatsApp Messenger Atualizado',
      score: 4.5,
      ratings: 200000000,
      summary: 'Mensagens simples, seguras e gratuitas.',
      description: 'Texto longo...',
      screenshots: ['p1', 'p2', 'p3'],
      icon: 'icon.png',
    });

    mockPrisma.asoApp.update.mockResolvedValue({
      id: 'app-1',
      appId: 'com.whatsapp',
      title: 'WhatsApp Messenger Atualizado',
      score: 4.5,
      ratings: 200000000,
    });

    mockPrisma.asoAuditScore.create.mockResolvedValue({
      id: 'audit-score-1',
      overallScore: 88,
    });

    const job: any = {
      name: AsoJobType.SYNC_APP_METADATA,
      data: {
        asoAppId: 'app-1',
        organizationId: 'org-1',
        forceAudit: true,
      },
    };

    const result = await processor.process(job);

    expect(result.success).toBe(true);
    expect(result.jobType).toBe(AsoJobType.SYNC_APP_METADATA);
    expect(mockScraper.getApp).toHaveBeenCalledWith('com.whatsapp', 'br', 'pt');
    expect(mockPrisma.asoApp.update).toHaveBeenCalled();
    expect(mockPrisma.asoAuditScore.create).toHaveBeenCalled();
  });

  it('deve processar com sucesso o job CHECK_KEYWORD_RANK', async () => {
    mockPrisma.asoAppKeyword.findUnique.mockResolvedValue({
      id: 'app-kw-1',
      asoAppId: 'app-1',
      currentRank: 5,
      bestRank: 3,
      asoApp: { appId: 'com.whatsapp', country: 'br', lang: 'pt' },
      keyword: { keyword: 'mensagens' },
    });

    mockScraper.searchAppRank.mockResolvedValue(2); // Novo rank: 2 (melhorou!)
    mockPrisma.asoAppKeyword.update.mockResolvedValue({
      id: 'app-kw-1',
      currentRank: 2,
      previousRank: 5,
      bestRank: 2,
    });
    mockPrisma.asoKeywordRankingHistory.create.mockResolvedValue({ id: 'hist-1' });

    const job: any = {
      name: AsoJobType.CHECK_KEYWORD_RANK,
      data: {
        asoAppId: 'app-1',
        appKeywordId: 'app-kw-1',
        keyword: 'mensagens',
        appId: 'com.whatsapp',
        country: 'br',
        lang: 'pt',
        organizationId: 'org-1',
      },
    };

    const result = await processor.process(job);

    expect(result.success).toBe(true);
    expect(result.jobType).toBe(AsoJobType.CHECK_KEYWORD_RANK);
    expect(mockScraper.searchAppRank).toHaveBeenCalledWith(
      'mensagens',
      'com.whatsapp',
      'br',
      'pt',
      100,
    );
    expect(mockPrisma.asoAppKeyword.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          previousRank: 5,
          currentRank: 2,
          bestRank: 2,
        }),
      }),
    );
    expect(mockPrisma.asoKeywordRankingHistory.create).toHaveBeenCalled();
  });

  it('deve processar com sucesso o job DISPATCH_DAILY_RANKINGS', async () => {
    mockPrisma.asoAppKeyword.findMany.mockResolvedValue([
      {
        id: 'akw-1',
        asoAppId: 'app-1',
        asoApp: { appId: 'com.app1', country: 'br', lang: 'pt', organizationId: 'org-1' },
        keyword: { keyword: 'kw1' },
      },
      {
        id: 'akw-2',
        asoAppId: 'app-1',
        asoApp: { appId: 'com.app1', country: 'br', lang: 'pt', organizationId: 'org-1' },
        keyword: { keyword: 'kw2' },
      },
    ]);

    const job: any = {
      name: AsoJobType.DISPATCH_DAILY_RANKINGS,
      data: { organizationId: 'org-1' },
    };

    const result = await processor.process(job);

    expect(result.success).toBe(true);
    expect(result.data?.totalDispatched).toBe(2);
    expect(mockQueue.add).toHaveBeenCalledTimes(2);
  });

  it('deve processar com sucesso o job DISPATCH_METADATA_SYNC', async () => {
    mockPrisma.asoApp.findMany.mockResolvedValue([
      { id: 'app-1', organizationId: 'org-1' },
      { id: 'app-2', organizationId: 'org-1' },
      { id: 'app-3', organizationId: 'org-1' },
    ]);

    const job: any = {
      name: AsoJobType.DISPATCH_METADATA_SYNC,
      data: { organizationId: 'org-1' },
    };

    const result = await processor.process(job);

    expect(result.success).toBe(true);
    expect(result.data?.totalDispatched).toBe(3);
    expect(mockQueue.add).toHaveBeenCalledTimes(3);
  });

  it('deve processar com sucesso o job AUDIT_APP', async () => {
    mockPrisma.asoApp.findFirst.mockResolvedValue({
      id: 'app-1',
      title: 'App Teste',
      metadata: { screenshots: [] },
    });
    mockPrisma.asoAuditScore.create.mockResolvedValue({
      id: 'score-1',
      auditDate: new Date(),
    });

    const job: any = {
      name: AsoJobType.AUDIT_APP,
      data: { asoAppId: 'app-1', organizationId: 'org-1' },
    };

    const result = await processor.process(job);

    expect(result.success).toBe(true);
    expect(result.jobType).toBe(AsoJobType.AUDIT_APP);
    expect(mockPrisma.asoAuditScore.create).toHaveBeenCalled();
  });

  it('deve rejeitar tipo de job não suportado', async () => {
    const job: any = {
      name: 'INVALID_JOB_TYPE',
      data: {},
    };

    await expect(processor.process(job)).rejects.toThrow(
      'Tipo de job desconhecido ou não suportado',
    );
  });
});

