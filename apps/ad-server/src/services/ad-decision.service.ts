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

export class AdDecisionService {
  private readonly tokenTtlSeconds: number;
  private readonly serverBaseUrl: string;

  constructor(private readonly deps: AdDecisionDeps) {
    this.tokenTtlSeconds = deps.tokenTtlSeconds || 900;
    this.serverBaseUrl = deps.serverBaseUrl || 'https://mgp-production-mgp-adserver.gtalg3.easypanel.host';
  }

  /**
   * Processa a solicitação de anúncio e executa o leilão/seleção em ultra-baixa latência.
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

    // 3. Busca de Campanhas Elegíveis
    const eligibleCampaigns = await this.resolveEligibleCampaigns(
      country,
      request.format,
      app.organizationId,
      floorEcpm,
    );

    if (!eligibleCampaigns || eligibleCampaigns.length === 0) {
      return {
        requestId,
        fill: false,
        reason: 'NO_ELIGIBLE_CAMPAIGN',
      };
    }

    // 4. Seleção da Melhor Campanha (Prioridade: PAID com maior bid > EXCHANGE > HOUSE_AD)
    const selectedCampaign = this.selectWinningCampaign(eligibleCampaigns);
    if (!selectedCampaign || !selectedCampaign.creatives || selectedCampaign.creatives.length === 0) {
      return {
        requestId,
        fill: false,
        reason: 'NO_CREATIVES_AVAILABLE',
      };
    }

    const creative = selectedCampaign.creatives[0];
    const now = Date.now();
    const expiresAt = now + this.tokenTtlSeconds * 1000;

    // 5. Geração de Tokens Criptográficos Assinados
    const tokenPayload: AdTrackingTokenPayload = {
      requestId,
      adUnitId: adUnit.id,
      campaignId: selectedCampaign.id,
      creativeId: creative.id,
      publisherAppId: app.id,
      publisherOrgId: app.organizationId,
      advertiserOrgId: selectedCampaign.organizationId,
      bidAmount: Number(selectedCampaign.bidAmount),
      billingModel: selectedCampaign.billingModel,
      format: request.format,
      actionUrl: creative.actionUrl,
      issuedAt: now,
      expiresAt,
    };

    const impressionToken = this.deps.tokenService.generateTrackingToken(tokenPayload);
    const clickToken = this.deps.tokenService.generateTrackingToken(tokenPayload);

    // URL de rastreamento de clique intermediária que registra a métrica e redireciona para a actionUrl real
    const trackingClickUrl = `${this.serverBaseUrl}/click/track?t=${encodeURIComponent(clickToken)}`;

    return {
      requestId,
      fill: true,
      campaignId: selectedCampaign.id,
      campaignType: selectedCampaign.type as CampaignType,
      creative: {
        id: creative.id,
        type: creative.format as AdFormat,
        width: creative.width,
        height: creative.height,
        title: creative.title,
        description: creative.description || undefined,
        imageUrl: creative.imageUrl,
        actionUrl: trackingClickUrl,
      },
      tracking: {
        impressionToken,
        clickToken,
        expiresAt: new Date(expiresAt).toISOString(),
      },
    };
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
        await this.deps.cache.set(cacheKey, app, 300); // 5 min
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
        await this.deps.cache.set(cacheKey, adUnit, 180); // 3 min
      }
      return adUnit;
    } catch {
      return null;
    }
  }

  private async resolveEligibleCampaigns(
    country: string,
    format: AdFormat,
    publisherOrgId: string,
    floorEcpm: number,
  ): Promise<any[]> {
    const cacheKey = `adserver:campaigns:${country}:${format}`;
    const cached = await this.deps.cache.get<any[]>(cacheKey);
    if (cached) {
      return this.filterEligibleCampaigns(cached, publisherOrgId, floorEcpm);
    }

    try {
      const campaigns = await this.deps.prisma.campaign.findMany({
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

      return this.filterEligibleCampaigns(campaigns, publisherOrgId, floorEcpm);
    } catch {
      return [];
    }
  }

  private filterEligibleCampaigns(
    campaigns: any[],
    publisherOrgId: string,
    floorEcpm: number,
  ): any[] {
    return campaigns.filter((c) => {
      // Regra de auto-impressão: campanhas pagas de outros anunciantes ou campanhas da própria org do tipo HOUSE_AD
      if (c.type !== 'HOUSE_AD' && c.organizationId === publisherOrgId) {
        return false;
      }
      // Checagem de preço de reserva / floor eCPM
      const bid = Number(c.bidAmount) || 0;
      if (bid < floorEcpm) {
        return false;
      }
      return true;
    });
  }

  private selectWinningCampaign(campaigns: any[]): any | null {
    if (campaigns.length === 0) return null;

    // Ordenação determinística: PAID (maior bid) > EXCHANGE > HOUSE_AD
    return campaigns.sort((a, b) => {
      const typeRank = { PAID: 3, EXCHANGE: 2, HOUSE_AD: 1 };
      const rankA = typeRank[a.type as keyof typeof typeRank] || 0;
      const rankB = typeRank[b.type as keyof typeof typeRank] || 0;

      if (rankA !== rankB) {
        return rankB - rankA;
      }

      const bidA = Number(a.bidAmount) || 0;
      const bidB = Number(b.bidAmount) || 0;
      return bidB - bidA;
    })[0];
  }
}
