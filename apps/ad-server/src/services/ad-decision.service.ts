import { PrismaClient } from '@mgp/database';
import {
  AdRequestDto,
  AdResponseDto,
  AdTrackingTokenPayload,
} from '@mgp/contracts';
import { AdFormat, CampaignType } from '@mgp/shared';
import { CacheService } from './cache.service';
import { TokenService } from './token.service';

export interface AdDecisionDeps {
  prisma: PrismaClient;
  cache: CacheService;
  tokenService: TokenService;
  tokenTtlSeconds?: number;
  serverBaseUrl?: string;
}

interface RankedCandidate {
  campaign: any;
  creative: any;
  ecpm: number;
  priorityTier: number;
}

export class AdDecisionService {
  private readonly tokenTtlSeconds: number;
  private readonly serverBaseUrl: string;

  constructor(private readonly deps: AdDecisionDeps) {
    this.tokenTtlSeconds = deps.tokenTtlSeconds || 900;
    this.serverBaseUrl =
      deps.serverBaseUrl ||
      'https://mgp-production-mgp-adserver.gtalg3.easypanel.host';
  }

  /**
   * Processa a solicitação de anúncio e executa o leilão RTB em ultra-baixa latência (< 50ms).
   */
  async decideAd(
    request: AdRequestDto,
    authContext: { sdkKey?: string; appId?: string; clientIp?: string },
  ): Promise<AdResponseDto> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const sdkKey = authContext.sdkKey;
    if (!sdkKey) {
      return {
        requestId,
        fill: false,
        reason: 'UNAUTHORIZED_MISSING_SDK_KEY',
      };
    }

    // 1. Resolução do Aplicativo Publisher (Cache com fallback em DB)
    const app = await this.resolveApp(sdkKey);
    if (!app || !app.isActive) {
      return {
        requestId,
        fill: false,
        reason: 'UNAUTHORIZED_INVALID_OR_INACTIVE_APP',
      };
    }

    // 2. Resolução do Bloco de Anúncios (Ad Unit)
    const adUnit = await this.resolveAdUnit(request.adUnitId);
    if (!adUnit) {
      return {
        requestId,
        fill: false,
        reason: 'AD_UNIT_NOT_FOUND',
      };
    }

    if (!adUnit.isActive) {
      return {
        requestId,
        fill: false,
        reason: 'AD_UNIT_INACTIVE',
      };
    }

    if (adUnit.appId !== app.id) {
      return {
        requestId,
        fill: false,
        reason: 'AD_UNIT_APP_MISMATCH',
      };
    }

    if (adUnit.format !== request.format) {
      return {
        requestId,
        fill: false,
        reason: 'AD_UNIT_FORMAT_MISMATCH',
      };
    }

    const floorEcpm = Number(adUnit.floorEcpm) || 0;
    const country = request.device.country || 'BR';
    const advertisingId = request.device.advertisingId;

    // 3. Busca e Avaliação de Campanhas Elegíveis (Targeting + Frequency Capping)
    const eligibleCandidates = await this.resolveEligibleCandidates(
      country,
      request.format,
      app.organizationId,
      floorEcpm,
      advertisingId,
    );

    if (!eligibleCandidates || eligibleCandidates.length === 0) {
      return {
        requestId,
        fill: false,
        reason: 'NO_ELIGIBLE_CAMPAIGN',
      };
    }

    // 4. Execução do Leilão RTB (Second-Price Vickrey Auction com Floor)
    const auctionResult = this.runRtbAuction(eligibleCandidates, floorEcpm);
    if (!auctionResult) {
      return {
        requestId,
        fill: false,
        reason: 'NO_CREATIVES_AVAILABLE',
      };
    }

    const { winner, clearingPrice } = auctionResult;
    const campaign = winner.campaign;
    const creative = winner.creative;
    const now = Date.now();
    const expiresAt = now + this.tokenTtlSeconds * 1000;

    // 5. Metadados e Payload Específico por Formato
    const isRewarded = request.format === AdFormat.REWARDED;
    const isNative = request.format === AdFormat.NATIVE;
    const isInterstitial = request.format === AdFormat.INTERSTITIAL;

    const rewardType = isRewarded ? creative.rewardType || 'COINS' : undefined;
    const rewardAmount = isRewarded
      ? creative.rewardAmount || 10
      : undefined;
    const requiredWatchSeconds = isRewarded
      ? creative.requiredWatchSeconds ?? 15
      : undefined;

