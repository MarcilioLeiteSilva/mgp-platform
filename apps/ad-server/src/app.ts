import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { PrismaClient } from '@mgp/database';
import { AdServerConfig, loadAdServerConfig } from './config/ad-server.config';
import { CacheService } from './services/cache.service';
import { TokenService } from './services/token.service';
import { EventQueueService } from './services/event-queue.service';
import { AdDecisionService } from './services/ad-decision.service';
import { healthRoutes } from './routes/health.route';
import { adsRoutes } from './routes/ads.route';
import { eventsRoutes } from './routes/events.route';
import { metricsRoutes, MetricsState } from './routes/metrics.route';

export interface AppDeps {
  config?: AdServerConfig;
  prisma?: PrismaClient;
  cache?: CacheService;
  tokenService?: TokenService;
  eventQueue?: EventQueueService;
  adDecisionService?: AdDecisionService;
}

export function buildApp(deps: AppDeps = {}): FastifyInstance {
  const config = deps.config || loadAdServerConfig();

  const app = fastify({
    logger:
      config.NODE_ENV === 'test'
        ? false
        : {
            level: config.NODE_ENV === 'production' ? 'info' : 'debug',
            serializers: {
              req(req) {
                return {
                  method: req.method,
                  url: req.url,
                  ip: req.ip,
                };
              },
            },
          },
    disableRequestLogging: config.NODE_ENV === 'test',
  });

  // 1. Plugins de Segurança e Alta Performance
  app.register(cors, {
    origin: config.CORS_ORIGIN === '*' ? true : config.CORS_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  if (config.NODE_ENV !== 'test') {
    app.register(rateLimit, {
      max: config.RATE_LIMIT_MAX,
      timeWindow: config.RATE_LIMIT_WINDOW_MS,
      errorResponseBuilder: () => ({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Limite de requisições excedido. Tente novamente mais tarde.',
        },
      }),
    });
  }

  // 2. Instanciação de Serviços (ou injeção via deps)
  const cache = deps.cache || new CacheService(config.REDIS_URL);
  const tokenService =
    deps.tokenService || new TokenService(config.HMAC_SECRET);
  const eventQueue =
    deps.eventQueue || new EventQueueService(config.REDIS_URL);
  const prisma = deps.prisma || new PrismaClient();

  const adDecisionService =
    deps.adDecisionService ||
    new AdDecisionService({
      prisma,
      cache,
      tokenService,
      tokenTtlSeconds: config.TOKEN_TTL_SECONDS,
    });

  // 3. Estado em Memória para Métricas
  const metricsState: MetricsState = {
    adRequestsTotal: 0,
    adFillsTotal: 0,
    adNoFillsTotal: 0,
    startTime: Date.now(),
  };

  // 4. Registro de Rotas
  app.register(healthRoutes, { cache });

  app.register(adsRoutes, {
    adDecisionService,
    onAdDecision: (fill: boolean) => {
      metricsState.adRequestsTotal++;
      if (fill) {
        metricsState.adFillsTotal++;
      } else {
        metricsState.adNoFillsTotal++;
      }
    },
  });

  app.register(eventsRoutes, {
    cache,
    tokenService,
    eventQueue,
  });

  app.register(metricsRoutes, {
    state: metricsState,
    eventQueue,
  });

  // 5. Handler Global de Erros
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode || 500;
    return reply.status(statusCode).send({
      success: false,
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Falha interna no Ad Server',
      },
    });
  });

  return app;
}
