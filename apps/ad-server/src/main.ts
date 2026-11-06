import { buildApp } from './app';
import { loadAdServerConfig } from './config/ad-server.config';
import { CacheService } from './services/cache.service';
import { TokenService } from './services/token.service';
import { EventQueueService } from './services/event-queue.service';
import { AdDecisionService } from './services/ad-decision.service';
import { PrismaClient } from '@mgp/database';

async function bootstrap() {
  const config = loadAdServerConfig();

  const prisma = new PrismaClient({
    log: config.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
  const cache = new CacheService(config.REDIS_URL);
  const tokenService = new TokenService(config.HMAC_SECRET);
  const eventQueue = new EventQueueService(config.REDIS_URL);

  const adDecisionService = new AdDecisionService({
    prisma,
    cache,
    tokenService,
    tokenTtlSeconds: config.TOKEN_TTL_SECONDS,
  });

  const app = buildApp({
    config,
    prisma,
    cache,
    tokenService,
    eventQueue,
    adDecisionService,
  });

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    console.info(`================================================================`);
    console.info(`  MGP AD SERVER (Fastify High-Performance) ONLINE`);
    console.info(`  Porta:    ${config.PORT}`);
    console.info(`  Host:     ${config.HOST}`);
    console.info(`  Ambiente: ${config.NODE_ENV}`);
    console.info(`================================================================`);
  } catch (err: any) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    console.info(`\n[Shutdown] Recebido sinal ${signal}. Finalizando conexões do Ad Server...`);
    try {
      await app.close();
      await eventQueue.close();
      await cache.close();
      await prisma.$disconnect();
      console.info('[Shutdown] Ad Server encerrado com sucesso.');
      process.exit(0);
    } catch (err: any) {
      console.error('[Shutdown] Erro ao encerrar conexões:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
