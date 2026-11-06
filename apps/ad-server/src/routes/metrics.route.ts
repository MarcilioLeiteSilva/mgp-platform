import { FastifyPluginAsync } from 'fastify';
import { EventQueueService } from '../services/event-queue.service';

export interface MetricsState {
  adRequestsTotal: number;
  adFillsTotal: number;
  adNoFillsTotal: number;
  startTime: number;
}

export const metricsRoutes: FastifyPluginAsync<{
  state: MetricsState;
  eventQueue: EventQueueService;
}> = async (fastify, opts) => {
  fastify.get('/metrics', async (_req, reply) => {
    const queueMetrics = opts.eventQueue.getMetrics();
    const uptimeSeconds = Math.floor((Date.now() - opts.state.startTime) / 1000);
    const totalRequests = opts.state.adRequestsTotal;
    const fillRate =
      totalRequests > 0
        ? Number(((opts.state.adFillsTotal / totalRequests) * 100).toFixed(2))
        : 0;

    return reply.status(200).send({
      service: 'mgp-adserver',
      uptimeSeconds,
      adRequests: {
        total: totalRequests,
        fills: opts.state.adFillsTotal,
        noFills: opts.state.adNoFillsTotal,
        fillRatePercentage: fillRate,
      },
      events: queueMetrics,
      timestamp: new Date().toISOString(),
    });
  });
};