    const tokenPayload: AdTrackingTokenPayload = {
      requestId,
      adUnitId: adUnit.id,
      campaignId: campaign.id,
      creativeId: creative.id,
      publisherAppId: app.id,
      publisherOrgId: app.organizationId,
      advertiserOrgId: campaign.organizationId,
      bidAmount: Number(campaign.bidAmount),
      clearingPrice,
      billingModel: campaign.billingModel,
      format: request.format,
      actionUrl: creative.actionUrl,
      rewardType,
      rewardAmount,
      requiredWatchSeconds,
      issuedAt: now,
      expiresAt,
    };

    // 6. Geração de Tokens Criptográficos Assinados
    const impressionToken =
      this.deps.tokenService.generateTrackingToken(tokenPayload);
    const clickToken =
      this.deps.tokenService.generateTrackingToken(tokenPayload);
    const rewardToken = isRewarded
      ? this.deps.tokenService.generateTrackingToken(tokenPayload)
      : undefined;

    const trackingClickUrl = `${this.serverBaseUrl}/click/track?t=${encodeURIComponent(clickToken)}`;

    // 7. Montagem do Criativo Enriquecido por Formato
    const creativeResponse: any = {
      id: creative.id,
      type: creative.format as AdFormat,
      width: isInterstitial || isRewarded ? 1080 : creative.width,
      height: isInterstitial || isRewarded ? 1920 : creative.height,
      title: creative.title,
      description: creative.description || undefined,
      imageUrl: creative.imageUrl,
      actionUrl: trackingClickUrl,
    };

    if (isNative) {
      creativeResponse.iconUrl = creative.iconUrl || creative.imageUrl;
      creativeResponse.ctaText = creative.ctaText || 'Instalar';
      creativeResponse.starRating = creative.starRating
        ? Number(creative.starRating)
        : 4.5;
      creativeResponse.sponsorText =
        creative.sponsorText || campaign.name || 'Patrocinado';
    }

    if (isInterstitial) {
      creativeResponse.skipOffsetSeconds = creative.skipOffsetSeconds ?? 5;
      if (creative.htmlContent) {
        creativeResponse.htmlContent = creative.htmlContent;
      }
    }

    if (isRewarded) {
      creativeResponse.rewardType = rewardType;
      creativeResponse.rewardAmount = rewardAmount;
      creativeResponse.requiredWatchSeconds = requiredWatchSeconds;
    }

