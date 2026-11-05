import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AsoAppsService } from './aso-apps.service';
import { PrismaService } from '../../../database/prisma.service';
import { PlayScraperEngineService } from './play-scraper-engine.service';
import { AsoAuditService } from './aso-audit.service';
import { AppPlatform } from '@mgp/database';

describe('AsoAppsService (Gestão de Aplicativos Monitorados e Concorrentes)', () => {
  let service: AsoAppsService;
  let prisma: PrismaService;
  let scraper: PlayScraperEngineService;
  let auditService: AsoAuditService;

  const mockApp = {
    id: 'aso-app-1',
    organizationId: 'org-1',
    appId: 'com.whatsapp',
    platform: AppPlatform.ANDROID,
    title: 'WhatsApp Messenger',
    developer: 'WhatsApp LLC',
    icon: 'https://icon.png',
    genre: 'Communication',
    genreId: 'COMMUNICATION',
    score: 4.6,
    ratings: 150000000,
    reviews: 20000000,
    minInstalls: BigInt(5000000000),
    isMonitored: true,
    isCompetitor: false,
    targetAppId: null,
    country: 'br',
    lang: 'pt-BR',
    metadata: { summary: 'Simple. Reliable. Private.' },
    lastScrapedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockScraperData = {
    appId: 'com.whatsapp',
    title: 'WhatsApp Messenger',
    developer: 'WhatsApp LLC',
    icon: 'https://icon.png',
    genre: 'Communication',
    genreId: 'COMMUNICATION',
    score: 4.6,
    ratings: 150000000,
    reviews: 20000000,
    minInstalls: 5000000000,
    summary: 'Simple. Reliable. Private.',
    description: 'WhatsApp from Meta is a free messaging and video calling app.',
    screenshots: ['https://s1.png', 'https://s2.png'],
  };

  const mockPrisma = {
    asoApp: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsoAppsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: PlayScraperEngineService,
          useValue: {
            getApp: jest.fn().mockResolvedValue(mockScraperData),
          },
        },
        {
          provide: AsoAuditService,
          useValue: {
            runAudit: jest.fn().mockResolvedValue({ id: 'audit-1', overallScore: 92 }),
          },
        },
      ],
    }).compile();

    service = module.get<AsoAppsService>(AsoAppsService);
    prisma = module.get<PrismaService>(PrismaService);
    scraper = module.get<PlayScraperEngineService>(PlayScraperEngineService);
    auditService = module.get<AsoAuditService>(AsoAuditService);

    jest.clearAllMocks();
  });

  describe('trackApp', () => {
    it('deve cadastrar um novo aplicativo monitorado coletando dados da Play Store e executando auditoria', async () => {
      mockPrisma.asoApp.findUnique.mockResolvedValue(null);
      mockPrisma.asoApp.create.mockResolvedValue(mockApp);

      const result = await service.trackApp('org-1', {
        appId: 'com.whatsapp',
        country: 'br',
        lang: 'pt-BR',
      });

      expect(result).toEqual(mockApp);
      expect(scraper.getApp).toHaveBeenCalledWith('com.whatsapp', { country: 'br', lang: 'pt-BR' });
      expect(mockPrisma.asoApp.create).toHaveBeenCalled();
      expect(auditService.runAudit).toHaveBeenCalledWith('org-1', mockApp.id);
    });

    it('deve lançar ConflictException se o app já estiver com monitoramento ativo', async () => {
      mockPrisma.asoApp.findUnique.mockResolvedValue({ ...mockApp, isMonitored: true });

      await expect(
        service.trackApp('org-1', {
          appId: 'com.whatsapp',
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockPrisma.asoApp.create).not.toHaveBeenCalled();
    });

    it('deve reativar monitoramento se o app já existia porém estava inativo', async () => {
      mockPrisma.asoApp.findUnique.mockResolvedValue({ ...mockApp, isMonitored: false });
      mockPrisma.asoApp.update.mockResolvedValue({ ...mockApp, isMonitored: true });

      const result = await service.trackApp('org-1', {
        appId: 'com.whatsapp',
      });

      expect(result.isMonitored).toBe(true);
      expect(mockPrisma.asoApp.update).toHaveBeenCalledWith({
        where: { id: mockApp.id },
        data: { isMonitored: true },
      });
    });
  });

  describe('listApps', () => {
    it('deve listar aplicativos da organização com contadores e suporte a paginação', async () => {
      mockPrisma.asoApp.count.mockResolvedValue(1);
      mockPrisma.asoApp.findMany.mockResolvedValue([mockApp]);

      const result = await service.listApps('org-1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockPrisma.asoApp.findMany).toHaveBeenCalled();
    });
  });

  describe('getAppById', () => {
    it('deve retornar o aplicativo quando pertencer à organização do tenant', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValue(mockApp);

      const result = await service.getAppById('org-1', 'aso-app-1');

      expect(result).toEqual(mockApp);
      expect(mockPrisma.asoApp.findFirst).toHaveBeenCalledWith({
        where: { id: 'aso-app-1', organizationId: 'org-1' },
        include: expect.any(Object),
      });
    });

    it('deve lançar NotFoundException se o app não existir ou pertencer a outro tenant', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValue(null);

      await expect(service.getAppById('org-alheia', 'aso-app-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('syncApp', () => {
    it('deve atualizar metadados a partir da loja e reexecutar a auditoria ASO', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValue(mockApp);
      mockPrisma.asoApp.update.mockResolvedValue({ ...mockApp, score: 4.7 });

      const result = await service.syncApp('org-1', 'aso-app-1');

      expect(scraper.getApp).toHaveBeenCalled();
      expect(mockPrisma.asoApp.update).toHaveBeenCalled();
      expect(auditService.runAudit).toHaveBeenCalledWith('org-1', 'aso-app-1');
      expect(result.score).toBe(4.7);
    });
  });

  describe('deleteApp', () => {
    it('deve remover o aplicativo monitorado com sucesso', async () => {
      mockPrisma.asoApp.findFirst.mockResolvedValue(mockApp);
      mockPrisma.asoApp.delete.mockResolvedValue(mockApp);

      const result = await service.deleteApp('org-1', 'aso-app-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.asoApp.delete).toHaveBeenCalledWith({
        where: { id: 'aso-app-1' },
      });
    });
  });
});

