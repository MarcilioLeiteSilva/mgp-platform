import { AdDecisionService } from './ad-decision.service';
import { TokenService } from './token.service';
import { CacheService } from './cache.service';
import { AdRequestDto } from '@mgp/contracts';
import { AdFormat, CampaignType } from '@mgp/shared';

describe('AdDecisionService (Motor de Decisão e Leilão de Anúncios)', () => {
  let service: AdDecisionService;
  let mockPrisma: any;
  let cache: CacheService;
  let tokenService: TokenService;

  const validSdkKey = 'mgp_live_app_pub_key_001';
  const validAppId = 'app_pub_001';
  const validAdUnitId = 'adunit_banner_001';

  beforeEach(() => {
    cache = new CacheService('redis://127.0.0.1:6379');
    tokenService = new TokenService('test_secret_for_decision_service');

    mockPrisma = {
      app: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.sdkKey === validSdkKey) {
            return Promise.resolve({
              id: validAppId,
              organizationId: 'org_publisher',
              name: 'App Publisher Oficial',
              sdkKey: validSdkKey,
              isActive: true,
            });
          }
          return Promise.resolve(null);
        }),
      },
      adUnit: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === validAdUnitId) {
            return Promise.resolve({
              id: validAdUnitId,
              appId: validAppId,
              name: 'Banner Principal',
              format: 'BANNER',
              floorEcpm: 1.0,
              isActive: true,
            });
          }
          return Promise.resolve(null);
        }),
      },
      campaign: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cmp_paid_001',
            organizationId: 'org_advertiser',
            name: 'Campanha Paga 1',
            type: 'PAID',
            billingModel: 'CPM',
            bidAmount: 3.5,
            status: 'ACTIVE',
            targetCountry: 'BR',
            creatives: [
              {
                id: 'crt_001',
                format: 'BANNER',
                title: 'Aprenda Inglês',
                description: 'Baixe o app agora!',
                imageUrl: 'https://cdn.exemplo.com/banner.png',
                actionUrl: 'https://exemplo.com/download',
                width: 320,
                height: 50,
                isActive: true,
              },
            ],
          },
        ]),
      },
    };

    service = new AdDecisionService({
      prisma: mockPrisma,
      cache,
      tokenService,
      tokenTtlSeconds: 900,
      serverBaseUrl: 'https://ads.mgp.com.br',
    });
  });

  afterEach(async () => {
    await cache.close();
  });

  const baseRequest: AdRequestDto = {
    adUnitId: validAdUnitId,
    format: AdFormat.BANNER,
    placement: 'home_screen',
    device: {
      platform: 'ANDROID',
      country: 'BR',
      language: 'pt-BR',
      isLimitAdTracking: false,
    },
    sdkVersion: '1.0.0',
  };

  it('deve retornar preenchimento (fill: true) com criativo e tokens assinados para requisição válida', async () => {
    const result = await service.decideAd(baseRequest, {
      sdkKey: validSdkKey,
      appId: validAppId,
    });

    expect(result.fill).toBe(true);
    if (result.fill) {
      expect(result.campaignId).toBe('cmp_paid_001');
      expect(result.campaignType).toBe(CampaignType.PAID);
      expect(result.creative.title).toBe('Aprenda Inglês');
      expect(result.creative.width).toBe(320);
      expect(result.creative.height).toBe(50);
      expect(result.creative.actionUrl).toContain('/click/track?t=');

      // Verifica validade dos tokens gerados
      expect(result.tracking.impressionToken).toBeDefined();
      expect(result.tracking.clickToken).toBeDefined();

      const verifiedImp = tokenService.verifyTrackingToken(result.tracking.impressionToken);
      expect(verifiedImp).not.toBeNull();
      expect(verifiedImp?.publisherAppId).toBe(validAppId);
      expect(verifiedImp?.bidAmount).toBe(3.5);
    }
  });

  it('deve rejeitar requisição sem SDK Key (fill: false, UNAUTHORIZED_MISSING_SDK_KEY)', async () => {
    const result = await service.decideAd(baseRequest, {
      appId: validAppId,
    });

    expect(result.fill).toBe(false);
    if (!result.fill) {
      expect(result.reason).toBe('UNAUTHORIZED_MISSING_SDK_KEY');
    }
  });

  it('deve rejeitar requisição com SDK Key inexistente', async () => {
    const result = await service.decideAd(baseRequest, {
      sdkKey: 'invalid_unknown_key',
    });

    expect(result.fill).toBe(false);
    if (!result.fill) {
      expect(result.reason).toBe('UNAUTHORIZED_INVALID_OR_INACTIVE_APP');
    }
  });

  it('deve rejeitar quando AdUnit não for encontrada', async () => {
    const reqWithBadAdUnit = { ...baseRequest, adUnitId: 'adunit_inexistente' };
    const result = await service.decideAd(reqWithBadAdUnit, {
      sdkKey: validSdkKey,
    });

    expect(result.fill).toBe(false);
    if (!result.fill) {
      expect(result.reason).toBe('AD_UNIT_NOT_FOUND');
    }
  });

  it('deve rejeitar quando houver incompatibilidade de formato (FORMAT_MISMATCH)', async () => {
    const reqInterstitial = { ...baseRequest, format: AdFormat.INTERSTITIAL };
    const result = await service.decideAd(reqInterstitial, {
      sdkKey: validSdkKey,
    });

    expect(result.fill).toBe(false);
    if (!result.fill) {
      expect(result.reason).toBe('AD_UNIT_FORMAT_MISMATCH');
    }
  });

  it('deve filtrar campanha se o bid for inferior ao floor eCPM do AdUnit', async () => {
    mockPrisma.campaign.findMany.mockResolvedValueOnce([
      {
        id: 'cmp_low_bid',
        organizationId: 'org_advertiser',
        type: 'PAID',
        bidAmount: 0.5, // Menor que o floor de 1.0
        creatives: [{ id: 'c1', format: 'BANNER', isActive: true }],
      },
    ]);

    const result = await service.decideAd(baseRequest, {
      sdkKey: validSdkKey,
    });

    expect(result.fill).toBe(false);
    if (!result.fill) {
      expect(result.reason).toBe('NO_ELIGIBLE_CAMPAIGN');
    }
  });

  it('deve filtrar campanha própria do publisher para evitar auto-impressão paga', async () => {
    mockPrisma.campaign.findMany.mockResolvedValueOnce([
      {
        id: 'cmp_same_org',
        organizationId: 'org_publisher', // Mesma organização do app
        type: 'PAID',
        bidAmount: 5.0,
        creatives: [{ id: 'c1', format: 'BANNER', isActive: true }],
      },
    ]);

    const result = await service.decideAd(baseRequest, {
      sdkKey: validSdkKey,
    });

    expect(result.fill).toBe(false);
    if (!result.fill) {
      expect(result.reason).toBe('NO_ELIGIBLE_CAMPAIGN');
    }
  });
});
