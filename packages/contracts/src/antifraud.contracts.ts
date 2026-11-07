import { z } from 'zod';
import { IvtCategory, FraudSeverity, FraudIncidentStatus } from '@mgp/shared';

export const IvtCategoryEnum = z.nativeEnum(IvtCategory);
export const FraudSeverityEnum = z.nativeEnum(FraudSeverity);
export const FraudIncidentStatusEnum = z.nativeEnum(FraudIncidentStatus);

export const ListFraudIncidentsQuerySchema = z.object({
  appId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  category: IvtCategoryEnum.optional(),
  severity: FraudSeverityEnum.optional(),
  status: FraudIncidentStatusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListFraudIncidentsQueryInput = z.infer<typeof ListFraudIncidentsQuerySchema>;

export const ResolveFraudIncidentSchema = z.object({
  status: z.enum(['CONFIRMED', 'DISMISSED', 'RESOLVED']),
  actionTaken: z.string().min(3, 'Ação tomada deve ter pelo menos 3 caracteres').max(255),
  executeChargeback: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

export type ResolveFraudIncidentInput = z.infer<typeof ResolveFraudIncidentSchema>;

export const SimulateIvtInspectionSchema = z.object({
  appId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional(),
  clickDeltaMs: z.number().int().min(0).optional(),
  clicksPerMinute: z.number().int().min(0).optional(),
  isEmulator: z.boolean().optional(),
  isRooted: z.boolean().optional(),
  sourceIp: z.string().optional(),
  userAgent: z.string().optional(),
  hasViewToken: z.boolean().default(true),
});

export type SimulateIvtInspectionInput = z.infer<typeof SimulateIvtInspectionSchema>;

export const FraudMetricsQuerySchema = z.object({
  period: z.enum(['24h', '7d', '30d']).default('7d'),
  appId: z.string().uuid().optional(),
});

export type FraudMetricsQueryInput = z.infer<typeof FraudMetricsQuerySchema>;

