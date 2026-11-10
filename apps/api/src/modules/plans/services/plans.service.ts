import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import {
  PlanDetailsDto,
  PlanTier,
  CurrentPlanResponseDto,
  OrganizationSubscriptionDto,
  ChangePlanResponseDto,
  PlanUsageDto,
} from '@mgp/contracts';
import { PLANS_CATALOG } from '../constants/plans.constants';
import { SubscribePlanDto } from '../dto/plans.dto';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna todos os planos disponíveis na plataforma MGP.
   */
  listPlans(): PlanDetailsDto[] {
    return Object.values(PLANS_CATALOG);
  }

  /**
   * Consulta a assinatura ativa, limites e consumo em tempo real da organização.
   */
  async getOrganizationPlan(organizationId: string): Promise<CurrentPlanResponseDto> {
    let sub = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!sub) {
      // Cria assinatura padrão FREE se ainda não existir
      const now = new Date();
      sub = await this.prisma.subscription.create({
        data: {
          organizationId,
          planTier: 'FREE',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          priceMonthly: 0,
          currentPeriodStart: now,
          currentPeriodEnd: new Date(now.getTime() + 30 * 86400000),
        },
      });
    }

    const planTier: PlanTier = (sub.planTier as PlanTier) || 'FREE';
    const plan = PLANS_CATALOG[planTier] || PLANS_CATALOG.FREE;

    // Métricas de consumo real da organização
    const [appsUsed, keywordsUsed, apiAggregate, membersUsed] = await Promise.all([
      this.prisma.asoApp.count({
        where: { organizationId, isMonitored: true },
      }),
      this.prisma.asoAppKeyword.count({
        where: {
          asoApp: { organizationId },
          isActive: true,
        },
      }),
      this.prisma.apiKey.aggregate({
        where: { organizationId },
        _sum: { quotaUsed: true },
      }),
      this.prisma.membership.count({
        where: { organizationId },
      }),
    ]);

    const apiCallsUsed = apiAggregate._sum.quotaUsed || 0;

    const usage: PlanUsageDto = {
      appsUsed,
      appsLimit: plan.limits.maxMonitoredApps,
      keywordsUsed,
      keywordsLimit: plan.limits.maxTrackedKeywordsPerApp * Math.max(1, appsUsed),
      apiCallsUsed,
      apiCallsLimit: plan.limits.monthlyApiQuota,
      membersUsed,
      membersLimit: plan.limits.maxMembers,
    };

    return {
      subscription: this.mapSubscriptionToDto(sub),
      plan,
      usage,
    };
  }

  /**
   * Contrata ou altera o plano da organização.
   */
  async subscribeOrChangePlan(
    organizationId: string,
    dto: SubscribePlanDto,
  ): Promise<ChangePlanResponseDto> {
    const targetPlan = PLANS_CATALOG[dto.planTier];
    if (!targetPlan) {
      throw new NotFoundException(`Plano "${dto.planTier}" não localizado.`);
    }

    const billingCycle = dto.billingCycle || 'MONTHLY';
    const isYearly = billingCycle === 'YEARLY';
    const priceMonthly = isYearly ? targetPlan.priceYearlyMonthlyBrl : targetPlan.priceMonthlyBrl;
    const periodDays = isYearly ? 365 : 30;

    const now = new Date();
    const periodEnd = new Date(now.getTime() + periodDays * 86400000);

    const updatedSub = await this.prisma.subscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        planTier: dto.planTier as any,
        status: 'ACTIVE',
        billingCycle: billingCycle as any,
        priceMonthly,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        planTier: dto.planTier as any,
        status: 'ACTIVE',
        billingCycle: billingCycle as any,
        priceMonthly,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        canceledAt: null,
      },
    });

    // Sincroniza planTier na entidade Organization
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: { planTier: dto.planTier },
    });

    this.logger.log(`Organização ${organizationId} atualizou para o plano ${targetPlan.name} (${billingCycle})`);

    return {
      success: true,
      message: `Plano ${targetPlan.name} ativado com sucesso!`,
      subscription: this.mapSubscriptionToDto(updatedSub),
    };
  }

  /**
   * Cancela a renovação da assinatura mantendo o acesso até o fim do ciclo vigente.
   */
  async cancelSubscription(organizationId: string): Promise<OrganizationSubscriptionDto> {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!sub) {
      throw new NotFoundException('Assinatura da organização não encontrada.');
    }

    const updated = await this.prisma.subscription.update({
      where: { organizationId },
      data: {
        canceledAt: new Date(),
      },
    });

    this.logger.warn(`Assinatura da organização ${organizationId} cancelada. Acesso mantido até ${sub.currentPeriodEnd}`);

    return this.mapSubscriptionToDto(updated);
  }

  /**
   * Verifica se o recurso pode ser consumido de acordo com as quotas do plano ativo.
   */
  async checkQuota(
    organizationId: string,
    resource: 'apps' | 'keywords' | 'apiCalls' | 'members',
  ): Promise<boolean> {
    const { plan, usage } = await this.getOrganizationPlan(organizationId);

    if (resource === 'apps' && usage.appsUsed >= plan.limits.maxMonitoredApps) {
      throw new ForbiddenException({
        code: 'QUOTA_EXCEEDED',
        resource: 'apps',
        message: `Limite de aplicativos monitorados do plano ${plan.name} atingido (${usage.appsUsed}/${plan.limits.maxMonitoredApps}). Faça upgrade para monitorar mais apps.`,
        current: usage.appsUsed,
        limit: plan.limits.maxMonitoredApps,
        upgradeUrl: '/plans',
      });
    }

    if (resource === 'apiCalls' && usage.apiCallsUsed >= plan.limits.monthlyApiQuota) {
      throw new ForbiddenException({
        code: 'QUOTA_EXCEEDED',
        resource: 'apiCalls',
        message: `Quota mensal de requisições do plano ${plan.name} atingida (${usage.apiCallsUsed}/${plan.limits.monthlyApiQuota}). Faça upgrade para continuar utilizando a API.`,
        current: usage.apiCallsUsed,
        limit: plan.limits.monthlyApiQuota,
        upgradeUrl: '/plans',
      });
    }

    if (resource === 'members' && usage.membersUsed >= plan.limits.maxMembers) {
      throw new ForbiddenException({
        code: 'QUOTA_EXCEEDED',
        resource: 'members',
        message: `Limite de membros da equipe do plano ${plan.name} atingido (${usage.membersUsed}/${plan.limits.maxMembers}). Faça upgrade para convidar mais colaboradores.`,
        current: usage.membersUsed,
        limit: plan.limits.maxMembers,
        upgradeUrl: '/plans',
      });
    }

    return true;
  }

  private mapSubscriptionToDto(sub: any): OrganizationSubscriptionDto {
    return {
      id: sub.id,
      organizationId: sub.organizationId,
      planTier: sub.planTier,
      status: sub.status,
      billingCycle: sub.billingCycle,
      priceMonthly: sub.priceMonthly ? Number(sub.priceMonthly) : 0,
      currentPeriodStart: sub.currentPeriodStart instanceof Date ? sub.currentPeriodStart.toISOString() : sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd instanceof Date ? sub.currentPeriodEnd.toISOString() : sub.currentPeriodEnd,
      canceledAt: sub.canceledAt instanceof Date ? sub.canceledAt.toISOString() : sub.canceledAt,
      createdAt: sub.createdAt instanceof Date ? sub.createdAt.toISOString() : sub.createdAt,
      updatedAt: sub.updatedAt instanceof Date ? sub.updatedAt.toISOString() : sub.updatedAt,
    };
  }
}

