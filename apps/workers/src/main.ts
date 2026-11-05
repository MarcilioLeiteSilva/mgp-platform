import IORedis from 'ioredis';
import {
  getPrismaClient,
  getRedisConnectionOptions,
  getRedisUrl,
  WORKER_CONFIG,
} from './config/worker.config';
import { WorkerScraperService } from './services/worker-scraper.service';
import { WorkerAuditService } from './services/worker-audit.service';
import { AsoSyncProcessor } from './processors/aso-sync.processor';
import {
  createAsoSyncQueue,
  createAsoSyncWorker,
} from './queue/aso-sync.worker';
import { AsoCronScheduler } from './scheduler/aso-cron.scheduler';

async function bootstrap() {
  console.info('================================================================');
  console.info('  MOBILE GROWTH PLATFORM — BACKGROUND WORKERS (BullMQ)');
  console.info('================================================================');

  const redisUrl = getRedisUrl();
  console.info(`[Bootstrap] Conectando ao Redis em: ${redisUrl.replace(/:[^:@]*@/, ':****@')}`);

  const redisConnection = new IORedis(redisUrl, getRedisConnectionOptions());
  const prisma = getPrismaClient();

  // Instancia serviços internos do worker
  const scraperService = new WorkerScraperService();
  const auditService = new WorkerAuditService();

  // Cria fila e worker BullMQ
  const asoQueue = createAsoSyncQueue(redisConnection);
  const asoProcessor = new AsoSyncProcessor(
    prisma,
    scraperService,
    auditService,
    asoQueue,
  );
  const asoWorker = createAsoSyncWorker(redisConnection, asoProcessor);

  // Agenda cron jobs caso habilitado
  if (WORKER_CONFIG.ENABLE_CRON) {
    const scheduler = new AsoCronScheduler(asoQueue);
    try {
      await scheduler.registerSchedules();
    } catch (err: any) {
      console.warn(`[Bootstrap] Alerta ao registrar cron jobs (Redis offline ou restrito): ${err.message}`);
    }
  }

  console.info(`[Bootstrap] Worker ASO ativo e ouvindo na fila "queue-aso-sync". Concorrência: ${WORKER_CONFIG.CONCURRENCY}`);

  // Tratamento de encerramento gracioso (Graceful Shutdown)
  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.info(`\n[Shutdown] Recebido sinal ${signal}. Encerrando workers graciosamente...`);

    try {
      await asoWorker.close();
      await asoQueue.close();
      await redisConnection.quit();
      await prisma.$disconnect();
      console.info('[Shutdown] Conexões finalizadas com sucesso.');
      process.exit(0);
    } catch (err: any) {
      console.error(`[Shutdown] Erro ao encerrar conexões: ${err.message}`);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('[Bootstrap] Falha crítica de inicialização dos workers:', err);
  process.exit(1);
});
