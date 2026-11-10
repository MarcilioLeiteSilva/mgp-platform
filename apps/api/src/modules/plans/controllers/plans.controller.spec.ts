import { Test, TestingModule } from '@nestjs/testing';
import { PlansController } from './plans.controller';
import { PlansService } from '../services/plans.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import { PLANS_CATALOG } from '../constants/plans.constants';

describe('PlansController', () => {
  let controller: PlansController;
  let service: any;

  const mockCurrentPlan = {
    subscription: {
      id: 'sub-1',
      organizationId: 'org-1',
      planTier: 'PRO',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      priceMonthly: 149,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      canceledAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    plan: PLANS_CATALOG.PRO,
    usage: {
      appsUsed: 2,
      appsLimit: 10,
      keywordsUsed: 15,
      keywordsLimit: 200,
      apiCallsUsed: 500,
      apiCallsLimit: 25000,
      membersUsed: 2,
      membersLimit: 10,
    },
  };

  beforeEach(async () => {
    service = {
      listPlans: jest.fn().mockReturnValue(Object.values(PLANS_CATALOG)),
      getOrganizationPlan: jest.fn().mockResolvedValue(mockCurrentPlan),
      subscribeOrChangePlan: jest.fn().mockResolvedValue({
        success: true,
        message: 'Plano atualizado!',
        subscription: mockCurrentPlan.subscription,
      }),
      cancelSubscription: jest.fn().mockResolvedValue({
        ...mockCurrentPlan.subscription,
        canceledAt: new Date().toISOString(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlansController],
      providers: [{ provide: PlansService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PlansController>(PlansController);
  });

  it('deve ser instanciado corretamente', () => {
    expect(controller).toBeDefined();
  });

  it('GET /api/v1/plans deve retornar a lista de planos públicos', () => {
    const plans = controller.listPlans();
    expect(plans).toHaveLength(4);
    expect(service.listPlans).toHaveBeenCalled();
  });

  it('GET /api/v1/plans/current deve retornar o plano ativo e uso do tenant', async () => {
    const result = await controller.getOrganizationPlan('org-1');
    expect(result.plan.tier).toBe('PRO');
    expect(service.getOrganizationPlan).toHaveBeenCalledWith('org-1');
  });

  it('POST /api/v1/plans/subscribe deve atualizar plano do tenant', async () => {
    const result = await controller.subscribeOrChangePlan('org-1', {
      planTier: 'PRO',
      billingCycle: 'MONTHLY',
    });

    expect(result.success).toBe(true);
    expect(service.subscribeOrChangePlan).toHaveBeenCalledWith('org-1', {
      planTier: 'PRO',
      billingCycle: 'MONTHLY',
    });
  });

  it('POST /api/v1/plans/cancel deve cancelar renovação da assinatura', async () => {
    const result = await controller.cancelSubscription('org-1');
    expect(result.canceledAt).toBeDefined();
    expect(service.cancelSubscription).toHaveBeenCalledWith('org-1');
  });
});

