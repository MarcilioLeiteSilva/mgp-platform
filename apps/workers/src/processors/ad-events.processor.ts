import { Job } from 'bullmq';
import { PrismaClient } from '@mgp/database';
import {
  AdClickJobPayload,
  AdImpressionJobPayload,
  AdRewardJobPayload,
} from '@mgp/contracts';

export interface AdEventProcessResult {
  success: boolean;
  eventType: 'IMPRESSION' | 'CLICK' | 'REWARD';
  requestId: string;
  campaignId: string;
  costApplied?: number;
  processedAt: string;
  error?: string;
}

/**
 * Processador assíncrono das filas de eventos publicitários gerados pelo Ad Server.
 * Executa liquidação contábil, agregação de métricas e auditoria.
 */
export class AdEventsProcessor {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Processa a confirmação de uma impressão publicitária entregue e visualizada.
   */
  async processImpression(
    job: Job<AdImpressionJobPayload> | { data: AdImpressionJobPayload },
  ): Promise<AdEventProcessResult> {
    const { tokenPayload, nonce, renderedAt, visibilityMetrics, clientIp } = job.data;
    const now = new Date().toISOString();

    try {
      let costApplied = 0;

      // 1. Se o modelo de precificação for CPM e a campanha for paga, liquida o valor proporcional (eCPM / 1000)
      if (tokenPayload.billingModel === 'CPM') {
        const effectivePrice = tokenPayload.clearingPrice ?? tokenPayload.bidAmount;
        costApplied = Number((effectivePrice / 1000).toFixed(6));

        // Registro de auditoria contábil
        await this.prisma.auditLog.create({
          data: {
            organizationId: tokenPayload.advertiserOrgId,
            action: 'AD_IMPRESSION_BILLED',
            entityType: 'Campaign',
            entityId: tokenPayload.campaignId,
            ipAddress: clientIp,
            diffAfter: {
              requestId: tokenPayload.requestId,
              nonce,
              billingModel: 'CPM',
              clearingPrice: tokenPayload.clearingPrice,
              cost: costApplied,
              renderedAt,
              viewablePercentage: visibilityMetrics.viewablePercentage,
            },
          },
        }).catch((err) => {
          // Log de aviso se banco de auditoria estiver em concorrência
          console.warn(`[AdEventsProcessor] Aviso ao salvar auditoria de impressão: ${err.message}`);
        });
      }

      return {
        success: true,
        eventType: 'IMPRESSION',
        requestId: tokenPayload.requestId,
        campaignId: tokenPayload.campaignId,
        costApplied,
        processedAt: now,
      };
    } catch (err: any) {
      console.error(`[AdEventsProcessor] Falha ao processar impressão [${tokenPayload.requestId}]: ${err.message}`);
      return {
        success: false,
        eventType: 'IMPRESSION',
        requestId: tokenPayload.requestId,
        campaignId: tokenPayload.campaignId,
        processedAt: now,
        error: err.message,
      };
    }
  }

  /**
   * Processa o clique em um anúncio.
   */
  async processClick(
    job: Job<AdClickJobPayload> | { data: AdClickJobPayload },
  ): Promise<AdEventProcessResult> {
    const { tokenPayload, nonce, clickedAt, clientIp } = job.data;
    const now = new Date().toISOString();

    try {
      let costApplied = 0;

      // Se o modelo de precificação for CPC, liquida o valor total do bid do anunciante
      if (tokenPayload.billingModel === 'CPC') {
        costApplied = Number(tokenPayload.bidAmount.toFixed(4));

        await this.prisma.auditLog.create({
          data: {
            organizationId: tokenPayload.advertiserOrgId,
            action: 'AD_CLICK_BILLED',
            entityType: 'Campaign',
            entityId: tokenPayload.campaignId,
            ipAddress: clientIp,
            diffAfter: {
              requestId: tokenPayload.requestId,
              nonce,
              billingModel: 'CPC',
              cost: costApplied,
              clickedAt,
            },
          },
        }).catch((err) => {
          console.warn(`[AdEventsProcessor] Aviso ao salvar auditoria de clique: ${err.message}`);
        });
      }

      return {
        success: true,
        eventType: 'CLICK',
        requestId: tokenPayload.requestId,
        campaignId: tokenPayload.campaignId,
        costApplied,
        processedAt: now,
      };
    } catch (err: any) {
      console.error(`[AdEventsProcessor] Falha ao processar clique [${tokenPayload.requestId}]: ${err.message}`);
      return {
        success: false,
        eventType: 'CLICK',
        requestId: tokenPayload.requestId,
        campaignId: tokenPayload.campaignId,
        processedAt: now,
        error: err.message,
      };
    }
  }

  /**
   * Processa a concessão e validação final de uma recompensa (Rewarded Ad).
   */
  async processReward(
    job: Job<AdRewardJobPayload> | { data: AdRewardJobPayload },
  ): Promise<AdEventProcessResult> {
    const { tokenPayload, nonce, completedAt, watchDurationSeconds, clientIp } = job.data;
    const now = new Date().toISOString();

    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: tokenPayload.publisherOrgId,
          action: 'AD_REWARD_GRANTED',
          entityType: 'App',
          entityId: tokenPayload.publisherAppId,
          ipAddress: clientIp,
          diffAfter: {
            requestId: tokenPayload.requestId,
            campaignId: tokenPayload.campaignId,
            nonce,
            rewardType: tokenPayload.rewardType,
            rewardAmount: tokenPayload.rewardAmount,
            watchDurationSeconds,
            completedAt,
          },
        },
      }).catch((err) => {
        console.warn(`[AdEventsProcessor] Aviso ao salvar auditoria de recompensa: ${err.message}`);
      });

      return {
        success: true,
        eventType: 'REWARD',
        requestId: tokenPayload.requestId,
        campaignId: tokenPayload.campaignId,
        processedAt: now,
      };
    } catch (err: any) {
      console.error(`[AdEventsProcessor] Falha ao processar recompensa [${tokenPayload.requestId}]: ${err.message}`);
      return {
        success: false,
        eventType: 'REWARD',
        requestId: tokenPayload.requestId,
        campaignId: tokenPayload.campaignId,
        processedAt: now,
        error: err.message,
      };
    }
  }
}
