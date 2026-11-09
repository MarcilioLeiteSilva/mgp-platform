import { Test, TestingModule } from '@nestjs/testing';
import { AsoEstimatesController } from './aso-estimates.controller';
import { AsoEstimatesService } from '../services/aso-estimates.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';

describe('AsoEstimatesController', () => {
  let controller: AsoEstimatesController;
  let service: any;

  const mockSummary = {
    appId: 'com.game.adventure',
    title: 'Adventure Game',
    icon: 'https://icon.png',
    category: 'GAME',
    country: 'BR',
    latestEstimate: {
      id: 'est-1',
      dailyDownloads: { min: 1000, median: 1500, max: 2000 },
      monthlyDownloads: { min: 30400, median: 45600, max: 60800 },
      dailyRevenue: { min: 300, median: 450, max: 650 },
      monthlyRevenue: { min: 9120, median: 13680, max: 19760 },
      currency: 'BRL',
      confidenceScore: 88,
    },
    history: [],
    growthTrends: {
      downloadGrowthRate7d: 5.4,
      downloadGrowthRate30d: 12.1,
      revenueGrowthRate7d: 3.2,
      revenueGrowthRate30d: 8.9,
    },
    methodologyNotice: 'Aviso legal e metodolÃ³gico',
  };

  beforeEach(async () => {
    service = {
      getEstimatesSummary: jest.fn().mockResolvedValue(mockSummary),
      calculateAndSaveEstimate: jest.fn().mockResolvedValue(mockSummary.latestEstimate),
      getCategoryBenchmarks: jest.fn().mockReturnValue({
        category: 'GAME',
        country: 'BR',
        alpha: 85000,
        beta: 0.88,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AsoEstimatesController],
      providers: [{ provide: AsoEstimatesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AsoEstimatesController>(AsoEstimatesController);
  });

  it('deve ser instanciado corretamente', () => {
    expect(controller).toBeDefined();
  });

  it('GET /api/v1/aso/apps/:id/estimates deve retornar o resumo de estimativas', async () => {
    const result = await controller.getAppEstimates('app-1', 'org-1', { days: 30, country: 'BR' });
    expect(service.getEstimatesSummary).toHaveBeenCalledWith('app-1', 'org-1', { days: 30, country: 'BR' });
    expect(result.appId).toBe('com.game.adventure');
    expect(result.latestEstimate.dailyDownloads.median).toBe(1500);
  });

  it('POST /api/v1/aso/apps/:id/estimates/recalculate deve recalcular estimativa sob demanda', async () => {
    const dto = { country: 'BR', forceRankBasis: 10 };
    const result = await controller.recalculateAppEstimate('app-1', 'org-1', dto);
    expect(service.calculateAndSaveEstimate).toHaveBeenCalledWith('app-1', 'org-1', dto);
    expect(result.id).toBe('est-1');
  });

  it('GET /api/v1/aso/benchmarks deve retornar parÃ¢metros da categoria', async () => {
    const result = await controller.getCategoryBenchmarks('GAME', 'BR');
    expect(service.getCategoryBenchmarks).toHaveBeenCalledWith('GAME', 'BR');
    expect(result.alpha).toBe(85000);
  });
});

