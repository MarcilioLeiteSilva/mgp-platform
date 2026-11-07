import { z } from 'zod';
import { AdFormat, CampaignBillingModel, CampaignStatus, CampaignType } from '@mgp/shared';

export const CreateCampaignSchema = z.object({
  name: z.string().min(3).max(100),
  type: z.nativeEnum(CampaignType).default(CampaignType.PAID),
  billingModel: z.nativeEnum(CampaignBillingModel).default(CampaignBillingModel.CPM),
  bidAmount: z.number().positive(),
  dailyBudget: z.number().positive(),
  totalBudget: z.number().positive(),
  frequencyCapPerHour: z.number().int().min(1).max(100).default(3),
  priorityTier: z.number().int().min(1).max(5).default(2),
  targetCountry: z.string().length(2).default('BR'),
  targetCategories: z.string().optional().default('ALL'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export type CreateCampaignDto = z.infer<typeof CreateCampaignSchema>;

export const UpdateCampaignSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  bidAmount: z.number().positive().optional(),
  dailyBudget: z.number().positive().optional(),
  totalBudget: z.number().positive().optional(),
  frequencyCapPerHour: z.number().int().min(1).max(100).optional(),
  priorityTier: z.number().int().min(1).max(5).optional(),
  targetCountry: z.string().length(2).optional(),
  targetCategories: z.string().optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});

export type UpdateCampaignDto = z.infer<typeof UpdateCampaignSchema>;

export const UpdateCampaignStatusSchema = z.object({
  status: z.nativeEnum(CampaignStatus),
  reason: z.string().optional(),
});

export type UpdateCampaignStatusDto = z.infer<typeof UpdateCampaignStatusSchema>;

export const CreateCreativeSchema = z.object({
  format: z.nativeEnum(AdFormat),
  title: z.string().min(2).max(100),
  description: z.string().max(300).optional(),
  imageUrl: z.string().url(),
  actionUrl: z.string().url(),
  width: z.number().int().positive().default(320),
  height: z.number().int().positive().default(50),
  iconUrl: z.string().url().optional(),
  ctaText: z.string().max(30).optional().default('Instalar'),
  starRating: z.number().min(0).max(5).optional(),
  sponsorText: z.string().max(50).optional(),
  skipOffsetSeconds: z.number().int().min(0).max(30).optional().default(5),
  rewardType: z.string().max(50).optional(),
  rewardAmount: z.number().int().positive().optional(),
  requiredWatchSeconds: z.number().int().min(5).max(60).optional().default(15),
  htmlContent: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type CreateCreativeDto = z.infer<typeof CreateCreativeSchema>;

export const UpdateCreativeSchema = z.object({
  title: z.string().min(2).max(100).optional(),
  description: z.string().max(300).optional().nullable(),
  imageUrl: z.string().url().optional(),
  actionUrl: z.string().url().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  iconUrl: z.string().url().optional().nullable(),
  ctaText: z.string().max(30).optional(),
  starRating: z.number().min(0).max(5).optional().nullable(),
  sponsorText: z.string().max(50).optional().nullable(),
  skipOffsetSeconds: z.number().int().min(0).max(30).optional(),
  rewardType: z.string().max(50).optional().nullable(),
  rewardAmount: z.number().int().positive().optional().nullable(),
  requiredWatchSeconds: z.number().int().min(5).max(60).optional(),
  htmlContent: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateCreativeDto = z.infer<typeof UpdateCreativeSchema>;

export const ListCampaignsQuerySchema = z.object({
  status: z.nativeEnum(CampaignStatus).optional(),
  type: z.nativeEnum(CampaignType).optional(),
  targetCountry: z.string().length(2).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

export type ListCampaignsQueryDto = z.infer<typeof ListCampaignsQuerySchema>;

