import { buildApp } from '../app';
import { CacheService } from '../services/cache.service';
import { TokenService } from '../services/token.service';
import { EventQueueService } from '../services/event-queue.service';
import { AdDecisionService } from '../services/ad-decision.service';
import { AdServerConfig } from '../config/ad-server.config';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';

describe('ETAPA 3 — End-to-End Integration Suite (SDK Android, Ad Server & Workers Pipeline)', () => {
  let app: FastifyInstance;
  let cache: CacheService;
  let tokenService: TokenService;
  let eventQueue: EventQueueService;
  let decisionService: AdDecisionService;
  let mockPrisma: any;

  const secret = 'super_secret_e2e_encryption_key_32bytes_long!';
  const sdkKey = 'mgp_live_test_sdk_key_e2e_001';
  const publisherAppId = 'app_pub_e2e_001';
  const publisherOrgId = 'org_pub_e2e_001';
  const advertiserOrgId = 'org_adv_e2e_001';

  beforeAll(async () => {
    cache = new CacheService('redis://127.0.0.1:6379');
    tokenService = new TokenService(secret);
    eventQueue = new EventQueueService('redis://127.0.0.1:6379');

    mockPrisma = {
      app: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.sdkKey === sdkKey) {
            return Promise.resolve({
              id: publisherAppId,
              organizationId: publisherOrgId,
              name: 'Awesome Game Publisher',
              sdkKey,
              isActive: true,
            });
          }
          return Promise.resolve(null);
        }),
      },
      adUnit: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          let format = 'BANNER';
          if (where.id.includes('interstitial')) format = 'INTERSTITIAL';
          else if (where.id.includes('rewarded')) format = 'REWARDED';
          else if (where.id.includes('native')) format = 'NATIVE';

          return Promise.resolve({
            id: where.id,
            appId: publisherAppId,
            name: `AdUnit ${where.id}`,
            format,
            floorEcpm: 0.50,
            isActive: true,
          });
        }),
      },
      campaign: {
        findMany: jest.fn().mockImplementation(() => {
          return Promise.resolve([
            {
              id: 'camp_cpm_high',
              organizationId: advertiserOrgId,
              name: 'High Bid CPM Campaign',
              type: 'PAID',
              billingModel: 'CPM',
              bidAmount: 12.00,
              priorityTier: 2,
              frequencyCapPerHour: 5,
              status: 'ACTIVE',
              targetCountry: 'BR',
              creatives: [
                {
                  id: 'creat_banner_cpm',
                  format: 'BANNER',
                  title: 'Banner de Alta Performance',
                  imageUrl: 'https://cdn.mgp.io/b1.png',
                  actionUrl: 'https://adv.example.com/click-cpm',
                  width: 320,
                  height: 50,
                  ctaText: 'Ver Agora',
                  isActive: true,
                },
                {
                  id: 'creat_interstitial_cpm',
                  format: 'INTERSTITIAL',
                  title: 'Interstitial Fullscreen',
                  imageUrl: 'https://cdn.mgp.io/int1.png',
                  actionUrl: 'https://adv.example.com/click-int',
                  width: 1080,
                  height: 1920,
                  skipOffsetSeconds: 5,
                  ctaText: 'Baixar Grátis',
                  isActive: true,
                },
                {
                  id: 'creat_rewarded_cpm',
                  format: 'REWARDED',
                  title: 'Vídeo Recompensado Exclusivo',
                  imageUrl: 'https://cdn.mgp.io/rew1.png',
                  actionUrl: 'https://adv.example.com/click-rew',
                  width: 1080,
                  height: 1920,
                  rewardType: 'GEMS',
                  rewardAmount: 100,
                  requiredWatchSeconds: 15,
                  ctaText: 'Resgatar Gemas',
                  isActive: true,
                },
                {
                  id: 'creat_native_cpm',
                  format: 'NATIVE',
                  title: 'Anúncio Nativo Integrado',
                  description: 'Experimente a melhor experiência gamer mobile.',
                  imageUrl: 'https://cdn.mgp.io/nat1.png',
                  iconUrl: 'https://cdn.mgp.io/icon1.png',
                  actionUrl: 'https://adv.example.com/click-nat',
                  width: 300,
                  height: 250,
                  ctaText: 'Jogar',
                  starRating: 4.8,
                  sponsorText: 'Patrocinado por GameStudio',
                  isActive: true,
                },
              ],
            },
            {
              id: 'camp_cpm_second',
              organizationId: 'org_adv_secondary',
              name: 'Second Bid CPM Campaign',
              type: 'PAID',
              billingModel: 'CPM',
              bidAmount: 8.50,
              priorityTier: 2,
              frequencyCapPerHour: 5,
              status: 'ACTIVE',
              targetCountry: 'BR',
              creatives: [
                {
                  id: 'creat_banner_second',
                  format: 'BANNER',
                  title: 'Second Banner',
                  imageUrl: 'https://cdn.mgp.io/b2.png',
                  actionUrl: 'https://adv2.example.com/click',
                  width: 320,
                  height: 50,
                  isActive: true,
                },
              ],
            },
          ]);
        }),
      },
    };

    decisionService = new AdDecisionService({
      prisma: mockPrisma,
      cache,
      tokenService,
      tokenTtlSeconds: 900,
      serverBaseUrl: 'https://ads.mgp.com.br',
    });

    const testConfig: AdServerConfig = {
      PORT: 3001,
      HOST: '127.0.0.1',
      NODE_ENV: 'test',
      REDIS_URL: 'redis://127.0.0.1:6379',
      HMAC_SECRET: secret,
      TOKEN_TTL_SECONDS: 900,
      NONCE_TTL_SECONDS: 600,
      RATE_LIMIT_MAX: 1000,
      RATE_LIMIT_WINDOW_MS: 60000,
      CORS_ORIGIN: '*',
    };

    app = buildApp({
      config: testConfig,
      prisma: mockPrisma,
      cache,
      tokenService,
      eventQueue,
      adDecisionService: decisionService,
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await eventQueue.close();
    await cache.close();
  });

  describe('1. Ciclo de Vida do Formato BANNER (Requisição -> Leilão RTB -> Impressão MRC -> Clique)', () => {
    let adResponse: any;

    it('deve realizar requisição com sucesso e executar leilão de segundo preço (Vickrey)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/ads/request',
        headers: {
          'x-mgp-sdk-key': sdkKey,
          'x-mgp-app-id': publisherAppId,
        },
        payload: {
          adUnitId: 'adunit_banner_main',
          format: 'BANNER',
          placement: 'top_screen',
          device: {
            platform: 'ANDROID',
            osVersion: '14.0',
            deviceModel: 'Pixel 8',
            language: 'pt-BR',
            country: 'BR',
            advertisingId: 'ad-id-user-001',
            isLimitAdTracking: false,
          },
          sdkVersion: '1.0.0',
        },
      });

      expect(response.statusCode).toBe(200);
      adResponse = JSON.parse(response.body);

      expect(adResponse.fill).toBe(true);
      expect(adResponse.creative.type).toBe('BANNER');
      expect(adResponse.creative.title).toBe('Banner de Alta Performance');

      // Vencedor deu bid de 12.00, segundo deu bid de 8.50 -> Vickrey Clearing Price = 8.51
      expect(adResponse.pricing.model).toBe('CPM');
      expect(adResponse.pricing.bidAmount).toBe(12.00);
      expect(adResponse.pricing.clearingPrice).toBe(8.51);

      expect(adResponse.tracking.impressionToken).toBeDefined();
      expect(adResponse.tracking.clickToken).toBeDefined();
    });

    it('deve validar e aceitar confirmação de impressão com métricas de Viewability (MRC 1000ms)', async () => {
      const nonce = randomUUID();
      const response = await app.inject({
        method: 'POST',
        url: '/events/impression',
        headers: { 'x-sdk-key': sdkKey },
        payload: {
          impressionToken: adResponse.tracking.impressionToken,
          nonce,
          renderedAt: new Date().toISOString(),
          visibilityMetrics: {
            viewablePercentage: 100,
            durationMs: 1200,
          },
        },
      });

      expect(response.statusCode).toBe(204);

      // Tentativa de replay com o mesmo nonce DEVE ser rejeitada com 409 Conflict
      const replayResponse = await app.inject({
        method: 'POST',
        url: '/events/impression',
        headers: { 'x-sdk-key': sdkKey },
        payload: {
          impressionToken: adResponse.tracking.impressionToken,
          nonce,
          renderedAt: new Date().toISOString(),
          visibilityMetrics: { viewablePercentage: 100, durationMs: 1200 },
        },
      });

      expect(replayResponse.statusCode).toBe(409);
    });

    it('deve validar clique e redirecionar via rota de track com 302', async () => {
      const nonce = randomUUID();
      const clickResponse = await app.inject({
        method: 'POST',
        url: '/events/click',
        headers: { 'x-sdk-key': sdkKey },
        payload: {
          clickToken: adResponse.tracking.clickToken,
          nonce,
          clickedAt: new Date().toISOString(),
          interactionMetrics: { touchX: 160, touchY: 25, durationBeforeClickMs: 3400 },
        },
      });

      expect(clickResponse.statusCode).toBe(204);

      // GET /click/track deve redirecionar para a actionUrl da campanha
      const trackResponse = await app.inject({
        method: 'GET',
        url: `/click/track?t=${encodeURIComponent(adResponse.tracking.clickToken)}`,
      });

      expect(trackResponse.statusCode).toBe(302);
      expect(trackResponse.headers.location).toBe('https://adv.example.com/click-cpm');
    });
  });

  describe('2. Ciclo de Vida do Formato INTERSTITIAL (Skip Offset & Fullscreen)', () => {
    it('deve entregar criativo Interstitial com skipOffsetSeconds configurado', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/ads/request',
        headers: {
          'x-mgp-sdk-key': sdkKey,
          'x-mgp-app-id': publisherAppId,
        },
        payload: {
          adUnitId: 'placement_interstitial_gameover',
          format: 'INTERSTITIAL',
          placement: 'game_over',
          device: {
            platform: 'ANDROID',
            osVersion: '14.0',
            deviceModel: 'Galaxy S24',
            language: 'pt-BR',
            country: 'BR',
            advertisingId: 'ad-id-user-002',
            isLimitAdTracking: false,
          },
          sdkVersion: '1.0.0',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.fill).toBe(true);
      expect(body.creative.type).toBe('INTERSTITIAL');
      expect(body.creative.skipOffsetSeconds).toBe(5);
      expect(body.creative.actionUrl).toContain('/click/track');
    });
  });

  describe('3. Ciclo de Vida do Formato REWARDED (Tempo Assistido & Resgate de Moedas)', () => {
    let rewardedAd: any;

    it('deve entregar criativo Rewarded com rewardToken, rewardType e requiredWatchSeconds', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/ads/request',
        headers: {
          'x-mgp-sdk-key': sdkKey,
          'x-mgp-app-id': publisherAppId,
        },
        payload: {
          adUnitId: 'placement_rewarded_extra_lives',
          format: 'REWARDED',
          placement: 'extra_lives',
          device: {
            platform: 'ANDROID',
            osVersion: '14.0',
            deviceModel: 'Motorola Edge',
            language: 'pt-BR',
            country: 'BR',
            advertisingId: 'ad-id-user-003',
            isLimitAdTracking: false,
          },
          sdkVersion: '1.0.0',
        },
      });

      expect(response.statusCode).toBe(200);
      rewardedAd = JSON.parse(response.body);
      expect(rewardedAd.fill).toBe(true);
      expect(rewardedAd.creative.type).toBe('REWARDED');
      expect(rewardedAd.creative.rewardType).toBe('GEMS');
      expect(rewardedAd.creative.rewardAmount).toBe(100);
      expect(rewardedAd.creative.requiredWatchSeconds).toBe(15);
      expect(rewardedAd.tracking.rewardToken).toBeDefined();
    });

    it('deve rejeitar resgate de recompensa se o tempo assistido for inferior ao obrigatório (400 Bad Request)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/events/reward',
        headers: { 'x-sdk-key': sdkKey },
        payload: {
          rewardToken: rewardedAd.tracking.rewardToken,
          nonce: randomUUID(),
          completedAt: new Date().toISOString(),
          watchDurationSeconds: 10, // Exigido: 15s -> Abandono precoce
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain('inferior');
    });

    it('deve aceitar e validar a recompensa quando tempo assistido for cumprido', async () => {
      const nonce = randomUUID();
      const response = await app.inject({
        method: 'POST',
        url: '/events/reward',
        headers: { 'x-sdk-key': sdkKey },
        payload: {
          rewardToken: rewardedAd.tracking.rewardToken,
          nonce,
          completedAt: new Date().toISOString(),
          watchDurationSeconds: 15, // Tempo integral cumprido
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.verified).toBe(true);
      expect(body.rewardType).toBe('GEMS');
      expect(body.rewardAmount).toBe(100);
    });
  });

  describe('4. Ciclo de Vida do Formato NATIVE (Custom UI Assets)', () => {
    it('deve entregar metadados ricos para renderização desacoplada de anúncio nativo', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/ads/request',
        headers: {
          'x-mgp-sdk-key': sdkKey,
          'x-mgp-app-id': publisherAppId,
        },
        payload: {
          adUnitId: 'placement_native_feed',
          format: 'NATIVE',
          placement: 'feed_item',
          device: {
            platform: 'ANDROID',
            osVersion: '14.0',
            language: 'pt-BR',
            country: 'BR',
            advertisingId: 'ad-id-user-004',
            isLimitAdTracking: false,
          },
          sdkVersion: '1.0.0',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.fill).toBe(true);
      expect(body.creative.type).toBe('NATIVE');
      expect(body.creative.title).toBe('Anúncio Nativo Integrado');
      expect(body.creative.description).toBe('Experimente a melhor experiência gamer mobile.');
      expect(body.creative.iconUrl).toBe('https://cdn.mgp.io/icon1.png');
      expect(body.creative.starRating).toBe(4.8);
      expect(body.creative.sponsorText).toBe('Patrocinado por GameStudio');
      expect(body.creative.ctaText).toBe('Jogar');
    });
  });
});
