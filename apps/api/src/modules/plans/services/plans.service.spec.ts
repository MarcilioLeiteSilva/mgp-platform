import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PrismaService } from '../../../database/prisma.service';

describe('PlansService (Motor de Planos SaaS, Quotas & Assinaturas)', () => {
  let service: PlansService;
  let prisma: any;

  const mockSubscription = {
    id: 'sub-1',
    organizationId: 'org-test-1',
    planTier: 'FREE',
    status: 'ACTIVE',
    billingCycle: 'MONTHLY',
    priceMonthly: 0,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
    canceledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      subscription: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      organization: {
        update: jest.fn(),
      },
      asoApp: {
        count: jest.fn().mockResolvedValue(1),
      },
      asoAppKeyword: {
        count: jest.fn().mockResolvedValue(3),
      },
      apiKey: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { quotaUsed: 120 } }),
      },
      membership: {
        count: jest.fn().mockResolvedValue(1),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PlansService>(PlansService);
  });

  describe('listPlans', () => {
    it('deve listar os 4 planos disponíveis (FREE, STARTER, PRO, BUSINESS) com detalhes e limites', () => {
      const plans = service.listPlans();
      expect(plans).toHaveLength(4);
      expect(plans.map((p) => p.tier)).toEqual(['FREE', 'STARTER', 'PRO', 'BUSINESS']);
      expect(plans.find((p) => p.tier === 'PRO')?.isPopular).toBe(true);
    });
  });

  describe('getOrganizationPlan', () => {
    it('deve retornar plano ativo e consumo consolidado da organização', async () => {
      prisma.subscription.findUnique.mockResolvedValue(mockSubscription);

      const result = await service.getOrganizationPlan('org-test-1');

      expect(prisma.subscription.findUnique).toHaveBeenCalledWith({
        where: { organizationId: 'org-test-1' },
      });
      expect(result.plan.tier).toBe('FREE');
      expect(result.usage.appsUsed).toBe(1);
      expect(result.usage.appsLimit).toBe(1);
      expect(result.usage.apiCallsUsed).toBe(120);
    });

    it('deve auto-inicializar plano FREE se a organização ainda não possuir registro de assinatura', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);
      prisma.subscription.create.mockResolvedValue(mockSubscription);

      const result = await service.getOrganizationPlan('org-new');

      expect(prisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-new',
            planTier: 'FREE',
            status: 'ACTIVE',
          }),
        }),
      );
      expect(result.plan.tier).toBe('FREE');
    });
  });

  describe('subscribeOrChangePlan', () => {
    it('deve atualizar plano para PRO com ciclo anual e desconto aplicado', async () => {
      prisma.subscription.upsert.mockResolvedValue({
        ...mockSubscription,
        planTier: 'PRO',
        billingCycle: 'YEARLY',
        priceMonthly: 119,
      });

      const response = await service.subscribeOrChangePlan('org-test-1', {
        planTier: 'PRO',
        billingCycle: 'YEARLY',
      });

      expect(prisma.subscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-test-1' },
          create: expect.objectContaining({ planTier: 'PRO', billingCycle: 'YEARLY', priceMonthly: 119 }),
          update: expect.objectContaining({ planTier: 'PRO', billingCycle: 'YEARLY', priceMonthly: 119 }),
        }),
      );
      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-test-1' },
        data: { planTier: 'PRO' },
      });
      expect(response.success).toBe(true);
      expect(response.subscription.planTier).toBe('PRO');
    });

    it('deve lançar NotFoundException se o plano informado não existir no catálogo', async () => {
      await expect(
        service.subscribeOrChangePlan('org-test-1', {
          planTier: 'PLANO_INEXISTENTE' as any,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelSubscription', () => {
    it('deve registrar cancelamento mantendo o período vigente', async () => {
      prisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      prisma.subscription.update.mockResolvedValue({
        ...mockSubscription,
        canceledAt: new Date(),
      });

      const result = await service.cancelSubscription('org-test-1');

      expect(prisma.subscription.update).toHaveBeenCalledWith({
        where: { organizationId: 'org-test-1' },
        data: { canceledAt: expect.any(Date) },
      });
      expect(result.canceledAt).toBeDefined();
    });

    it('deve lançar NotFoundException se a assinatura não for encontrada', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);

      await expect(service.cancelSubscription('org-test-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('checkQuota', () => {
    it('deve lançar ForbiddenException quando o limite de aplicativos monitorados for excedido', async () => {
      prisma.subscription.findUnique.mockResolvedValue(mockSubscription);
      prisma.asoApp.count.mockResolvedValue(1); // Free limit is 1

      await expect(service.checkQuota('org-test-1', 'apps')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve aprovar quando o consumo estiver abaixo do limite do plano', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        ...mockSubscription,
        planTier: 'PRO', // Pro limit is 10
      });
      prisma.asoApp.count.mockResolvedValue(4);

      const allowed = await service.checkQuota('org-test-1', 'apps');
      expect(allowed).toBe(true);
    });
  });
});

