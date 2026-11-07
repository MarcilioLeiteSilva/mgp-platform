import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { BiddingStrategy, PacingMode, RecommendationStatus } from '@mgp/shared';

describe('RecommendationsController', () => {
  let controller: RecommendationsController;
  let service: any;

  const orgId = 'org-tenant-1';

  beforeEach(async () => {
    service = {
      listRecommendations: jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }),
      generateRecommendations: jest.fn().mockResolvedValue({
        generatedCount: 2,
        message: 'Análise concluída com sucesso.',
      }),
      applyRecommendation: jest.fn().mockResolvedValue({
        campaign: { id: 'c1' },
        recommendation: { id: 'r1', status: RecommendationStatus.APPLIED },
      }),
      dismissRecommendation: jest.fn().mockResolvedValue({
        id: 'r1',
        status: RecommendationStatus.DISMISSED,
      }),
      updateBiddingStrategy: jest.fn().mockResolvedValue({
        id: 'c1',
        biddingStrategy: BiddingStrategy.SMART_PACING,
      }),
      simulateCampaignBid: jest.fn().mockResolvedValue({
        campaign: { id: 'c1' },
        pacing: {},
        simulation: {},
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommendationsController],
      providers: [{ provide: RecommendationsService, useValue: service }],
    }).compile();

    controller = module.get<RecommendationsController>(RecommendationsController);
  });

  it('deve chamar listRecommendations com o organizationId correto', async () => {
    const res = await controller.listRecommendations(
      { page: 1, limit: 10 },
      orgId,
      { tenant: { organizationId: orgId } },
    );

    expect(service.listRecommendations).toHaveBeenCalledWith(orgId, {
      page: 1,
      limit: 10,
    });
    expect(res.total).toBe(0);
  });

  it('deve chamar generateRecommendations', async () => {
    const res = await controller.generateRecommendations(
      'c1',
      orgId,
      { tenant: { organizationId: orgId } },
    );

    expect(service.generateRecommendations).toHaveBeenCalledWith(orgId, 'c1');
    expect(res.generatedCount).toBe(2);
  });

  it('deve chamar applyRecommendation', async () => {
    const res = await controller.applyRecommendation(
      'r1',
      {},
      orgId,
      { tenant: { organizationId: orgId }, user: { id: 'u1' } },
    );

    expect(service.applyRecommendation).toHaveBeenCalledWith(
      orgId,
      'r1',
      expect.objectContaining({ id: 'u1' }),
      {},
    );
    expect(res.recommendation.status).toBe(RecommendationStatus.APPLIED);
  });

  it('deve chamar dismissRecommendation', async () => {
    const res = await controller.dismissRecommendation(
      'r1',
      { reason: 'Budget limit' },
      orgId,
      { tenant: { organizationId: orgId } },
    );

    expect(service.dismissRecommendation).toHaveBeenCalledWith(orgId, 'r1', {
      reason: 'Budget limit',
    });
    expect(res.status).toBe(RecommendationStatus.DISMISSED);
  });

  it('deve chamar updateBiddingStrategy', async () => {
    const dto = {
      biddingStrategy: BiddingStrategy.SMART_PACING,
      pacingMode: PacingMode.EVEN,
    };
    const res = await controller.updateBiddingStrategy(
      'c1',
      dto,
      orgId,
      { tenant: { organizationId: orgId }, user: { id: 'u1' } },
    );

    expect(service.updateBiddingStrategy).toHaveBeenCalledWith(
      orgId,
      'c1',
      dto,
      expect.objectContaining({ id: 'u1' }),
    );
    expect(res.biddingStrategy).toBe(BiddingStrategy.SMART_PACING);
  });

  it('deve chamar simulateCampaignBid', async () => {
    const dto = { targetMetric: 'IMPRESSIONS' as const };
    const res = await controller.simulateCampaignBid(
      'c1',
      dto,
      orgId,
      { tenant: { organizationId: orgId } },
    );

    expect(service.simulateCampaignBid).toHaveBeenCalledWith(orgId, 'c1', dto);
    expect(res.campaign.id).toBe('c1');
  });
});

