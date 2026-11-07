import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { SmartBiddingService } from './smart-bidding.service';
import { PrismaService } from '../../database/prisma.service';
import {
  BiddingStrategy,
  PacingMode,
  RecommendationPriority,
  RecommendationStatus,
  RecommendationType,
} from '@mgp/shared';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let prisma: any;

  const orgId = 'org-tenant-1';
  const otherOrgId = 'org-tenant-other';

  const mockCampaign = {
    id: 'camp-1',
    organizationId: orgId,
    name: 'Campanha Alpha',
    status: 'ACTIVE',
    billingModel: 'CPM',
    bidAmount: 1.0, // Low bid -> triggers BID_ADJUSTMENT
    dailyBudget: 100.0,
    totalBudget: 1000.0,
    spentAmount: 85.0, // High spend -> triggers PACING_OPTIMIZATION
    pacingMode: PacingMode.ACCELERATED,
    biddingStrategy: BiddingStrategy.MANUAL,
    targetCategories: 'GAMES',
    creatives: [{ id: 'cre-1', format: 'BANNER', isActive: true }],
  };

  const mockRecommendation = {
    id: 'rec-1',
    campaignId: 'camp-1',
    organizationId: orgId,
    type: RecommendationType.BID_ADJUSTMENT,
    priority: RecommendationPriority.HIGH,
    title: 'Ajuste de Lance',
    message: 'Lance baixo',
    suggestedAction: 'Elevar para 1.50',
    expectedImpact: '+30% win rate',
    actionPayload: { bidAmount: 1.5 },
    status: RecommendationStatus.PENDING,
    campaign: mockCampaign,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      campaign: {
        findMany: jest.fn().mockResolvedValue([mockCampaign]),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      campaignRecommendation: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        SmartBiddingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
  });

  describe('generateRecommendations', () => {
    it('deve gerar recomendações de ajuste de lance e pacing para campanha com lance baixo e gasto acelerado', async () => {
      prisma.campaignRecommendation.findFirst.mockResolvedValue(null);
      prisma.campaignRecommendation.create.mockResolvedValue({ id: 'rec-new' });

      const result = await service.generateRecommendations(orgId);

      expect(prisma.campaign.findMany).toHaveBeenCalledWith({
        where: { organizationId: orgId },
        include: { creatives: true },
      });
      expect(result.generatedCount).toBeGreaterThan(0);
      expect(prisma.campaignRecommendation.create).toHaveBeenCalled();
    });

    it('não deve duplicar recomendação se já existir uma pendente do mesmo tipo', async () => {
      prisma.campaignRecommendation.findFirst.mockResolvedValue(mockRecommendation);

      const result = await service.generateRecommendations(orgId);

      expect(result.generatedCount).toBe(0);
      expect(prisma.campaignRecommendation.create).not.toHaveBeenCalled();
    });
  });

  describe('listRecommendations', () => {
    it('deve listar recomendações com filtro compulsório de tenant (Zero Data Leakage)', async () => {
      prisma.campaignRecommendation.findMany.mockResolvedValue([mockRecommendation]);
      prisma.campaignRecommendation.count.mockResolvedValue(1);

      const result = await service.listRecommendations(orgId, {
        page: 1,
        limit: 10,
        status: RecommendationStatus.PENDING,
      });

      expect(prisma.campaignRecommendation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: orgId, status: RecommendationStatus.PENDING },
          skip: 0,
          take: 10,
        }),
      );
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('applyRecommendation', () => {
    it('deve aplicar recomendação atomicamente atualizando a campanha e registrando auditoria', async () => {
      prisma.campaignRecommendation.findFirst.mockResolvedValue(mockRecommendation);
      prisma.campaign.update.mockResolvedValue({ ...mockCampaign, bidAmount: 1.5 });
      prisma.campaignRecommendation.update.mockResolvedValue({
        ...mockRecommendation,
        status: RecommendationStatus.APPLIED,
      });

      const user = { id: 'usr-1', email: 'admin@mgp.local' };
      const res = await service.applyRecommendation(orgId, 'rec-1', user);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'camp-1' },
        data: { bidAmount: 1.5 },
      });
      expect(prisma.campaignRecommendation.update).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        data: expect.objectContaining({ status: RecommendationStatus.APPLIED }),
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'RECOMMENDATION_APPLIED',
            organizationId: orgId,
          }),
        }),
      );
      expect(res.recommendation.status).toBe(RecommendationStatus.APPLIED);
    });

    it('deve lançar NotFoundException se a recomendação pertencer a outro tenant', async () => {
      prisma.campaignRecommendation.findFirst.mockResolvedValue(null);

      await expect(
        service.applyRecommendation(otherOrgId, 'rec-1', { id: 'u1', email: 'a@a.com' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar BadRequestException se a recomendação já estiver aplicada', async () => {
      prisma.campaignRecommendation.findFirst.mockResolvedValue({
        ...mockRecommendation,
        status: RecommendationStatus.APPLIED,
      });

      await expect(
        service.applyRecommendation(orgId, 'rec-1', { id: 'u1', email: 'a@a.com' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('dismissRecommendation', () => {
    it('deve descartar recomendação alterando status para DISMISSED', async () => {
      prisma.campaignRecommendation.findFirst.mockResolvedValue(mockRecommendation);
      prisma.campaignRecommendation.update.mockResolvedValue({
        ...mockRecommendation,
        status: RecommendationStatus.DISMISSED,
      });

      const res = await service.dismissRecommendation(orgId, 'rec-1');

      expect(prisma.campaignRecommendation.update).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        data: { status: RecommendationStatus.DISMISSED },
      });
      expect(res.status).toBe(RecommendationStatus.DISMISSED);
    });
  });

  describe('updateBiddingStrategy', () => {
    it('deve atualizar estratégia de lances e pacing da campanha com auditoria', async () => {
      prisma.campaign.findFirst.mockResolvedValue(mockCampaign);
      prisma.campaign.update.mockResolvedValue({
        ...mockCampaign,
        biddingStrategy: BiddingStrategy.SMART_PACING,
        pacingMode: PacingMode.EVEN,
      });

      const user = { id: 'usr-1', email: 'admin@mgp.local' };
      const res = await service.updateBiddingStrategy(
        orgId,
        'camp-1',
        {
          biddingStrategy: BiddingStrategy.SMART_PACING,
          pacingMode: PacingMode.EVEN,
          autoOptimize: true,
        },
        user,
      );

      expect(prisma.campaign.update).toHaveBeenCalledWith({
        where: { id: 'camp-1' },
        data: expect.objectContaining({
          biddingStrategy: BiddingStrategy.SMART_PACING,
          pacingMode: PacingMode.EVEN,
          autoOptimize: true,
        }),
      });
      expect(prisma.auditLog.create).toHaveBeenCalled();
      expect(res.biddingStrategy).toBe(BiddingStrategy.SMART_PACING);
    });
  });

  describe('simulateCampaignBid', () => {
    it('deve retornar simulação preditiva e pacing da campanha', async () => {
      prisma.campaign.findFirst.mockResolvedValue(mockCampaign);

      const res = await service.simulateCampaignBid(orgId, 'camp-1', {
        targetMetric: 'IMPRESSIONS',
      });

      expect(res.campaign.id).toBe('camp-1');
      expect(res.pacing).toBeDefined();
      expect(res.simulation).toBeDefined();
      expect(res.simulation.points.length).toBeGreaterThan(0);
    });
  });
});

