import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  UpdateCampaignStatusDto,
  CreateCreativeDto,
  UpdateCreativeDto,
  ListCampaignsQueryDto,
} from './dto';
import { CampaignStatus, CampaignType, WalletAccountType } from '@mgp/database';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lista campanhas da organização com suporte a paginação, filtros e contagem de criativos.
   * Isolamento estrito por tenant.
   */
  async listCampaigns(organizationId: string, query: ListCampaignsQueryDto) {
    if (!organizationId) {
      throw new BadRequestException('organizationId é obrigatório para consultar campanhas.');
    }

    const { status, type, targetCountry, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(type && { type }),
      ...(targetCountry && { targetCountry }),
      ...(search && {
        name: { contains: search, mode: 'insensitive' },
      }),
    };

    const [total, campaigns] = await Promise.all([
      this.prisma.campaign.count({ where }),
      this.prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        include: {
          creatives: {
            where: { isActive: true },
            select: { id: true, format: true, title: true, imageUrl: true, isActive: true },
          },
          _count: {
            select: { creatives: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: campaigns,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Busca campanha detalhada com isolamento estrito de tenant (Zero Data Leakage).
   */
  async findCampaignById(campaignId: string, organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException('organizationId é obrigatório para consultar a campanha.');
    }

    const campaign = await this.prisma.campaign.findFirst({
      where: {
        id: campaignId,
        organizationId,
      },
      include: {
        creatives: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Campanha '${campaignId}' não encontrada nesta organização.`);
    }

    return campaign;
  }

  /**
   * Cria uma nova campanha na organização ativa.
   * Se for campanha do tipo PAID, valida saldo prévio na carteira de anunciante.
   */
  async createCampaign(
    organizationId: string,
    dto: CreateCampaignDto,
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ) {
    if (!organizationId) {
      throw new BadRequestException('organizationId é obrigatório para criar uma campanha.');
    }

    if (dto.type === CampaignType.PAID) {
      await this.validateAdvertiserBalance(organizationId, Number(dto.dailyBudget));
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        organizationId,
        name: dto.name,
        type: dto.type ?? CampaignType.PAID,
        billingModel: dto.billingModel,
        bidAmount: dto.bidAmount,
        dailyBudget: dto.dailyBudget,
        totalBudget: dto.totalBudget,
        frequencyCapPerHour: dto.frequencyCapPerHour ?? 3,
        priorityTier: dto.priorityTier ?? 2,
        targetCountry: dto.targetCountry ?? 'BR',
        targetCategories: dto.targetCategories ?? 'ALL',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        status: CampaignStatus.DRAFT,
      },
      include: {
        creatives: true,
      },
    });

    // Trilha de auditoria centralizada
    await this.logAudit({
      organizationId,
      userId: context?.userId,
      action: 'CAMPAIGN_CREATED',
      entityId: campaign.id,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      diffAfter: campaign,
    });

    return campaign;
  }

  /**
   * Atualiza metadados, lances ou orçamentos de uma campanha existente.
   */
  async updateCampaign(
    campaignId: string,
    organizationId: string,
    dto: UpdateCampaignDto,
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ) {
    const existing = await this.findCampaignById(campaignId, organizationId);

    if (dto.dailyBudget && existing.type === CampaignType.PAID && existing.status === CampaignStatus.ACTIVE) {
      await this.validateAdvertiserBalance(organizationId, Number(dto.dailyBudget));
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.bidAmount !== undefined && { bidAmount: dto.bidAmount }),
        ...(dto.dailyBudget !== undefined && { dailyBudget: dto.dailyBudget }),
        ...(dto.totalBudget !== undefined && { totalBudget: dto.totalBudget }),
        ...(dto.frequencyCapPerHour !== undefined && { frequencyCapPerHour: dto.frequencyCapPerHour }),
        ...(dto.priorityTier !== undefined && { priorityTier: dto.priorityTier }),
        ...(dto.targetCountry && { targetCountry: dto.targetCountry }),
        ...(dto.targetCategories !== undefined && { targetCategories: dto.targetCategories }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate ? new Date(dto.startDate) : null }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
      },
      include: {
        creatives: true,
      },
    });

    await this.logAudit({
      organizationId,
      userId: context?.userId,
      action: 'CAMPAIGN_UPDATED',
      entityId: campaignId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      diffBefore: existing,
      diffAfter: updated,
    });

    return updated;
  }

  /**
   * Altera o status da campanha (DRAFT, ACTIVE, PAUSED, COMPLETED).
   * Impede ativação se não houver criativos ativos ou saldo suficiente.
   */
  async updateCampaignStatus(
    campaignId: string,
    organizationId: string,
    dto: UpdateCampaignStatusDto,
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ) {
    const campaign = await this.findCampaignById(campaignId, organizationId);

    if (dto.status === CampaignStatus.ACTIVE) {
      const hasActiveCreatives = campaign.creatives.some((c) => c.isActive);
      if (!hasActiveCreatives) {
        throw new BadRequestException('A campanha precisa ter pelo menos um criativo ativo para ser iniciada.');
      }

      if (campaign.type === CampaignType.PAID) {
        await this.validateAdvertiserBalance(organizationId, Number(campaign.dailyBudget));
      }
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: dto.status },
      include: { creatives: true },
    });

    await this.logAudit({
      organizationId,
      userId: context?.userId,
      action: 'CAMPAIGN_STATUS_CHANGED',
      entityId: campaignId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      diffBefore: { status: campaign.status },
      diffAfter: { status: updated.status, reason: dto.reason },
    });

    return updated;
  }

  /**
   * Exclui uma campanha garantindo que não esteja em execução ativa.
   */
  async deleteCampaign(
    campaignId: string,
    organizationId: string,
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ) {
    const campaign = await this.findCampaignById(campaignId, organizationId);

    if (campaign.status === CampaignStatus.ACTIVE) {
      throw new BadRequestException('Não é permitido excluir uma campanha ativa. Pause-a primeiro.');
    }

    await this.prisma.campaign.delete({
      where: { id: campaignId },
    });

    await this.logAudit({
      organizationId,
      userId: context?.userId,
      action: 'CAMPAIGN_DELETED',
      entityId: campaignId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      diffBefore: campaign,
    });

    return { success: true, message: `Campanha '${campaign.name}' excluída com sucesso.` };
  }

  // ==============================================================================
  // Gestão de Criativos da Campanha
  // ==============================================================================

  /**
   * Lista todos os criativos de uma campanha específica.
   */
  async listCreatives(campaignId: string, organizationId: string) {
    await this.findCampaignById(campaignId, organizationId);

    return this.prisma.creative.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Adiciona um criativo com metadados ajustados por formato (Banner, Native, Interstitial, Rewarded).
   */
  async addCreative(
    campaignId: string,
    organizationId: string,
    dto: CreateCreativeDto,
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ) {
    await this.findCampaignById(campaignId, organizationId);

    const creative = await this.prisma.creative.create({
      data: {
        campaignId,
        format: dto.format,
        title: dto.title,
        description: dto.description,
        imageUrl: dto.imageUrl,
        actionUrl: dto.actionUrl,
        width: dto.width ?? 320,
        height: dto.height ?? 50,
        iconUrl: dto.iconUrl,
        ctaText: dto.ctaText ?? 'Instalar',
        starRating: dto.starRating,
        sponsorText: dto.sponsorText,
        skipOffsetSeconds: dto.skipOffsetSeconds ?? 5,
        rewardType: dto.rewardType,
        rewardAmount: dto.rewardAmount,
        requiredWatchSeconds: dto.requiredWatchSeconds ?? 15,
        htmlContent: dto.htmlContent,
        isActive: dto.isActive ?? true,
      },
    });

    await this.logAudit({
      organizationId,
      userId: context?.userId,
      action: 'CREATIVE_CREATED',
      entityId: creative.id,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      diffAfter: creative,
    });

    return creative;
  }

  /**
   * Atualiza um criativo existente.
   */
  async updateCreative(
    campaignId: string,
    creativeId: string,
    organizationId: string,
    dto: UpdateCreativeDto,
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ) {
    await this.findCampaignById(campaignId, organizationId);

    const existing = await this.prisma.creative.findFirst({
      where: { id: creativeId, campaignId },
    });

    if (!existing) {
      throw new NotFoundException(`Criativo '${creativeId}' não encontrado na campanha informada.`);
    }

    const updated = await this.prisma.creative.update({
      where: { id: creativeId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.imageUrl && { imageUrl: dto.imageUrl }),
        ...(dto.actionUrl && { actionUrl: dto.actionUrl }),
        ...(dto.width !== undefined && { width: dto.width }),
        ...(dto.height !== undefined && { height: dto.height }),
        ...(dto.iconUrl !== undefined && { iconUrl: dto.iconUrl }),
        ...(dto.ctaText !== undefined && { ctaText: dto.ctaText }),
        ...(dto.starRating !== undefined && { starRating: dto.starRating }),
        ...(dto.sponsorText !== undefined && { sponsorText: dto.sponsorText }),
        ...(dto.skipOffsetSeconds !== undefined && { skipOffsetSeconds: dto.skipOffsetSeconds }),
        ...(dto.rewardType !== undefined && { rewardType: dto.rewardType }),
        ...(dto.rewardAmount !== undefined && { rewardAmount: dto.rewardAmount }),
        ...(dto.requiredWatchSeconds !== undefined && { requiredWatchSeconds: dto.requiredWatchSeconds }),
        ...(dto.htmlContent !== undefined && { htmlContent: dto.htmlContent }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await this.logAudit({
      organizationId,
      userId: context?.userId,
      action: 'CREATIVE_UPDATED',
      entityId: creativeId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      diffBefore: existing,
      diffAfter: updated,
    });

    return updated;
  }

  /**
   * Exclui um criativo de uma campanha.
   */
  async deleteCreative(
    campaignId: string,
    creativeId: string,
    organizationId: string,
    context?: { userId?: string; ipAddress?: string; userAgent?: string },
  ) {
    await this.findCampaignById(campaignId, organizationId);

    const existing = await this.prisma.creative.findFirst({
      where: { id: creativeId, campaignId },
    });

    if (!existing) {
      throw new NotFoundException(`Criativo '${creativeId}' não encontrado.`);
    }

    await this.prisma.creative.delete({
      where: { id: creativeId },
    });

    await this.logAudit({
      organizationId,
      userId: context?.userId,
      action: 'CREATIVE_DELETED',
      entityId: creativeId,
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      diffBefore: existing,
    });

    return { success: true, message: `Criativo '${existing.title}' excluído com sucesso.` };
  }

  // ==============================================================================
  // Utilitários Internos e Proteções
  // ==============================================================================

  /**
   * Valida se a organização possui saldo suficiente na conta ADVERTISING_CREDITS da Carteira.
   */
  private async validateAdvertiserBalance(organizationId: string, requiredAmount: number) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { organizationId },
      include: {
        accounts: {
          where: { type: WalletAccountType.ADVERTISING_CREDITS },
        },
      },
    });

    const account = wallet?.accounts?.[0];
    const balance = account ? Number(account.cachedBalance) : 0;

    if (balance < requiredAmount) {
      throw new BadRequestException(
        `Saldo insuficiente na Carteira de Anunciante (Disponível: R$ ${balance.toFixed(2)}, Necessário: R$ ${requiredAmount.toFixed(2)}). Realize um depósito antes de ativar a campanha.`,
      );
    }
  }

  /**
   * Registra eventos na tabela de auditoria centralizada.
   */
  private async logAudit(params: {
    organizationId: string;
    userId?: string;
    action: string;
    entityId: string;
    ipAddress?: string;
    userAgent?: string;
    diffBefore?: any;
    diffAfter?: any;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          action: params.action,
          entityType: 'Campaign',
          entityId: params.entityId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          diffBefore: params.diffBefore ? JSON.parse(JSON.stringify(params.diffBefore)) : undefined,
          diffAfter: params.diffAfter ? JSON.parse(JSON.stringify(params.diffAfter)) : undefined,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Falha ao registrar auditoria de campanha: ${err.message}`);
    }
  }
}

