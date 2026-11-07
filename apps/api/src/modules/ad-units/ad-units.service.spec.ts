import { Test, TestingModule } from '@nestjs/testing';
import { AdUnitsService } from './ad-units.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdFormat } from '@mgp/database';

describe('AdUnitsService', () => {
  let service: AdUnitsService;
  let prisma: any;

  const orgId = 'org-pub-123';
  const appId = 'app-android-456';
  const adUnitId = 'unit-banner-789';

  beforeEach(async () => {
    prisma = {
      app: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      adUnit: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdUnitsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<AdUnitsService>(AdUnitsService);
  });

  describe('createAdUnit', () => {
    it('deve lançar BadRequestException se organizationId não for fornecido', async () => {
      await expect(
        service.createAdUnit('', {
          appId,
          name: 'Banner Topo',
          format: AdFormat.BANNER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException se floorEcpm for negativo', async () => {
      await expect(
        service.createAdUnit(orgId, {
          appId,
          name: 'Banner Topo',
          format: AdFormat.BANNER,
          floorEcpm: -1.0,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar NotFoundException se o aplicativo pertencer a outro tenant (Zero Data Leakage)', async () => {
      prisma.app.findFirst.mockResolvedValue(null);

      await expect(
        service.createAdUnit(orgId, {
          appId,
          name: 'Banner Topo',
          format: AdFormat.BANNER,
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.app.findFirst).toHaveBeenCalledWith({
        where: { id: appId, organizationId: orgId },
      });
    });

    it('deve cadastrar a Ad Unit com sucesso e registrar log de auditoria', async () => {
      const mockApp = { id: appId, name: 'Meu App Android', organizationId: orgId };
      prisma.app.findFirst.mockResolvedValue(mockApp);

      const createdUnit = {
        id: adUnitId,
        appId,
        name: 'Banner Topo',
        format: AdFormat.BANNER,
        floorEcpm: 1.5,
        isActive: true,
        app: mockApp,
      };
      prisma.adUnit.create.mockResolvedValue(createdUnit);

      const result = await service.createAdUnit(
        orgId,
        {
          appId,
          name: 'Banner Topo',
          format: AdFormat.BANNER,
          floorEcpm: 1.5,
        },
        { userId: 'user-1' },
      );

      expect(result).toEqual(createdUnit);
      expect(prisma.adUnit.create).toHaveBeenCalled();
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'AD_UNIT_CREATED',
            entityId: adUnitId,
          }),
        }),
      );
    });
  });

  describe('listAdUnits', () => {
    it('deve lançar BadRequestException se organizationId não for fornecido', async () => {
      await expect(service.listAdUnits('', {})).rejects.toThrow(BadRequestException);
    });

    it('deve listar blocos de anúncios da organização com paginação', async () => {
      const mockUnits = [
        { id: 'u1', name: 'Banner Home', format: AdFormat.BANNER, app: { id: appId, name: 'App 1' } },
        { id: 'u2', name: 'Rewarded Vida', format: AdFormat.REWARDED, app: { id: appId, name: 'App 1' } },
      ];
      prisma.adUnit.count.mockResolvedValue(2);
      prisma.adUnit.findMany.mockResolvedValue(mockUnits);

      const result = await service.listAdUnits(orgId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.totalPages).toBe(1);
      expect(prisma.adUnit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { app: { organizationId: orgId } },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('deve aplicar filtros de formato e status ativo', async () => {
      prisma.adUnit.count.mockResolvedValue(1);
      prisma.adUnit.findMany.mockResolvedValue([]);

      await service.listAdUnits(orgId, {
        format: AdFormat.INTERSTITIAL,
        isActive: true,
        appId,
      });

      expect(prisma.adUnit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            app: { organizationId: orgId },
            appId,
            format: AdFormat.INTERSTITIAL,
            isActive: true,
          },
        }),
      );
    });
  });

  describe('findAdUnitById', () => {
    it('deve retornar a Ad Unit quando pertencer ao tenant', async () => {
      const unit = { id: adUnitId, name: 'Banner', app: { organizationId: orgId } };
      prisma.adUnit.findFirst.mockResolvedValue(unit);

      const result = await service.findAdUnitById(adUnitId, orgId);
      expect(result).toEqual(unit);
      expect(prisma.adUnit.findFirst).toHaveBeenCalledWith({
        where: { id: adUnitId, app: { organizationId: orgId } },
        include: expect.any(Object),
      });
    });

    it('deve lançar NotFoundException quando a Ad Unit for de outro tenant', async () => {
      prisma.adUnit.findFirst.mockResolvedValue(null);

      await expect(service.findAdUnitById(adUnitId, orgId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAdUnit', () => {
    it('deve atualizar propriedades da Ad Unit', async () => {
      const existing = { id: adUnitId, name: 'Old', floorEcpm: 1.0, app: { organizationId: orgId } };
      const updated = { id: adUnitId, name: 'New', floorEcpm: 2.5, app: { organizationId: orgId } };

      prisma.adUnit.findFirst.mockResolvedValue(existing);
      prisma.adUnit.update.mockResolvedValue(updated);

      const result = await service.updateAdUnit(adUnitId, orgId, {
        name: 'New',
        floorEcpm: 2.5,
      });

      expect(result.name).toBe('New');
      expect(prisma.adUnit.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: adUnitId },
          data: expect.objectContaining({ name: 'New', floorEcpm: 2.5 }),
        }),
      );
    });

    it('deve rejeitar atualização com floorEcpm negativo', async () => {
      const existing = { id: adUnitId, name: 'Old', floorEcpm: 1.0, app: { organizationId: orgId } };
      prisma.adUnit.findFirst.mockResolvedValue(existing);

      await expect(
        service.updateAdUnit(adUnitId, orgId, { floorEcpm: -5 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteAdUnit', () => {
    it('deve excluir Ad Unit e gravar log de auditoria', async () => {
      const existing = { id: adUnitId, name: 'Banner Delete', app: { organizationId: orgId } };
      prisma.adUnit.findFirst.mockResolvedValue(existing);
      prisma.adUnit.delete.mockResolvedValue(existing);

      const result = await service.deleteAdUnit(adUnitId, orgId, { userId: 'admin-user' });

      expect(result.success).toBe(true);
      expect(prisma.adUnit.delete).toHaveBeenCalledWith({ where: { id: adUnitId } });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'AD_UNIT_DELETED',
            entityId: adUnitId,
          }),
        }),
      );
    });
  });

  describe('getPublisherAnalytics', () => {
    it('deve calcular métricas analíticas e split de 70% rev-share do publisher', async () => {
      prisma.app.findMany.mockResolvedValue([
        {
          id: appId,
          name: 'Jogo Casual',
          packageName: 'com.casual.game',
          adUnits: [
            { id: adUnitId, name: 'Banner Top', format: AdFormat.BANNER, floorEcpm: 1.0, isActive: true },
            { id: 'unit-2', name: 'Rewarded Vida', format: AdFormat.REWARDED, floorEcpm: 5.0, isActive: true },
          ],
        },
      ]);

      prisma.auditLog.findMany.mockResolvedValue([
        {
          action: 'AD_IMPRESSION_BILLED',
          diffAfter: { publisherAppId: appId, adUnitId, cost: 0.005 },
          createdAt: new Date(),
        },
        {
          action: 'AD_CLICK_BILLED',
          diffAfter: { publisherAppId: appId, adUnitId, cost: 0.50 },
          createdAt: new Date(),
        },
      ]);

      const analytics = await service.getPublisherAnalytics(orgId, { period: '30d' });

      expect(analytics.summary.totalAdUnits).toBe(2);
      expect(analytics.summary.activeAdUnits).toBe(2);
      expect(analytics.summary.impressionsCount).toBe(1);
      expect(analytics.summary.clicksCount).toBe(1);
      expect(analytics.summary.grossRevenue).toBeGreaterThan(0);
      expect(analytics.summary.publisherRevenue).toBe(Number((analytics.summary.grossRevenue * 0.70).toFixed(2)));
      expect(analytics.formatBreakdown[AdFormat.BANNER].count).toBe(1);
      expect(analytics.formatBreakdown[AdFormat.REWARDED].count).toBe(1);
    });
  });
});

