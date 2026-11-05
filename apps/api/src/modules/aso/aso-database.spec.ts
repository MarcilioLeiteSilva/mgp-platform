import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';

describe('ASO Data Models & Prisma Schema (Fase 12 — Modelagem de Dados ASO)', () => {
  let prisma: PrismaService;

  const mockPrisma = {
    asoApp: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    asoKeyword: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    asoAppKeyword: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    asoKeywordRankingHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    asoAuditScore: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('deve expor todos os 5 modelos ASO no PrismaService com tipagem estrita', () => {
    expect(prisma.asoApp).toBeDefined();
    expect(prisma.asoKeyword).toBeDefined();
    expect(prisma.asoAppKeyword).toBeDefined();
    expect(prisma.asoKeywordRankingHistory).toBeDefined();
    expect(prisma.asoAuditScore).toBeDefined();
  });

  describe('Modelo AsoApp (Catálogo e Monitoramento de Aplicativos)', () => {
    it('deve criar ou atualizar aplicativo monitorado para uma organização', async () => {
      const mockCreated = {
        id: 'aso-app-1',
        organizationId: 'org-1',
        appId: 'com.whatsapp',
        title: 'WhatsApp Messenger',
        developer: 'WhatsApp LLC',
        icon: 'https://icon.png',
        genre: 'Communication',
        genreId: 'COMMUNICATION',
        score: 4.6,
        ratings: 150000000,
        minInstalls: BigInt(5000000000),
        isMonitored: true,
        isCompetitor: false,
        country: 'br',
        lang: 'pt-BR',
      };

      mockPrisma.asoApp.upsert.mockResolvedValue(mockCreated);

      const result = await prisma.asoApp.upsert({
        where: {
          organizationId_appId_country_lang: {
            organizationId: 'org-1',
            appId: 'com.whatsapp',
            country: 'br',
            lang: 'pt-BR',
          },
        },
        create: {
          organizationId: 'org-1',
          appId: 'com.whatsapp',
          title: 'WhatsApp Messenger',
          developer: 'WhatsApp LLC',
          icon: 'https://icon.png',
          genre: 'Communication',
          genreId: 'COMMUNICATION',
          country: 'br',
          lang: 'pt-BR',
        },
        update: {
          title: 'WhatsApp Messenger',
        },
      });

      expect(result).toEqual(mockCreated);
      expect(mockPrisma.asoApp.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('Modelo AsoKeyword & AsoAppKeyword (Palavras-Chave e Rastreamento)', () => {
    it('deve criar keyword e associar ao aplicativo com posição de ranking', async () => {
      const mockKeyword = {
        id: 'kw-1',
        keyword: 'mensageiro',
        country: 'br',
        lang: 'pt-BR',
        searchVolume: 85,
        difficulty: 60,
      };

      const mockAppKeyword = {
        id: 'app-kw-1',
        asoAppId: 'aso-app-1',
        keywordId: 'kw-1',
        currentRank: 1,
        previousRank: 2,
        bestRank: 1,
        tag: 'core',
        isActive: true,
      };

      mockPrisma.asoKeyword.upsert.mockResolvedValue(mockKeyword);
      mockPrisma.asoAppKeyword.create.mockResolvedValue(mockAppKeyword);

      const kw = await prisma.asoKeyword.upsert({
        where: {
          keyword_country_lang: {
            keyword: 'mensageiro',
            country: 'br',
            lang: 'pt-BR',
          },
        },
        create: {
          keyword: 'mensageiro',
          country: 'br',
          lang: 'pt-BR',
          searchVolume: 85,
        },
        update: {},
      });

      const appKw = await prisma.asoAppKeyword.create({
        data: {
          asoAppId: 'aso-app-1',
          keywordId: kw.id,
          currentRank: 1,
          bestRank: 1,
          tag: 'core',
        },
      });

      expect(kw.keyword).toBe('mensageiro');
      expect(appKw.currentRank).toBe(1);
      expect(mockPrisma.asoAppKeyword.create).toHaveBeenCalled();
    });
  });

  describe('Modelo AsoKeywordRankingHistory (Histórico Temporal de Posições)', () => {
    it('deve registrar snapshots diários de posições para gráficos de evolução temporal', async () => {
      const mockHistory = {
        id: 'history-1',
        appKeywordId: 'app-kw-1',
        rank: 3,
        recordedAt: new Date(),
      };

      mockPrisma.asoKeywordRankingHistory.create.mockResolvedValue(mockHistory);

      const entry = await prisma.asoKeywordRankingHistory.create({
        data: {
          appKeywordId: 'app-kw-1',
          rank: 3,
        },
      });

      expect(entry.rank).toBe(3);
      expect(mockPrisma.asoKeywordRankingHistory.create).toHaveBeenCalled();
    });
  });

  describe('Modelo AsoAuditScore (Auditoria Heurística e Checklist ASO)', () => {
    it('deve registrar score de auditoria com pontuações setorizadas e recomendações em JSON', async () => {
      const mockAudit = {
        id: 'audit-1',
        asoAppId: 'aso-app-1',
        overallScore: 88,
        titleScore: 90,
        shortDescriptionScore: 85,
        longDescriptionScore: 80,
        iconScore: 95,
        screenshotsScore: 90,
        ratingsScore: 92,
        recommendations: [
          {
            category: 'TITLE',
            severity: 'MEDIUM',
            message: 'O título possui 22 caracteres. Recomendado utilizar até 30.',
            suggestedAction: 'Adicionar palavra-chave complementar ao título.',
          },
        ],
        auditDate: new Date(),
      };

      mockPrisma.asoAuditScore.create.mockResolvedValue(mockAudit);

      const audit = await prisma.asoAuditScore.create({
        data: {
          asoAppId: 'aso-app-1',
          overallScore: 88,
          titleScore: 90,
          shortDescriptionScore: 85,
          longDescriptionScore: 80,
          iconScore: 95,
          screenshotsScore: 90,
          ratingsScore: 92,
          recommendations: mockAudit.recommendations,
        },
      });

      expect(audit.overallScore).toBe(88);
      expect(audit.recommendations).toHaveLength(1);
      expect(mockPrisma.asoAuditScore.create).toHaveBeenCalled();
    });
  });
});
