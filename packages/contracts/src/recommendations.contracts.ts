import { z } from 'zod';
import {
  BiddingStrategy,
  PacingMode,
  RecommendationType,
  RecommendationStatus,
  RecommendationPriority,
} from '@mgp/shared';

export const BiddingStrategyEnum = z.nativeEnum(BiddingStrategy);
export const PacingModeEnum = z.nativeEnum(PacingMode);
export const RecommendationTypeEnum = z.nativeEnum(RecommendationType);
export const RecommendationStatusEnum = z.nativeEnum(RecommendationStatus);
export const RecommendationPriorityEnum = z.nativeEnum(RecommendationPriority);

export const UpdateBiddingStrategySchema = z.object({
  biddingStrategy: BiddingStrategyEnum.optional(),
  pacingMode: PacingModeEnum.optional(),
  targetCpa: z.number().positive('Target CPA deve ser positivo').optional().nullable(),
  autoOptimize: z.boolean().optional(),
});

export type UpdateBiddingStrategyInput = z.infer<typeof UpdateBiddingStrategySchema>;

export const ListRecommendationsQuerySchema = z.object({
  campaignId: z.string().uuid().optional(),
  status: RecommendationStatusEnum.optional(),
  priority: RecommendationPriorityEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListRecommendationsQueryInput = z.infer<typeof ListRecommendationsQuerySchema>;

export const ApplyRecommendationSchema = z.object({
  overrideParams: z.record(z.any()).optional(),
});

export type ApplyRecommendationInput = z.infer<typeof ApplyRecommendationSchema>;

export const DismissRecommendationSchema = z.object({
  reason: z.string().max(255).optional(),
});

export type DismissRecommendationInput = z.infer<typeof DismissRecommendationSchema>;

export const SimulateBidOptimizationSchema = z.object({
  targetMetric: z.enum(['IMPRESSIONS', 'CLICKS', 'CONVERSIONS']).default('IMPRESSIONS'),
  budget: z.number().positive().optional(),
  currentBid: z.number().positive().optional(),
  category: z.string().optional(),
});

export type SimulateBidOptimizationInput = z.infer<typeof SimulateBidOptimizationSchema>;
