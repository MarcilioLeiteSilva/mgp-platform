import { FastifyPluginAsync } from 'fastify';
import {
  ImpressionEventSchema,
  ClickEventSchema,
  AdImpressionJobPayload,
  AdClickJobPayload,
} from '@mgp/contracts';
import { CacheService } from '../services/cache.service';
import { TokenService } from '../services/token.service';
import { EventQueueService } from '../services/event-queue.service';

export interface EventsRouteOptions {
  cache: CacheService;
  tokenService: TokenService;
  eventQueue: EventQueueService;
}

export const eventsRoutes: FastifyPluginAsync<EventsRouteOptions> = async (
  fastify,
  opts,
) => {
  /**
   * POST /events/impression
   * Ingestão de telemetria de impressão renderizada com latência < 20ms e resposta 204 No Content.
   */
  fastify.post('/events/impression', async (request, reply) => {
    const parseResult = ImpressionEventSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_EVENT_PAYLOAD',
          message: 'Payload de impressão malformado',
          details: parseResult.error.errors,
        },
      });
    }

    const { impressionToken, nonce, renderedAt, visibilityMetrics } = parseResult.data;

    // 1. Verificação Criptográfica do Token de Impressão
    const tokenPayload = opts.tokenService.verifyTrackingToken(impressionToken);
    if (!tokenPayload) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_OR_EXPIRED_TOKEN',
          message: 'Token de impressão inválido, violado ou expirado',
        },
      });
    }

    // 2. Proteção Anti-Replay via Nonce atômico
    const isNonceFresh = await opts.cache.checkAndRecordNonce(nonce, 600);
    if (!isNonceFresh) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'NONCE_ALREADY_USED',
          message: 'Evento duplicado detectado (Replay Attack mitigado)',
        },
      });
    }

    const clientIp =
      (request.headers['x-forwarded-for'] as string) ||
      request.ip ||
      '127.0.0.1';

    // 3. Despacho Assíncrono para a Fila de Processamento
    const jobPayload: AdImpressionJobPayload = {
      tokenPayload,
      nonce,
      renderedAt,
      visibilityMetrics,
      clientIp,
      receivedAt: new Date().toISOString(),
    };

    // Não bloqueia a resposta se a fila sofrer degradação temporária
    opts.eventQueue.enqueueImpression(jobPayload).catch(() => {});

    return reply.status(204).send();
  });

  /**
   * POST /events/click
   * Ingestão direta de telemetria de clique para SDKs móveis nativos.
   */
  fastify.post('/events/click', async (request, reply) => {
    const parseResult = ClickEventSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_EVENT_PAYLOAD',
          message: 'Payload de clique malformado',
          details: parseResult.error.errors,
        },
      });
    }

    const { clickToken, nonce, clickedAt, interactionMetrics } = parseResult.data;

    // 1. Verificação Criptográfica do Token de Clique
    const tokenPayload = opts.tokenService.verifyTrackingToken(clickToken);
    if (!tokenPayload) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_OR_EXPIRED_TOKEN',
          message: 'Token de clique inválido, violado ou expirado',
        },
      });
    }

    // 2. Proteção Anti-Replay via Nonce
    const isNonceFresh = await opts.cache.checkAndRecordNonce(nonce, 600);
    if (!isNonceFresh) {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'NONCE_ALREADY_USED',
          message: 'Clique duplicado detectado (Replay Attack mitigado)',
        },
      });
    }

    const clientIp =
      (request.headers['x-forwarded-for'] as string) ||
      request.ip ||
      '127.0.0.1';

    const jobPayload: AdClickJobPayload = {
      tokenPayload,
      nonce,
      clickedAt,
      interactionMetrics,
      clientIp,
      receivedAt: new Date().toISOString(),
    };

    opts.eventQueue.enqueueClick(jobPayload).catch(() => {});

    return reply.status(204).send();
  });

  /**
   * GET /click/track
   * Redirecionador de clique com rastreamento intermediário e redirecionamento HTTP 302.
   */
  fastify.get<{ Querystring: { t?: string } }>('/click/track', async (request, reply) => {
    const clickToken = request.query.t;
    if (!clickToken) {
      return reply.status(400).send({
        error: 'Token de clique ausente no parâmetro "t"',
      });
    }

    const tokenPayload = opts.tokenService.verifyTrackingToken(clickToken);
    if (!tokenPayload) {
      return reply.status(400).send({
        error: 'Token de clique inválido ou expirado',
      });
    }

    const nonce = `click_redir_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const clientIp =
      (request.headers['x-forwarded-for'] as string) ||
      request.ip ||
      '127.0.0.1';

    const jobPayload: AdClickJobPayload = {
      tokenPayload,
      nonce,
      clickedAt: new Date().toISOString(),
      clientIp,
      receivedAt: new Date().toISOString(),
    };

    opts.eventQueue.enqueueClick(jobPayload).catch(() => {});

    // Redireciona o usuário para o destino final da campanha (actionUrl)
    return reply.redirect(tokenPayload.actionUrl, 302);
  });
};
