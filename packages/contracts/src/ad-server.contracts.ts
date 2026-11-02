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

export const AdResponseSchema = z.discriminatedUnion('fill', [
  z.object({
    requestId: z.string(),
    fill: z.literal(true),
    campaignId: z.string(),
    campaignType: z.nativeEnum(CampaignType),
    creative: z.object({
      id: z.string(),
      type: z.nativeEnum(AdFormat),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      title: z.string(),
      description: z.string().optional(),
      imageUrl: z.string().url(),
      actionUrl: z.string().url(),
    }),
    tracking: z.object({
      impressionToken: z.string(),
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

