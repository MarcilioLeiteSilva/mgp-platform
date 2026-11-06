import { buildApp } from '../app';
import { CacheService } from '../services/cache.service';
import { TokenService } from '../services/token.service';
import { EventQueueService } from '../services/event-queue.service';
import { AdDecisionService } from '../services/ad-decision.service';
import { AdServerConfig } from '../config/ad-server.config';
import { FastifyInstance } from 'fastify';

describe('MGP Ad Server Endpoints (Fastify Ultra-Low Latency Integration)', () => {
  let app: FastifyInstance;
  let cache: CacheService;
  let tokenService: TokenService;
  let eventQueue: EventQueueService;
  let mockPrisma: any;

  const secret = 'integration_test_secret_key_123';
  const sdkKey = 'mgp_live_test_sdk_key_001';
  const appId = 'app_test_001';
  const adUnitId = 'adunit_banner_001';

  beforeAll(async () => {
    cache = new CacheService('redis://127.0.0.1:6379');
    tokenService = new TokenService(secret);
    eventQueue = new EventQueueService('redis://127.0.0.1:6379');

    mockPrisma = {
      app: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.sdkKey === sdkKey) {
            return Promise.resolve({
              id: appId,
              organizationId: 'org_pub',
              name: 'App Teste',
              sdkKey,
              isActive: true,
            });
          }
          return Promise.resolve(null);
        }),
      },
      adUnit: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === adUnitId) {
            return Promise.resolve({
              id: adUnitId,
              appId,
              name: 'Banner Teste',
              format: 'BANNER',
              floorEcpm: 0.5,
              isActive: true,
            });
          }
          return Promise.resolve(null);
        }),
      },
      campaign: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'cmp_fastify_001',
            organizationId: 'org_adv',
            name: 'Campanha Rápida',
            type: 'PAID',
            billingModel: 'CPM',
            bidAmount: 4.0,
            status: 'ACTIVE',
            targetCountry: 'BR',
            creatives: [
              {
                id: 'crt_fastify_001',
                format: 'BANNER',
                title: 'Curso de Programação',
                imageUrl: 'https://exemplo.com/ad.png',
                actionUrl: 'https://exemplo.com/final-destination',
                width: 320,
                height: 50,
                isActive: true,
              },
            ],
          },
        ]),
      },
    };

    const adDecisionService = new AdDecisionService({
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
      adDecisionService,
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await eventQueue.close();
    await cache.close();
  });

  describe('GET /health', () => {
    it('deve retornar status 200 com informações de saúde e memória', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.status).toBe('healthy');
      expect(json.service).toBe('mgp-adserver');
      expect(json.memory).toBeDefined();
    });
  });

  describe('POST /ads/request', () => {
    it('deve processar solicitação de anúncio e retornar fill: true com tokens válidos', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/ads/request',
        headers: {
          'x-mgp-sdk-key': sdkKey,
          'x-mgp-app-id': appId,
        },
        payload: {
          adUnitId,
          format: 'BANNER',
          placement: 'top_screen',
          device: {
            platform: 'ANDROID',
            country: 'BR',
            language: 'pt-BR',
            isLimitAdTracking: false,
          },
          sdkVersion: '1.0.0',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.fill).toBe(true);
      expect(body.creative.title).toBe('Curso de Programação');
      expect(body.creative.width).toBe(320);
      expect(body.creative.height).toBe(50);
      expect(body.tracking.impressionToken).toBeDefined();
      expect(body.tracking.clickToken).toBeDefined();
    });

    it('deve rejeitar payload inválido com 400 Bad Request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/ads/request',
        headers: {
          'x-mgp-sdk-key': sdkKey,
        },
        payload: {
          // Payload incompleto sem adUnitId e format
          device: { platform: 'ANDROID' },
        },
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /events/impression', () => {
    let validImpressionToken: string;

    beforeAll(() => {
      validImpressionToken = tokenService.generateTrackingToken({
        requestId: 'req_imp_test',
        adUnitId,
        campaignId: 'cmp_fastify_001',
        creativeId: 'crt_fastify_001',
        publisherAppId: appId,
        publisherOrgId: 'org_pub',
        advertiserOrgId: 'org_adv',
        bidAmount: 4.0,
        billingModel: 'CPM',
        format: 'BANNER',
        actionUrl: 'https://exemplo.com/destination',
        issuedAt: Date.now(),
        expiresAt: Date.now() + 60000,
      });
    });

    it('deve aceitar evento de impressão e responder com 204 No Content', async () => {
      const nonce = '00000000-0000-4000-8000-000000000010';
      const response = await app.inject({
        method: 'POST',
        url: '/events/impression',
        payload: {
          impressionToken: validImpressionToken,
          nonce,
          renderedAt: new Date().toISOString(),
          visibilityMetrics: {
            viewablePercentage: 100,
            durationMs: 1500,
          },
        },
      });

      expect(response.statusCode).toBe(204);
    });

    it('deve rejeitar repetição do mesmo nonce (Replay Attack) com 409 Conflict', async () => {
      const nonce = '00000000-0000-4000-8000-000000000011';
      // Primeira requisição: 204
      await app.inject({
        method: 'POST',
        url: '/events/impression',
        payload: {
          impressionToken: validImpressionToken,
          nonce,
          renderedAt: new Date().toISOString(),
          visibilityMetrics: { viewablePercentage: 100, durationMs: 1000 },
        },
      });

      // Segunda requisição com mesmo nonce: 409
      const replayResponse = await app.inject({
        method: 'POST',
        url: '/events/impression',
        payload: {
          impressionToken: validImpressionToken,
          nonce,
          renderedAt: new Date().toISOString(),
          visibilityMetrics: { viewablePercentage: 100, durationMs: 1000 },
        },
      });

      expect(replayResponse.statusCode).toBe(409);
      expect(replayResponse.json().error.code).toBe('NONCE_ALREADY_USED');
    });

    it('deve rejeitar token de impressão adulterado com 400 Bad Request', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/events/impression',
        payload: {
          impressionToken: 'invalid.tampered_signature',
          nonce: '00000000-0000-4000-8000-000000000012',
          renderedAt: new Date().toISOString(),
          visibilityMetrics: { viewablePercentage: 100, durationMs: 1000 },
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });
  });

  describe('POST /events/click & GET /click/track', () => {
    let validClickToken: string;

    beforeAll(() => {
      validClickToken = tokenService.generateTrackingToken({
        requestId: 'req_click_test',
        adUnitId,
        campaignId: 'cmp_fastify_001',
        creativeId: 'crt_fastify_001',
        publisherAppId: appId,
        publisherOrgId: 'org_pub',
        advertiserOrgId: 'org_adv',
        bidAmount: 4.0,
        billingModel: 'CPM',
        format: 'BANNER',
        actionUrl: 'https://google.com',
        issuedAt: Date.now(),
        expiresAt: Date.now() + 60000,
      });
    });

    it('deve aceitar evento direto de clique em /events/click e responder 204 No Content', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/events/click',
        payload: {
          clickToken: validClickToken,
          nonce: '00000000-0000-4000-8000-000000000020',
          clickedAt: new Date().toISOString(),
          interactionMetrics: {
            touchX: 120,
            touchY: 25,
            durationBeforeClickMs: 3400,
          },
        },
      });

      expect(response.statusCode).toBe(204);
    });

    it('deve redirecionar GET /click/track com HTTP 302 para actionUrl', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/click/track?t=${encodeURIComponent(validClickToken)}`,
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toBe('https://google.com');
    });

    it('deve retornar 400 em /click/track se o token estiver ausente', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/click/track',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /metrics', () => {
    it('deve retornar métricas operacionais consolidadas', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/metrics',
      });

      expect(response.statusCode).toBe(200);
      const metrics = response.json();
      expect(metrics.service).toBe('mgp-adserver');
      expect(metrics.adRequests).toBeDefined();
      expect(metrics.adRequests.total).toBeGreaterThanOrEqual(1);
      expect(metrics.adRequests.fills).toBeGreaterThanOrEqual(1);
      expect(metrics.events).toBeDefined();
    });
  });
});
