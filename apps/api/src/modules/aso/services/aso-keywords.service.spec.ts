import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AsoKeywordsService } from './aso-keywords.service';
import { PrismaService } from '../../../database/prisma.service';
import { PlayScraperEngineService } from './play-scraper-engine.service';

describe('AsoKeywordsService (Inteligência e Rastreamento de Palavras-Chave)', () => {
  let service: AsoKeywordsService;
  let prisma: PrismaService;
  let scraper: PlayScraperEngineService;

  const mockApp = {
    id: 'aso-app-1',
    organizationId: 'org-1',
    appId: 'com.whatsapp',
    title: 'WhatsApp Messenger',
    country: 'br',
    lang: 'pt-BR',
  };

  const mockKeyword = {
    id: 'kw-1',
    keyword: 'mensageiro',
    country: 'br',
    lang: 'pt-BR',
    searchVolume: 80,
  };

  const mockAppKeyword = {
    id: 'app-kw-1',
    asoAppId: 'aso-app-1',
    keywordId: 'kw-1',
    currentRank: 2,
    previousRank: null,
    bestRank: 2,
    tag: 'core',
    isActive: true,
    keyword: mockKeyword,
  };

  const mockPrisma = {
    asoApp: {
      findFirst: jest.fn(),
    },
    asoKeyword: {
      upsert: jest.fn(),
    },
    asoAppKeyword: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    asoKeywordRankingHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsoKeywordsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: PlayScraperEngineService,
          useValue: {
            search: jest.fn().mockResolvedValue([
              { appId: 'com.other.app', title: 'Other' },
              { appId: 'com.whatsapp', title: 'WhatsApp' },
            ]),
          },
        },
      ],
    }).compile();

    service = module.get<AsoKeywordsService>(AsoKeywordsService);
    prisma = module.get<PrismaService>(PrismaService);
    scraper = module.get<PlayScraperEngineService>(PlayScraperEngineService);

    jest.clearAllMocks();
  });

  describe('trackKeyword', () => {
    it('deve vincular palavra-chave, identificar ranking na busca e registrar ponto histórico', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValue(mockApp);
      mockPrisma.asoKeyword.upsert.mockResolvedValue(mockKeyword);
      mockPrisma.asoAppKeyword.findUnique.mockResolvedValue(null);
      mockPrisma.asoAppKeyword.create.mockResolvedValue(mockAppKeyword);

      const result = await service.trackKeyword('org-1', 'aso-app-1', {
        keyword: 'mensageiro',
        tag: 'core',
      });

      expect(result).toEqual(mockAppKeyword);
      expect(scraper.search).toHaveBeenCalledWith('mensageiro', {
        country: 'br',
        lang: 'pt-BR',
        num: 100,
      });
      expect(mockPrisma.asoAppKeyword.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            currentRank: 2,
            bestRank: 2,
          }),
        }),
      );
      expect(mockPrisma.asoKeywordRankingHistory.create).toHaveBeenCalledWith({
        data: {
          appKeywordId: mockAppKeyword.id,
          rank: 2,
          recordedAt: expect.any(Date),
        },
      });
    });

    it('deve lançar NotFoundException se o app não pertencer à organização', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValue(null);

      await expect(
        service.trackKeyword('org-1', 'app-inexistente', { keyword: 'chat' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ConflictException se a keyword já estiver ativa para este app', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValue(mockApp);
      mockPrisma.asoKeyword.upsert.mockResolvedValue(mockKeyword);
      mockPrisma.asoAppKeyword.findUnique.mockResolvedValue({
        ...mockAppKeyword,
        isActive: true,
      });

      await expect(
        service.trackKeyword('org-1', 'aso-app-1', { keyword: 'mensageiro' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('listTrackedKeywords', () => {
    it('deve listar palavras-chave ativas vinculadas ao app', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValue(mockApp);
      mockPrisma.asoAppKeyword.findMany.mockResolvedValue([mockAppKeyword]);

      const result = await service.listTrackedKeywords('org-1', 'aso-app-1');

      expect(result).toEqual([mockAppKeyword]);
      expect(mockPrisma.asoAppKeyword.findMany).toHaveBeenCalled();
    });
  });

  describe('checkRank', () => {
    it('deve forçar rechecagem de ranking e atualizar posições atual e anterior', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValue(mockApp);
      mockPrisma.asoAppKeyword.findFirst.mockResolvedValue({
        ...mockAppKeyword,
        currentRank: 5,
        bestRank: 3,
      });
      // Scraper retorna no index 0 (rank 1)
      (scraper.search as jest.Mock).mockResolvedValue([
        { appId: 'com.whatsapp', title: 'WhatsApp' },
      ]);
      mockPrisma.asoAppKeyword.update.mockResolvedValue({
        ...mockAppKeyword,
        previousRank: 5,
        currentRank: 1,
        bestRank: 1,
      });

      const result = await service.checkRank('org-1', 'aso-app-1', 'kw-1');

      expect(result.currentRank).toBe(1);
      expect(result.previousRank).toBe(5);
      expect(mockPrisma.asoAppKeyword.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            previousRank: 5,
            currentRank: 1,
            bestRank: 1,
          }),
        }),
      );
      expect(mockPrisma.asoKeywordRankingHistory.create).toHaveBeenCalled();
    });
  });

  describe('getKeywordHistory', () => {
    it('deve retornar histórico temporal de rankings de uma keyword', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValue(mockApp);
      mockPrisma.asoAppKeyword.findFirst.mockResolvedValue(mockAppKeyword);
      const mockHistory = [{ id: 'hist-1', rank: 2, recordedAt: new Date() }];
      mockPrisma.asoKeywordRankingHistory.findMany.mockResolvedValue(mockHistory);

      const result = await service.getKeywordHistory('org-1', 'aso-app-1', 'kw-1', 30);

      expect(result.keywordId).toBe('kw-1');
      expect(result.history).toEqual(mockHistory);
    });
  });

  describe('untrackKeyword', () => {
    it('deve desvincular a palavra-chave com sucesso', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValue(mockApp);
      mockPrisma.asoAppKeyword.findFirst.mockResolvedValue(mockAppKeyword);
      mockPrisma.asoAppKeyword.delete.mockResolvedValue(mockAppKeyword);

      const result = await service.untrackKeyword('org-1', 'aso-app-1', 'kw-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.asoAppKeyword.delete).toHaveBeenCalledWith({
        where: { id: mockAppKeyword.id },
      });
    });
  });
});

