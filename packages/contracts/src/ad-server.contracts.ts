import { z } from 'zod';
import { AdFormat, CampaignType } from '@mgp/shared';

export const AdRequestSchema = z.object({
  adUnitId: z.string().min(1),
  format: z.nativeEnum(AdFormat),
  placement: z.string().optional(),
  device: z.object({
    platform: z.enum(['ANDROID', 'IOS']),
    osVersion: z.string().optional(),
    deviceModel: z.string().optional(),
    language: z.string().default('pt-BR'),
    country: z.string().default('BR'),
    advertisingId: z.string().optional(),
    isLimitAdTracking: z.boolean().default(false),
  }),
  sdkVersion: z.string().default('1.0.0'),
});

export type AdRequestDto = z.infer<typeof AdRequestSchema>;

export const AdPricingSchema = z.object({
  model: z.enum(['CPM', 'CPC', 'CPI']),
  bidAmount: z.number().positive(),
  clearingPrice: z.number().positive(),
});

export type AdPricingDto = z.infer<typeof AdPricingSchema>;

export const AdResponseSchema = z.discriminatedUnion('fill', [
  z.object({
    requestId: z.string(),
    fill: z.literal(true),
    campaignId: z.string(),
    campaignType: z.nativeEnum(CampaignType),
    pricing: AdPricingSchema.optional(),
    creative: z.object({
      id: z.string(),
      type: z.nativeEnum(AdFormat),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      title: z.string(),
      description: z.string().optional(),
      imageUrl: z.string().url(),
      actionUrl: z.string().url(),
      // Metadados específicos do formato NATIVE
      iconUrl: z.string().url().optional(),
      ctaText: z.string().optional(),
      starRating: z.number().min(0).max(5).optional(),
      sponsorText: z.string().optional(),
      // Metadados específicos do formato INTERSTITIAL
      skipOffsetSeconds: z.number().int().min(0).optional(),
      htmlContent: z.string().optional(),
      // Metadados específicos do formato REWARDED
      rewardType: z.string().optional(),
      rewardAmount: z.number().int().positive().optional(),
      requiredWatchSeconds: z.number().int().min(0).optional(),
    }),
    tracking: z.object({
      impressionToken: z.string(),
      clickToken: z.string(),
      rewardToken: z.string().optional(),
      expiresAt: z.string(),
    }),
  }),
  z.object({
    requestId: z.string(),
    fill: z.literal(false),
    reason: z.string().optional(),
  }),
]);

export type AdResponseDto = z.infer<typeof AdResponseSchema>;

export const ImpressionEventSchema = z.object({
  impressionToken: z.string().min(1),
  nonce: z.string().uuid(),
  renderedAt: z.string().datetime(),
  visibilityMetrics: z.object({
    viewablePercentage: z.number().min(0).max(100),
    durationMs: z.number().min(0),
  }),
});

export type ImpressionEventDto = z.infer<typeof ImpressionEventSchema>;

export const ClickEventSchema = z.object({
  clickToken: z.string().min(1),
  nonce: z.string().uuid(),
  clickedAt: z.string().datetime(),
  interactionMetrics: z.object({
    touchX: z.number().optional(),
    touchY: z.number().optional(),
    durationBeforeClickMs: z.number().optional(),
  }).optional(),
});

export type ClickEventDto = z.infer<typeof ClickEventSchema>;

export const RewardEventSchema = z.object({
  rewardToken: z.string().min(1),
  nonce: z.string().uuid(),
  completedAt: z.string().datetime(),
  watchDurationSeconds: z.number().min(0),
});

export type RewardEventDto = z.infer<typeof RewardEventSchema>;

/**
 * Payload estruturado embarcado dentro dos tokens criptográficos de rastreamento
 * (ImpressionToken, ClickToken e RewardToken) gerados pelo Ad Server.
 */
export interface AdTrackingTokenPayload {
  requestId: string;
  adUnitId: string;
  campaignId: string;
  creativeId: string;
  publisherAppId: string;
  publisherOrgId: string;
  advertiserOrgId: string;
  bidAmount: number;
  clearingPrice?: number;
  billingModel: string;
  format: string;
  actionUrl: string;
  rewardType?: string;
  rewardAmount?: number;
  requiredWatchSeconds?: number;
  issuedAt: number;
  expiresAt: number;
}

/**
 * Nomes oficiais das filas BullMQ do subsistema de anúncios
 */
export const AD_SERVER_QUEUES = {
  IMPRESSIONS: 'queue-ad-impressions',
  CLICKS: 'queue-ad-clicks',
  REWARDS: 'queue-ad-rewards',
} as const;

export interface AdImpressionJobPayload {
  tokenPayload: AdTrackingTokenPayload;
  nonce: string;
  renderedAt: string;
  visibilityMetrics: {
    viewablePercentage: number;
    durationMs: number;
  };
  clientIp: string;
  receivedAt: string;
}

export interface AdClickJobPayload {
  tokenPayload: AdTrackingTokenPayload;
  nonce: string;
  clickedAt: string;
  interactionMetrics?: {
    touchX?: number;
    touchY?: number;
    durationBeforeClickMs?: number;
  };
  clientIp: string;
  receivedAt: string;
}

export interface AdRewardJobPayload {
  tokenPayload: AdTrackingTokenPayload;
  nonce: string;
  completedAt: string;
  watchDurationSeconds: number;
  clientIp: string;
  receivedAt: string;
}