    return {
      requestId,
      fill: true,
      campaignId: campaign.id,
      campaignType: campaign.type as CampaignType,
      pricing: {
        model: campaign.billingModel as 'CPM' | 'CPC' | 'CPI',
        bidAmount: Number(campaign.bidAmount),
        clearingPrice,
      },
      creative: creativeResponse,
      tracking: {
        impressionToken,
        clickToken,
        rewardToken,
        expiresAt: new Date(expiresAt).toISOString(),
      },
    };
  }

  /**
   * Calcula o eCPM efetivo baseado no modelo de precificação da campanha
   */
  calculateEcpm(campaign: any): number {
    const bid = Number(campaign.bidAmount) || 0;
    const model = campaign.billingModel;

    if (model === 'CPM') {
      return bid;
    }

    // Para modelo CPC: eCPM = bidCPC * CTR_preditivo * 1000
    // CTR preditivo padrão de 2.0% (0.02)
    if (model === 'CPC') {
      const predictedCtr = 0.02;
      return Number((bid * predictedCtr * 1000).toFixed(4));
    }

    // Para modelo CPI: eCPM = bidCPI * CTR_preditivo * CVR_preditivo * 1000
    // CVR preditivo de 10% sobre cliques (0.10)
    if (model === 'CPI') {
      const predictedCtr = 0.02;
      const predictedCvr = 0.1;
      return Number((bid * predictedCtr * predictedCvr * 1000).toFixed(4));
    }

    return bid;
  }

  /**
   * Executa o leilão RTB (Second-Price Vickrey Auction com Floor Price)
   */
  private runRtbAuction(
    candidates: RankedCandidate[],
    floorEcpm: number,
  ): { winner: RankedCandidate; clearingPrice: number } | null {
    if (candidates.length === 0) return null;

    // Ordenação determinística: Prioridade de Tier (1: House/Direct, 2: Paid, 3: Exchange) e eCPM decrescente
    const sorted = candidates.sort((a, b) => {
      if (a.priorityTier !== b.priorityTier) {
        return a.priorityTier - b.priorityTier;
      }
      return b.ecpm - a.ecpm;
    });

    const winner = sorted[0];

    // Regra do Segundo Preço (Second-Price Auction):
    // Se houver 2º colocado no mesmo tier de leilão, paga second.ecpm + $0.01 (limitado ao lance do vencedor)
    // Se for único concorrente, paga o floorEcpm
    let clearingPrice = floorEcpm;
    const sameTierSecond = sorted.find(
      (c, idx) => idx > 0 && c.priorityTier === winner.priorityTier,
    );

    if (sameTierSecond) {
      clearingPrice = Math.min(
        winner.ecpm,
        Math.max(sameTierSecond.ecpm + 0.01, floorEcpm),
      );
    } else {
      clearingPrice = Math.max(floorEcpm, Math.min(winner.ecpm, floorEcpm));
      if (clearingPrice === 0 && winner.ecpm > 0) {
        clearingPrice = Number((winner.ecpm * 0.8).toFixed(4));
      }
    }

    return {
      winner,
      clearingPrice: Number(clearingPrice.toFixed(4)),
    };
  }

  private async resolveEligibleCandidates(
    country: string,
    format: AdFormat,
    publisherOrgId: string,
    floorEcpm: number,
    advertisingId?: string,
  ): Promise<RankedCandidate[]> {
    const cacheKey = `adserver:campaigns:${country}:${format}`;
    let campaigns = await this.deps.cache.get<any[]>(cacheKey);

    if (!campaigns) {
      try {
        campaigns = await this.deps.prisma.campaign.findMany({
          where: {
            status: 'ACTIVE',
            targetCountry: country,
            creatives: {
              some: {
                format,
                isActive: true,
              },
            },
          },
          include: {
            creatives: {
              where: {
                format,
                isActive: true,
              },
            },
          },
        });

        if (campaigns && campaigns.length > 0) {
          await this.deps.cache.set(cacheKey, campaigns, 60); // 1 min cache
        }
      } catch {
        campaigns = [];
      }
    }

    if (!campaigns || campaigns.length === 0) {
      return [];
    }

    const candidates: RankedCandidate[] = [];

    for (const campaign of campaigns) {
      // 1. Regra de auto-impressão
      if (
        campaign.type !== CampaignType.HOUSE_AD &&
        campaign.organizationId === publisherOrgId
      ) {
        continue;
      }

      // 2. Frequency Capping
      const capPerHour = campaign.frequencyCapPerHour || 3;
      if (advertisingId && capPerHour > 0) {
        const allowed =
          await this.deps.cache.checkAndIncrementFrequency(
            campaign.id,
            advertisingId,
            capPerHour,
          );
        if (!allowed) {
          continue;
        }
      }

      // 3. Cálculo de eCPM e Piso de Reserva
      const ecpm = this.calculateEcpm(campaign);
      if (ecpm < floorEcpm) {
        continue;
      }

      // 4. Seleção de Criativo Ativo no Formato
      const validCreatives = (campaign.creatives || []).filter(
        (c: any) => c.format === format && c.isActive,
      );

      if (validCreatives.length === 0) {
        continue;
      }

      // Tiering
      let priorityTier = 2; // Paid
      if (campaign.type === CampaignType.HOUSE_AD) {
        priorityTier = 3; // Fallback
      } else if (campaign.type === CampaignType.EXCHANGE) {
        priorityTier = 2.5; // Exchange
      }

      candidates.push({
        campaign,
        creative: validCreatives[0],
        ecpm,
        priorityTier,
      });
    }

    return candidates;
  }

  private async resolveApp(sdkKey: string): Promise<any | null> {
    const cacheKey = `adserver:app:${sdkKey}`;
    const cached = await this.deps.cache.get<any>(cacheKey);
    if (cached) return cached;

    try {
      const app = await this.deps.prisma.app.findUnique({
        where: { sdkKey },
      });
      if (app) {
        await this.deps.cache.set(cacheKey, app, 300);
      }
      return app;
    } catch {
      return null;
    }
  }

  private async resolveAdUnit(adUnitId: string): Promise<any | null> {
    const cacheKey = `adserver:adunit:${adUnitId}`;
    const cached = await this.deps.cache.get<any>(cacheKey);
    if (cached) return cached;

    try {
      const adUnit = await this.deps.prisma.adUnit.findUnique({
        where: { id: adUnitId },
      });
      if (adUnit) {
        await this.deps.cache.set(cacheKey, adUnit, 180);
      }
      return adUnit;
    } catch {
      return null;
    }
  }
}
