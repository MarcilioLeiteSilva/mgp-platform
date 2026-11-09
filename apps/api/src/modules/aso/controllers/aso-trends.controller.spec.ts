import { Test, TestingModule } from '@nestjs/testing';
import { AsoTrendsController } from './aso-trends.controller';
import { AsoTrendsService } from '../services/aso-trends.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';

describe('AsoTrendsController', () => {
  let controller: AsoTrendsController;
  let service: any;

  const mockCategoryTrend = {
    category: 'FINANCE',
    country: 'BR',
    date: '2026-11-09',
    totalAppsAnalyzed: 50,
    topBreakouts: [],
    trendingKeywords: [],
    categoryGrowthIndex: 6.5,
    lastRefreshedAt: new Date().toISOString(),
  };

  const mockAlert = {
    id: 'alert-1',
    organizationId: 'org-1',
    category: 'FINANCE',
    title: 'App em Alta',
    message: 'Mensagem do alerta',
    severity: 'OPPORTUNITY',
    isRead: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(async () => {
    service = {
      getCategoryTrends: jest.fn().mockResolvedValue(mockCategoryTrend),
      getBreakoutApps: jest.fn().mockResolvedValue([]),
      getTrendingKeywords: jest.fn().mockResolvedValue([]),
      getOrganizationAlerts: jest.fn().mockResolvedValue([mockAlert]),
      markAlertAsRead: jest.fn().mockResolvedValue({ ...mockAlert, isRead: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AsoTrendsController],
      providers: [{ provide: AsoTrendsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AsoTrendsController>(AsoTrendsController);
  });

  it('deve ser instanciado corretamente', () => {
    expect(controller).toBeDefined();
  });

  it('GET /api/v1/aso/trends/categories/:category deve retornar tendências da categoria', async () => {
    const result = await controller.getCategoryTrends('FINANCE', 'org-1', { country: 'BR' });
    expect(service.getCategoryTrends).toHaveBeenCalledWith('FINANCE', 'BR', 'org-1');
    expect(result.category).toBe('FINANCE');
  });

  it('GET /api/v1/aso/trends/breakouts deve listar breakout apps', async () => {
    await controller.getBreakoutApps('org-1', { category: 'FINANCE', minBreakoutScore: 60 });
    expect(service.getBreakoutApps).toHaveBeenCalledWith(
      { category: 'FINANCE', minBreakoutScore: 60 },
      'org-1',
    );
  });

  it('GET /api/v1/aso/trends/keywords deve listar trending keywords', async () => {
    await controller.getTrendingKeywords({ category: 'GAME', country: 'BR' });
    expect(service.getTrendingKeywords).toHaveBeenCalledWith({ category: 'GAME', country: 'BR' });
  });

  it('GET /api/v1/aso/trends/alerts deve listar alertas da organização', async () => {
    const result = await controller.getOrganizationAlerts('org-1', { unreadOnly: true });
    expect(service.getOrganizationAlerts).toHaveBeenCalledWith('org-1', true);
    expect(result.length).toBe(1);
  });

  it('PATCH /api/v1/aso/trends/alerts/:id/read deve marcar alerta como lido', async () => {
    const result = await controller.markAlertAsRead('alert-1', 'org-1');
    expect(service.markAlertAsRead).toHaveBeenCalledWith('alert-1', 'org-1');
    expect(result.isRead).toBe(true);
  });
});

