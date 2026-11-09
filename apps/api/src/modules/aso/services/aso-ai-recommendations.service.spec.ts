import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AsoAiRecommendationsService } from './aso-ai-recommendations.service';
import { PrismaService } from '../../../database/prisma.service';

describe('AsoAiRecommendationsService (Otimização ASO & Campanhas com IA)', () => {
  let service: AsoAiRecommendationsService;
  let prisma: any;

  const mockApp = {
    id: 'app-ai-1',
    organizationId: 'org-test-1',
    appId: 'com.growth.fintech',
    title: 'Fintech App',
    developer: 'Growth Lab',
    genre: 'FINANCE',
    genreId: 'FINANCE',
    score: 4.5,
    ratings: 12000,
    metadata: {
      categoryRank: 5,
    },
    trackedKeywords: [
      {
        keyword: {
          keyword: 'finanças',
        },
      },
      {
        keyword: {
          keyword: 'controle de gastos',
        },
      },
    ],
  };

  const mockRecommendation = {
    id: 'rec-ai-1',
    organizationId: 'org-test-1',
    asoAppId: 'app-ai-1',
    type: 'TITLE_OPTIMIZATION',
    status: 'ACTIVE',
    category: 'FINANCE',
    targetKeywords: ['finanças', 'investimentos'],
    inputContext: {
      appTitle: 'Fintech App',
    },
    suggestionsJson: [
      {
        id: 'sug-1',
        field: 'title',
        currentValue: 'Fintech App',
        suggestedValue: 'Fintech App: Finanças',
        impactScore: 85,
        rationale: 'Foca no termo de maior volume.',
        characterCount: 22,
        maxCharacters: 30,
      },
    ],
    modelUsed: 'heuristic-ai-v1',
    appliedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      asoApp: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      asoAiRecommendation: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsoAiRecommendationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AsoAiRecommendationsService>(AsoAiRecommendationsService);
  });

  describe('generateRecommendations', () => {
    it('deve gerar sugestões de TITLE_OPTIMIZATION respeitando o limite de 30 caracteres do Google Play', async () => {
      prisma.asoApp.findFirst.mockResolvedValue(mockApp);
      prisma.asoAiRecommendation.create.mockImplementation((args: any) => ({
        id: 'rec-new-1',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.generateRecommendations('app-ai-1', 'org-test-1', {
        type: 'TITLE_OPTIMIZATION',
        focusKeywords: ['finanças'],
      });

      expect(prisma.asoApp.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'app-ai-1', organizationId: 'org-test-1' },
        }),
      );
      expect(result).toBeDefined();
      expect(result.type).toBe('TITLE_OPTIMIZATION');
      expect(result.suggestions.length).toBeGreaterThan(0);

      // Verificação estrita da regra do Google Play: Títulos <= 30 caracteres
      for (const suggestion of result.suggestions) {
        expect(suggestion.maxCharacters).toBe(30);
        expect(suggestion.suggestedValue.length).toBeLessThanOrEqual(30);
        expect(suggestion.characterCount).toBeLessThanOrEqual(30);
      }
    });

    it('deve gerar sugestões de DESCRIPTION_OPTIMIZATION respeitando o limite de 80 caracteres para descrição curta', async () => {
      prisma.asoApp.findFirst.mockResolvedValue(mockApp);
      prisma.asoAiRecommendation.create.mockImplementation((args: any) => ({
        id: 'rec-new-2',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.generateRecommendations('app-ai-1', 'org-test-1', {
        type: 'DESCRIPTION_OPTIMIZATION',
        focusKeywords: ['finanças', 'investimentos'],
      });

      expect(result.type).toBe('DESCRIPTION_OPTIMIZATION');
      expect(result.suggestions.length).toBeGreaterThan(0);

      // Verificação da regra do Google Play: Short description <= 80 caracteres
      const shortDesc = result.suggestions.find((s) => s.field === 'shortDescription');
      expect(shortDesc).toBeDefined();
      expect(shortDesc?.maxCharacters).toBe(80);
      expect(shortDesc?.suggestedValue.length).toBeLessThanOrEqual(80);
      expect(shortDesc?.characterCount).toBeLessThanOrEqual(80);
    });

    it('deve gerar sugestões de KEYWORD_EXPANSION com estimativas de impacto', async () => {
      prisma.asoApp.findFirst.mockResolvedValue(mockApp);
      prisma.asoAiRecommendation.create.mockImplementation((args: any) => ({
        id: 'rec-new-3',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.generateRecommendations('app-ai-1', 'org-test-1', {
        type: 'KEYWORD_EXPANSION',
        focusKeywords: ['finanças'],
      });

      expect(result.type).toBe('KEYWORD_EXPANSION');
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0].impactScore).toBeGreaterThan(0);
    });

    it('deve gerar sugestões de CAMPAIGN_STRATEGY com eCPM e lances otimizados', async () => {
      prisma.asoApp.findFirst.mockResolvedValue(mockApp);
      prisma.asoAiRecommendation.create.mockImplementation((args: any) => ({
        id: 'rec-new-4',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.generateRecommendations('app-ai-1', 'org-test-1', {
        type: 'CAMPAIGN_STRATEGY',
      });

      expect(result.type).toBe('CAMPAIGN_STRATEGY');
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some((s) => s.field === 'campaignBid')).toBe(true);
    });

    it('deve gerar sugestões de CREATIVE_COPY com títulos e chamadas para ação persuasivas', async () => {
      prisma.asoApp.findFirst.mockResolvedValue(mockApp);
      prisma.asoAiRecommendation.create.mockImplementation((args: any) => ({
        id: 'rec-new-5',
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      const result = await service.generateRecommendations('app-ai-1', 'org-test-1', {
        type: 'CREATIVE_COPY',
        tone: 'PERSUASIVE',
      });

      expect(result.type).toBe('CREATIVE_COPY');
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('deve lançar NotFoundException quando o aplicativo não for localizado', async () => {
      prisma.asoApp.findFirst.mockResolvedValue(null);

      await expect(
        service.generateRecommendations('app-inexistente', 'org-test-1', {
          type: 'TITLE_OPTIMIZATION',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listRecommendations', () => {
    it('deve listar recomendações cadastradas filtrando por tenant e app', async () => {
      prisma.asoAiRecommendation.findMany.mockResolvedValue([mockRecommendation]);

      const result = await service.listRecommendations('app-ai-1', 'org-test-1');

      expect(prisma.asoAiRecommendation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { asoAppId: 'app-ai-1', organizationId: 'org-test-1' },
        }),
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rec-ai-1');
    });
  });

  describe('applyRecommendation', () => {
    it('deve aplicar sugestão de título no AsoApp e marcar recomendação como APPLIED', async () => {
      prisma.asoAiRecommendation.findFirst.mockResolvedValue({
        ...mockRecommendation,
        asoApp: mockApp,
      });
      prisma.asoApp.update.mockResolvedValue({
        ...mockApp,
        title: 'Fintech App: Finanças',
      });
      prisma.asoAiRecommendation.update.mockResolvedValue({
        ...mockRecommendation,
        status: 'APPLIED',
        appliedAt: new Date(),
      });

      const result = await service.applyRecommendation('rec-ai-1', 'org-test-1', {
        suggestionId: 'sug-1',
      });

      expect(prisma.asoApp.update).toHaveBeenCalledWith({
        where: { id: 'app-ai-1' },
        data: { title: 'Fintech App: Finanças' },
      });
      expect(prisma.asoAiRecommendation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rec-ai-1' },
          data: expect.objectContaining({ status: 'APPLIED' }),
        }),
      );
      expect(result.status).toBe('APPLIED');
    });

    it('deve lançar NotFoundException se a recomendação não existir', async () => {
      prisma.asoAiRecommendation.findFirst.mockResolvedValue(null);

      await expect(
        service.applyRecommendation('rec-invalid', 'org-test-1', {
          suggestionId: 'sug-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException se o suggestionId não constar na recomendação', async () => {
      prisma.asoAiRecommendation.findFirst.mockResolvedValue(mockRecommendation);

      await expect(
        service.applyRecommendation('rec-ai-1', 'org-test-1', {
          suggestionId: 'sug-inexistente',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('dismissRecommendation', () => {
    it('deve descartar recomendação marcando o status como DISMISSED', async () => {
      prisma.asoAiRecommendation.findFirst.mockResolvedValue(mockRecommendation);
      prisma.asoAiRecommendation.update.mockResolvedValue({
        ...mockRecommendation,
        status: 'DISMISSED',
      });

      const result = await service.dismissRecommendation('rec-ai-1', 'org-test-1');

      expect(prisma.asoAiRecommendation.update).toHaveBeenCalledWith({
        where: { id: 'rec-ai-1' },
        data: { status: 'DISMISSED' },
      });
      expect(result.status).toBe('DISMISSED');
    });

    it('deve lançar NotFoundException se a recomendação a ser descartada não existir', async () => {
      prisma.asoAiRecommendation.findFirst.mockResolvedValue(null);

      await expect(
        service.dismissRecommendation('rec-inexistente', 'org-test-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
