import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AsoAuditService } from './aso-audit.service';
import { PrismaService } from '../../../database/prisma.service';

describe('AsoAuditService (Diagnóstico Heurístico e Auditoria ASO)', () => {
  let service: AsoAuditService;
  let prisma: PrismaService;

  const mockApp = {
    id: 'aso-app-1',
    organizationId: 'org-1',
    appId: 'com.whatsapp',
    title: 'WhatsApp Messenger: Conversas',
    icon: 'https://icon.png',
    score: 4.6,
    ratings: 150000000,
    metadata: {
      summary: 'Mensagens instantâneas e chamadas gratuitas com privacidade de ponta a ponta.',
      description:
        'O WhatsApp é um aplicativo de mensagens e chamadas com criptografia de ponta a ponta. Mais de 2 bilhões de pessoas em mais de 180 países usam o WhatsApp para manter contato com amigos e familiares, a qualquer hora e em qualquer lugar. O WhatsApp é gratuito e oferece mensagens e chamadas simples, seguras e confiáveis em telefones em todo o mundo.',
      screenshots: [
        'https://s1.png',
        'https://s2.png',
        'https://s3.png',
        'https://s4.png',
        'https://s5.png',
        'https://s6.png',
      ],
    },
  };

  const mockAuditScore = {
    id: 'audit-1',
    asoAppId: 'aso-app-1',
    overallScore: 89,
    titleScore: 100,
    shortDescriptionScore: 100,
    longDescriptionScore: 75,
    iconScore: 100,
    screenshotsScore: 100,
    ratingsScore: 100,
    recommendations: [],
    auditDate: new Date(),
  };

  const mockPrisma = {
    asoApp: {
      findFirst: jest.fn(),
    },
    asoAuditScore: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsoAuditService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<AsoAuditService>(AsoAuditService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('runAudit', () => {
    it('deve calcular pontuações heurísticas para título, descrição, prints, ícone e ratings', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValue(mockApp);
      mockPrisma.asoAuditScore.create.mockResolvedValue(mockAuditScore);

      const result = await service.runAudit('org-1', 'aso-app-1');

      expect(result).toEqual(mockAuditScore);
      expect(mockPrisma.asoAuditScore.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            asoAppId: 'aso-app-1',
            titleScore: expect.any(Number),
            shortDescriptionScore: expect.any(Number),
            longDescriptionScore: expect.any(Number),
            iconScore: expect.any(Number),
            screenshotsScore: expect.any(Number),
            ratingsScore: expect.any(Number),
            overallScore: expect.any(Number),
            recommendations: expect.any(Array),
          }),
        }),
      );
    });

    it('deve penalizar aplicativo com título muito curto e gerar recomendação acionável', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValue({
        ...mockApp,
        title: 'App', // apenas 3 caracteres
      });
      mockPrisma.asoAuditScore.create.mockImplementation(({ data }) => Promise.resolve(data));

      const result = await service.runAudit('org-1', 'aso-app-1');

      expect(result.titleScore).toBeLessThan(100);
      const titleRec = (result.recommendations as any[]).find(
        (r) => r.category === 'TITLE' && r.id === 'rec_title_short',
      );
      expect(titleRec).toBeDefined();
      expect(titleRec.severity).toBe('HIGH');
    });

    it('deve lançar NotFoundException se o app não pertencer à organização', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValue(null);

      await expect(service.runAudit('org-1', 'app-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getLatestAudit', () => {
    it('deve retornar a auditoria mais recente existente', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValue(mockApp);
      mockPrisma.asoAuditScore.findFirst.mockResolvedValue(mockAuditScore);

      const result = await service.getLatestAudit('org-1', 'aso-app-1');

      expect(result).toEqual(mockAuditScore);
      expect(mockPrisma.asoAuditScore.findFirst).toHaveBeenCalled();
    });

    it('deve executar automaticamente a primeira auditoria caso ainda não exista no banco', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValue(mockApp);
      mockPrisma.asoAuditScore.findFirst.mockResolvedValue(null);
      mockPrisma.asoAuditScore.create.mockResolvedValue(mockAuditScore);

      const result = await service.getLatestAudit('org-1', 'aso-app-1');

      expect(result).toEqual(mockAuditScore);
      expect(mockPrisma.asoAuditScore.create).toHaveBeenCalled();
    });
  });

  describe('getAuditHistory', () => {
    it('deve retornar lista cronológica das últimas auditorias do aplicativo', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValue(mockApp);
      mockPrisma.asoAuditScore.findMany.mockResolvedValue([mockAuditScore]);

      const result = await service.getAuditHistory('org-1', 'aso-app-1');

      expect(result).toEqual([mockAuditScore]);
      expect(mockPrisma.asoAuditScore.findMany).toHaveBeenCalled();
    });
  });
});

