import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  BiddingStrategy,
  PacingMode,
  RecommendationPriority,
  RecommendationStatus,
  RecommendationType,
} from '@mgp/shared';
import {
  ApplyRecommendationDto,
  DismissRecommendationDto,
  ListRecommendationsQueryDto,
  SimulateBidDto,
  UpdateBiddingStrategyDto,
} from './dto';
import { SmartBiddingService } from './smart-bidding.service';

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smartBidding: SmartBiddingService,
  ) {}

  /**
   * Analisa heurística e estatisticamente as campanhas do tenant e gera recomendações inteligentes
   */
  async generateRecommendations(
    organizationId: string,
    campaignId?: string,
  ): Promise<{ generatedCount: number; message: string }> {
    const whereClause: any = { organizationId };
    if (campaignId) {
      whereClause.id = campaignId;
    }

    const campaigns = await this.prisma.campaign.findMany({
      where: whereClause,
      include: {
        creatives: true,
      },
    });

    if (!campaigns || campaigns.length === 0) {
      return { generatedCount: 0, message: 'Nenhuma campanha elegível encontrada.' };
    }

    let generatedCount = 0;

    for (const campaign of campaigns) {
      const bid = Number(campaign.bidAmount);
      const dailyBudget = Number(campaign.dailyBudget);
      const spent = Number(campaign.spentAmount);

      // Regra 1: BID_ADJUSTMENT (Lance abaixo de R$ 1.50 ou abaixo do piso recomendado)
      if (bid < 1.5 && campaign.status === 'ACTIVE') {
        const suggestedBid = Number((Math.max(1.5, bid * 1.25)).toFixed(2));
        const created = await this.createPendingIfNotExists({
          campaignId: campaign.id,
          organizationId,
          type: RecommendationType.BID_ADJUSTMENT,
          priority: RecommendationPriority.HIGH,
          title: 'Ajuste de Lance para Aumento de Win Rate',
          message: `O lance atual de R$ ${bid.toFixed(2)} está abaixo da média competitiva do leilão RTB para ${campaign.targetCountry}.`,
          suggestedAction: `Elevar o lance para R$ ${suggestedBid.toFixed(2)} (+25%) para obter maior share de impressões.`,
          expectedImpact: '+30% a +45% de volume no leilão RTB',
          actionPayload: { bidAmount: suggestedBid },
        });
        if (created) generatedCount++;
      }

      // Regra 2: PACING_OPTIMIZATION (Modo acelerado ou gasto > 80% do teto diário)
      if (
        (campaign.pacingMode === PacingMode.ACCELERATED || spent >= dailyBudget * 0.8) &&
        campaign.status === 'ACTIVE'
      ) {
        const created = await this.createPendingIfNotExists({
          campaignId: campaign.id,
          organizationId,
          type: RecommendationType.PACING_OPTIMIZATION,
          priority: RecommendationPriority.MEDIUM,
          title: 'Ativar Distribuição Inteligente de Orçamento (Smart Pacing)',
          message:
            'O orçamento diário está sendo consumido de forma acelerada, correndo o risco de exaustão antecipada.',
          suggestedAction:
            'Alterar o modo de pacing para EVEN e vincular à estratégia SMART_PACING para cobrir as 24h.',
          expectedImpact: 'Preservação de até 40% do orçamento para os horários de maior conversão',
          actionPayload: {
            pacingMode: PacingMode.EVEN,
            biddingStrategy: BiddingStrategy.SMART_PACING,
          },
        });
        if (created) generatedCount++;
      }

      // Regra 3: BUDGET_SCALING (Campanha ativa com gasto >= 90% do orçamento diário)
      if (spent >= dailyBudget * 0.9 && campaign.status === 'ACTIVE') {
        const suggestedBudget = Number((dailyBudget * 1.3).toFixed(2));
        const created = await this.createPendingIfNotExists({
          campaignId: campaign.id,
          organizationId,
          type: RecommendationType.BUDGET_SCALING,
          priority: RecommendationPriority.HIGH,
          title: 'Escalar Orçamento Diário para Alta Performance',
          message:
            'A campanha atinge a meta diária de investimento consistentemente com excelente entrega.',
          suggestedAction: `Aumentar o orçamento diário de R$ ${dailyBudget.toFixed(2)} para R$ ${suggestedBudget.toFixed(2)} (+30%).`,
          expectedImpact: 'Captação estimada de +35% de novas impressões qualificadas',
          actionPayload: { dailyBudget: suggestedBudget },
        });
        if (created) generatedCount++;
      }

      // Regra 4: CREATIVE_FATIGUE (Poucos criativos ativos)
      const activeCreatives = (campaign.creatives || []).filter((c) => c.isActive);
      if (activeCreatives.length <= 1 && campaign.status === 'ACTIVE') {
        const created = await this.createPendingIfNotExists({
          campaignId: campaign.id,
          organizationId,
          type: RecommendationType.CREATIVE_FATIGUE,
          priority: RecommendationPriority.MEDIUM,
          title: 'Diversificar Formatos de Criativos Publicitários',
          message:
            'A campanha possui apenas um formato ou criativo ativo, limitando as oportunidades nos inventários dos publishers.',
          suggestedAction:
            'Cadastrar variações adicionais nos formatos Banner, Nativo ou Premiado (Rewarded).',
          expectedImpact: 'Elevação esperada de +20% no CTR médio global da campanha',
          actionPayload: { action: 'ADD_CREATIVES', recommendedFormats: ['BANNER', 'INTERSTITIAL'] },
        });
        if (created) generatedCount++;
      }

      // Regra 5: AUDIENCE_EXPANSION (Categorias restritas)
      if (
        campaign.targetCategories &&
        campaign.targetCategories !== 'ALL' &&
        campaign.status === 'ACTIVE'
      ) {
        const created = await this.createPendingIfNotExists({
          campaignId: campaign.id,
          organizationId,
          type: RecommendationType.AUDIENCE_EXPANSION,
          priority: RecommendationPriority.LOW,
          title: 'Expandir Segmentação de Categorias de Apps',
          message: `A segmentação atual (${campaign.targetCategories}) pode restringir a participação em leilões em apps correlatos.`,
          suggestedAction: 'Ampliar a segmentação de público para ALL para ampliar o inventário.',
          expectedImpact: '+50% de inventário elegível no leilão RTB',
          actionPayload: { targetCategories: 'ALL' },
        });
        if (created) generatedCount++;
      }
    }

    return {
      generatedCount,
      message: `Análise concluída com sucesso. ${generatedCount} novas recomendações geradas.`,
    };
  }

  /**
   * Lista recomendações com paginação e filtros estritamente vinculados ao tenant
   */
  async listRecommendations(organizationId: string, query: ListRecommendationsQueryDto) {
    const { campaignId, status, priority, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (campaignId) {
      where.campaignId = campaignId;
    }
    if (status) {
      where.status = status;
    }
    if (priority) {
      where.priority = priority;
    }

    const [items, total] = await Promise.all([
      this.prisma.campaignRecommendation.findMany({
        where,
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              status: true,
              bidAmount: true,
              dailyBudget: true,
              biddingStrategy: true,
              pacingMode: true,
            },
          },
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.campaignRecommendation.count({ where }),
    ]);

    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Aplica a recomendação sugerida atomicamente na campanha (One-Click Optimization)
   */
  async applyRecommendation(
    organizationId: string,
    recommendationId: string,
    user: { id: string; email: string },
    dto?: ApplyRecommendationDto,
  ) {
    const recommendation = await this.prisma.campaignRecommendation.findFirst({
      where: {
        id: recommendationId,
        organizationId,
      },
      include: {
        campaign: true,
      },
    });

    if (!recommendation) {
      throw new NotFoundException('Recomendação não encontrada para esta organização.');
    }

    if (recommendation.status === RecommendationStatus.APPLIED) {
      throw new BadRequestException('Esta recomendação já foi aplicada anteriormente.');
    }

    const payload = (dto?.overrideParams ||
      recommendation.actionPayload) as Record<string, any>;

    // Mapeamento dos campos aplicáveis na campanha
    const campaignUpdates: any = {};
    if (payload.bidAmount !== undefined) {
      campaignUpdates.bidAmount = payload.bidAmount;
    }
    if (payload.dailyBudget !== undefined) {
      campaignUpdates.dailyBudget = payload.dailyBudget;
    }
    if (payload.biddingStrategy !== undefined) {
      campaignUpdates.biddingStrategy = payload.biddingStrategy;
    }
    if (payload.pacingMode !== undefined) {
      campaignUpdates.pacingMode = payload.pacingMode;
    }
    if (payload.targetCategories !== undefined) {
      campaignUpdates.targetCategories = payload.targetCategories;
    }
    if (payload.targetCpa !== undefined) {
      campaignUpdates.targetCpa = payload.targetCpa;
    }

    // Execução atômica via $transaction
    const result = await this.prisma.$transaction(async (tx) => {
      let updatedCampaign = recommendation.campaign;
      if (Object.keys(campaignUpdates).length > 0) {
        updatedCampaign = await tx.campaign.update({
          where: { id: recommendation.campaignId },
          data: campaignUpdates,
        });
      }

      const updatedRec = await tx.campaignRecommendation.update({
        where: { id: recommendation.id },
        data: {
          status: RecommendationStatus.APPLIED,
          appliedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId,
          userId: user.id,
          action: 'RECOMMENDATION_APPLIED',
          entityType: 'CampaignRecommendation',
          entityId: recommendation.id,
          diffBefore: {
            campaignId: recommendation.campaignId,
            previousBid: Number(recommendation.campaign.bidAmount),
            previousPacing: recommendation.campaign.pacingMode,
            previousStrategy: recommendation.campaign.biddingStrategy,
          },
          diffAfter: {
            recommendationType: recommendation.type,
            appliedPayload: campaignUpdates,
          },
        },
      });

      return {
        campaign: updatedCampaign,
        recommendation: updatedRec,
      };
    });

    return result;
  }

  /**
   * Descarta uma recomendação
   */
  async dismissRecommendation(
    organizationId: string,
    recommendationId: string,
    _dto?: DismissRecommendationDto,
  ) {
    const recommendation = await this.prisma.campaignRecommendation.findFirst({
      where: {
        id: recommendationId,
        organizationId,
      },
    });

    if (!recommendation) {
      throw new NotFoundException('Recomendação não encontrada para esta organização.');
    }

    const updated = await this.prisma.campaignRecommendation.update({
      where: { id: recommendation.id },
      data: {
        status: RecommendationStatus.DISMISSED,
      },
    });

    return updated;
  }

  /**
   * Atualiza as configurações de lances automatizados e pacing de uma campanha
   */
  async updateBiddingStrategy(
    organizationId: string,
    campaignId: string,
    dto: UpdateBiddingStrategyDto,
    user: { id: string; email: string },
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        organizationId,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada nesta organização.');
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        biddingStrategy: dto.biddingStrategy ?? campaign.biddingStrategy,
        pacingMode: dto.pacingMode ?? campaign.pacingMode,
        targetCpa: dto.targetCpa !== undefined ? dto.targetCpa : campaign.targetCpa,
        autoOptimize: dto.autoOptimize !== undefined ? dto.autoOptimize : campaign.autoOptimize,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: user.id,
        action: 'BIDDING_STRATEGY_UPDATED',
        entityType: 'Campaign',
        entityId: campaignId,
        diffBefore: {
          biddingStrategy: campaign.biddingStrategy,
          pacingMode: campaign.pacingMode,
          targetCpa: campaign.targetCpa ? Number(campaign.targetCpa) : null,
          autoOptimize: campaign.autoOptimize,
        },
        diffAfter: dto as any,
      },
    });

    return updated;
  }

  /**
   * Executa simulação preditiva de curva de lances e otimização para uma campanha
   */
  async simulateCampaignBid(
    organizationId: string,
    campaignId: string,
    dto: SimulateBidDto,
  ) {
    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        organizationId,
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campanha não encontrada nesta organização.');
    }

    const currentBid = dto.currentBid || Number(campaign.bidAmount) || 2.0;
    const dailyBudget = dto.budget || Number(campaign.dailyBudget) || 100.0;
    const billingModel = campaign.billingModel || 'CPM';

    const simulation = this.smartBidding.simulateBid(
      currentBid,
      billingModel,
      dailyBudget,
      dto.targetMetric || 'IMPRESSIONS',
    );

    const pacing = this.smartBidding.evaluatePacing(
      dailyBudget,
      Number(campaign.spentAmount) || 0,
      campaign.pacingMode as unknown as PacingMode,
    );

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        currentBid,
        dailyBudget,
        billingModel,
        biddingStrategy: campaign.biddingStrategy,
        pacingMode: campaign.pacingMode,
      },
      pacing,
      simulation,
    };
  }

  private async createPendingIfNotExists(data: {
    campaignId: string;
    organizationId: string;
    type: RecommendationType;
    priority: RecommendationPriority;
    title: string;
    message: string;
    suggestedAction: string;
    expectedImpact: string;
    actionPayload: any;
  }): Promise<boolean> {
    const existing = await this.prisma.campaignRecommendation.findFirst({
      where: {
        campaignId: data.campaignId,
        type: data.type,
        status: RecommendationStatus.PENDING,
      },
    });

    if (existing) {
      return false;
    }

    await this.prisma.campaignRecommendation.create({
      data: {
        ...data,
        status: RecommendationStatus.PENDING,
      },
    });

    return true;
  }
}
