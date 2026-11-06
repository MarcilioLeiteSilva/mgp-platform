import { AdDecisionService } from './ad-decision.service';
import { TokenService } from './token.service';
import { CacheService } from './cache.service';
import { AdRequestDto } from '@mgp/contracts';
import { AdFormat, CampaignType } from '@mgp/shared';

describe('AdDecisionService (Motor de Decisão, Leilão RTB e Formatos)', () => {
  let service: AdDecisionService;
  let mockPrisma: any;
  let cache: CacheService;
  let tokenService: TokenService;

  const validSdkKey = 'mgp_live_app_pub_key_001';
  const validAppId = 'app_pub_001';
  const validAdUnitId = 'adunit_banner_001';
  const nativeAdUnitId = 'adunit_native_001';
  const rewardedAdUnitId = 'adunit_rewarded_001';
  const interstitialAdUnitId = 'adunit_interstitial_001';

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
          if (where.id === nativeAdUnitId) {
            return Promise.resolve({
              id: nativeAdUnitId,
              appId: validAppId,
              name: 'Feed Nativo',
              format: 'NATIVE',
              floorEcpm: 1.5,
              isActive: true,
            });
          }
          if (where.id === interstitialAdUnitId) {
            return Promise.resolve({
              id: interstitialAdUnitId,
              appId: validAppId,
              name: 'Transição Interstitial',
              format: 'INTERSTITIAL',
              floorEcpm: 2.0,
              isActive: true,
            });
          }
          if (where.id === rewardedAdUnitId) {
            return Promise.resolve({
              id: rewardedAdUnitId,
              appId: validAppId,
              name: 'Vídeo Premiado',
              format: 'REWARDED',
              floorEcpm: 3.0,
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
            frequencyCapPerHour: 5,
            creatives: [
              {
                id: 'crt_banner_001',
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
      advertisingId: 'gaid_test_123',
      isLimitAdTracking: false,
    },
    sdkVersion: '1.0.0',
  };

  it('deve calcular eCPM corretamente para modelos CPM, CPC e CPI', () => {
    // CPM: eCPM = bidAmount
    expect(service.calculateEcpm({ billingModel: 'CPM', bidAmount: 4.5 })).toBe(4.5);

    // CPC: eCPM = bid * 0.02 * 1000 = bid * 20
    expect(service.calculateEcpm({ billingModel: 'CPC', bidAmount: 0.25 })).toBe(5.0);

    // CPI: eCPM = bid * 0.02 * 0.1 * 1000 = bid * 2
    expect(service.calculateEcpm({ billingModel: 'CPI', bidAmount: 3.0 })).toBe(6.0);
  });

  it('deve executar leilão RTB Second-Price calculando clearingPrice baseado no 2º colocado', async () => {
    mockPrisma.campaign.findMany.mockResolvedValueOnce([
      {
        id: 'cmp_1st',
        organizationId: 'org_adv_1',
        type: 'PAID',
        billingModel: 'CPM',
        bidAmount: 5.0, // eCPM = 5.0
        status: 'ACTIVE',
        creatives: [{ id: 'crt_1', format: 'BANNER', isActive: true, width: 320, height: 50, imageUrl: 'https://a.com/1.png', actionUrl: 'https://a.com' }],
      },
      {
        id: 'cmp_2nd',
        organizationId: 'org_adv_2',
        type: 'PAID',
        billingModel: 'CPM',
        bidAmount: 3.2, // eCPM = 3.2
        status: 'ACTIVE',
        creatives: [{ id: 'crt_2', format: 'BANNER', isActive: true, width: 320, height: 50, imageUrl: 'https://a.com/2.png', actionUrl: 'https://a.com' }],
      },
    ]);

    const result = await service.decideAd(baseRequest, { sdkKey: validSdkKey });

    expect(result.fill).toBe(true);
    if (result.fill) {
      expect(result.campaignId).toBe('cmp_1st');
      expect(result.pricing).toBeDefined();
      expect(result.pricing?.bidAmount).toBe(5.0);
      // Second price = 3.2 + 0.01 = 3.21
      expect(result.pricing?.clearingPrice).toBe(3.21);
    }
  });

  it('deve entregar formato NATIVE com metadados estruturados (iconUrl, ctaText, starRating, sponsorText)', async () => {
    mockPrisma.campaign.findMany.mockResolvedValueOnce([
      {
        id: 'cmp_native',
        organizationId: 'org_adv_native',
        type: 'PAID',
        billingModel: 'CPM',
        bidAmount: 4.0,
        name: 'Tech Finanças',
        status: 'ACTIVE',
        creatives: [
          {
            id: 'crt_nat_1',
            format: 'NATIVE',
            title: 'Cartão Sem Anuidade',
            description: 'Abra sua conta digital em 2 minutos!',
            imageUrl: 'https://cdn.exemplo.com/main_card.png',
            iconUrl: 'https://cdn.exemplo.com/icon.png',
            actionUrl: 'https://exemplo.com/abrir-conta',
            ctaText: 'Solicitar Cartão',
            starRating: 4.8,
            sponsorText: 'TechBank Oficial',
            width: 300,
            height: 250,
            isActive: true,
          },
        ],
      },
    ]);

    const nativeReq: AdRequestDto = {
      ...baseRequest,
      adUnitId: nativeAdUnitId,
      format: AdFormat.NATIVE,
    };

    const result = await service.decideAd(nativeReq, { sdkKey: validSdkKey });

    expect(result.fill).toBe(true);
    if (result.fill) {
      expect(result.creative.type).toBe(AdFormat.NATIVE);
      expect(result.creative.iconUrl).toBe('https://cdn.exemplo.com/icon.png');
      expect(result.creative.ctaText).toBe('Solicitar Cartão');
      expect(result.creative.starRating).toBe(4.8);
      expect(result.creative.sponsorText).toBe('TechBank Oficial');
    }
  });

  it('deve entregar formato INTERSTITIAL com dimensões fullscreen e skipOffsetSeconds', async () => {
    mockPrisma.campaign.findMany.mockResolvedValueOnce([
      {
        id: 'cmp_interstitial',
        organizationId: 'org_adv_inter',
        type: 'PAID',
        billingModel: 'CPM',
        bidAmount: 6.0,
        status: 'ACTIVE',
        creatives: [
          {
            id: 'crt_inter_1',
            format: 'INTERSTITIAL',
            title: 'Jogo RPG Exclusivo',
            imageUrl: 'https://cdn.exemplo.com/interstitial_full.png',
            actionUrl: 'https://exemplo.com/jogar',
            skipOffsetSeconds: 5,
            width: 1080,
            height: 1920,
            isActive: true,
          },
        ],
      },
    ]);

    const interReq: AdRequestDto = {
      ...baseRequest,
      adUnitId: interstitialAdUnitId,
      format: AdFormat.INTERSTITIAL,
    };

    const result = await service.decideAd(interReq, { sdkKey: validSdkKey });

    expect(result.fill).toBe(true);
    if (result.fill) {
      expect(result.creative.type).toBe(AdFormat.INTERSTITIAL);
      expect(result.creative.width).toBe(1080);
      expect(result.creative.height).toBe(1920);
      expect(result.creative.skipOffsetSeconds).toBe(5);
    }
  });

  it('deve entregar formato REWARDED com rewardToken assinado e metadados de recompensa', async () => {
    mockPrisma.campaign.findMany.mockResolvedValueOnce([
      {
        id: 'cmp_rewarded',
        organizationId: 'org_adv_rew',
        type: 'PAID',
        billingModel: 'CPM',
        bidAmount: 8.0,
        status: 'ACTIVE',
        creatives: [
          {
            id: 'crt_rew_1',
            format: 'REWARDED',
            title: 'Assista e ganhe 50 Moedas',
            imageUrl: 'https://cdn.exemplo.com/rewarded_video.png',
            actionUrl: 'https://exemplo.com/promocao',
            rewardType: 'GOLD_COINS',
            rewardAmount: 50,
            requiredWatchSeconds: 15,
            width: 1080,
            height: 1920,
            isActive: true,
          },
        ],
      },
    ]);

    const rewardedReq: AdRequestDto = {
      ...baseRequest,
      adUnitId: rewardedAdUnitId,
      format: AdFormat.REWARDED,
    };

    const result = await service.decideAd(rewardedReq, { sdkKey: validSdkKey });

    expect(result.fill).toBe(true);
    if (result.fill) {
      expect(result.creative.type).toBe(AdFormat.REWARDED);
      expect(result.creative.rewardType).toBe('GOLD_COINS');
      expect(result.creative.rewardAmount).toBe(50);
      expect(result.creative.requiredWatchSeconds).toBe(15);
      expect(result.tracking.rewardToken).toBeDefined();

      const decodedReward = tokenService.verifyTrackingToken(result.tracking.rewardToken!);
      expect(decodedReward).not.toBeNull();
      expect(decodedReward?.rewardType).toBe('GOLD_COINS');
      expect(decodedReward?.rewardAmount).toBe(50);
      expect(decodedReward?.requiredWatchSeconds).toBe(15);
    }
  });

  it('deve respeitar Frequency Capping e descartar campanha que excedeu limite do usuário', async () => {
    jest.spyOn(cache, 'checkAndIncrementFrequency').mockResolvedValueOnce(false); // Simula limite estourado

    const result = await service.decideAd(baseRequest, { sdkKey: validSdkKey });

    expect(result.fill).toBe(false);
    if (!result.fill) {
      expect(result.reason).toBe('NO_ELIGIBLE_CAMPAIGN');
    }
  });

  it('deve filtrar campanha quando o eCPM calculado for inferior ao floor eCPM do AdUnit', async () => {
    mockPrisma.campaign.findMany.mockResolvedValueOnce([
      {
        id: 'cmp_low_bid',
        organizationId: 'org_advertiser',
        type: 'PAID',
        billingModel: 'CPM',
        bidAmount: 0.5, // Menor que o floor de 1.0
        creatives: [{ id: 'c1', format: 'BANNER', isActive: true }],
      },
    ]);

    const result = await service.decideAd(baseRequest, { sdkKey: validSdkKey });

    expect(result.fill).toBe(false);
    if (!result.fill) {
      expect(result.reason).toBe('NO_ELIGIBLE_CAMPAIGN');
    }
  });
});
