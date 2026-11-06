import { FastifyPluginAsync } from 'fastify';
import { CacheService } from '../services/cache.service';

export const healthRoutes: FastifyPluginAsync<{ cache: CacheService }> = async (
  fastify,
  opts,
) => {
  fastify.get('/health', async (_req, reply) => {
    const redisHealthy = await opts.cache.ping();
    const memory = process.memoryUsage();

    return reply.status(200).send({
      status: 'healthy',
      service: 'mgp-adserver',
      version: '0.1.0',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      dependencies: {
        redis: redisHealthy ? 'connected' : 'degraded_in_memory',
      },
      memory: {
        rssMb: Math.round(memory.rss / (1024 * 1024)),
        heapUsedMb: Math.round(memory.heapUsed / (1024 * 1024)),
      },
    });
  });
};
