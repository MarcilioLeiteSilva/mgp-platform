import { FastifyPluginAsync } from 'fastify';
import { AdRequestSchema } from '@mgp/contracts';
import { AdDecisionService } from '../services/ad-decision.service';

export interface AdsRouteOptions {
  adDecisionService: AdDecisionService;
  onAdDecision?: (fill: boolean) => void;
}

export const adsRoutes: FastifyPluginAsync<AdsRouteOptions> = async (
  fastify,
  opts,
) => {
  fastify.post('/ads/request', async (request, reply) => {
    // 1. Validação de Schemas via Zod
    const parseResult = AdRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Payload de solicitação de anúncio inválido',
          details: parseResult.error.errors,
        },
      });
    }

    // 2. Extração de credenciais nos cabeçalhos
    const sdkKey =
      (request.headers['x-mgp-sdk-key'] as string) ||
      (request.headers['x-sdk-key'] as string) ||
      undefined;

    const appId =
      (request.headers['x-mgp-app-id'] as string) ||
      (request.headers['x-app-id'] as string) ||
      undefined;

    const clientIp =
      (request.headers['x-forwarded-for'] as string) ||
      request.ip ||
      '127.0.0.1';

    // 3. Processamento em alta velocidade pelo serviço de decisão
    const decision = await opts.adDecisionService.decideAd(parseResult.data, {
      sdkKey,
      appId,
      clientIp,
    });

    if (opts.onAdDecision) {
      opts.onAdDecision(decision.fill);
    }

    return reply.status(200).send(decision);
  });
};

